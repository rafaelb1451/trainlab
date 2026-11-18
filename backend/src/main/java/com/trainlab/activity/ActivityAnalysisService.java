package com.trainlab.activity;

import com.trainlab.activity.ActivitySampleNormalizer.ActivityPoint;
import com.trainlab.athlete.Athlete;
import com.trainlab.athlete.AthleteRepository;
import com.trainlab.athlete.AthleteZone;
import com.trainlab.athlete.SportThreshold;
import com.trainlab.athlete.SportThresholdRepository;
import com.trainlab.athlete.ZoneSet;
import com.trainlab.athlete.ZoneSetRepository;
import com.trainlab.plan.PlannedWorkout;
import com.trainlab.plan.PlannedWorkoutRepository;
import com.trainlab.workout.StepRole;
import com.trainlab.workout.Target;
import com.trainlab.workout.Workout;
import com.trainlab.workout.WorkoutBlock;
import com.trainlab.workout.WorkoutRepository;
import com.trainlab.workout.WorkoutStep;
import com.trainlab.workout.ZoneType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Monta o payload de {@code GET /api/activities/{id}/analysis} (SPEC 12.2): série downsampled
 * (&le; 400 pontos), zonas de FC/pace/potência, laps, splits por km, planejado resumido e
 * comparação realizado × planejado.
 */
@Service
public class ActivityAnalysisService {

    private static final int MAX_SERIES_POINTS = 400;
    private static final int MIN_PARTIAL_SPLIT_M = 100;

    private final ActivitySampleRepository sampleRepository;
    private final ActivityLapRepository lapRepository;
    private final ZoneSetRepository zoneSetRepository;
    private final PlannedWorkoutRepository plannedWorkoutRepository;
    private final WorkoutRepository workoutRepository;
    private final AthleteRepository athleteRepository;
    private final SportThresholdRepository thresholdRepository;
    private final ActivityMetricsCalculator metricsCalculator;
    private final ActivityMapper mapper;

    public ActivityAnalysisService(ActivitySampleRepository sampleRepository,
                                   ActivityLapRepository lapRepository,
                                   ZoneSetRepository zoneSetRepository,
                                   PlannedWorkoutRepository plannedWorkoutRepository,
                                   WorkoutRepository workoutRepository,
                                   AthleteRepository athleteRepository,
                                   SportThresholdRepository thresholdRepository,
                                   ActivityMetricsCalculator metricsCalculator,
                                   ActivityMapper mapper) {
        this.sampleRepository = sampleRepository;
        this.lapRepository = lapRepository;
        this.zoneSetRepository = zoneSetRepository;
        this.plannedWorkoutRepository = plannedWorkoutRepository;
        this.workoutRepository = workoutRepository;
        this.athleteRepository = athleteRepository;
        this.thresholdRepository = thresholdRepository;
        this.metricsCalculator = metricsCalculator;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public ActivityDtos.AnalysisResponse analyze(Activity activity, String athleteName) {
        List<ActivitySample> rows = sampleRepository
                .findByActivityIdOrderByOffsetSecAsc(activity.getId());
        List<ActivityLap> lapRows = lapRepository
                .findByActivityIdOrderByLapIndexAsc(activity.getId());
        List<ActivityPoint> points = rows.stream()
                .map(row -> new ActivityPoint(row.getOffsetSec() == null ? 0 : row.getOffsetSec(),
                        row.getDistanceM() == null ? 0.0 : row.getDistanceM(), row.getHr(),
                        row.getSpeedMps(), row.getPower(), row.getCadence(), row.getElevationM(),
                        row.getLat(), row.getLon()))
                .toList();

        List<ActivityDtos.SeriesPoint> series = buildSeries(points);
        List<ActivityDtos.ZonePoint> zones = buildZones(activity, points);
        List<ActivityDtos.LapAnalysis> laps = lapRows.stream()
                .map(lap -> new ActivityDtos.LapAnalysis(value(lap.getLapIndex()),
                        value(lap.getDurationSec()),
                        lap.getDistanceM() == null ? null : (int) Math.round(lap.getDistanceM()),
                        lap.getAvgHr(), lap.getAvgPower(), lap.getPaceSecPerKm()))
                .toList();
        List<ActivityDtos.SplitPoint> splits = buildSplits(points);
        Workout plannedWorkout = plannedWorkout(activity);
        ActivityDtos.PlannedInfo planned = plannedInfo(plannedWorkout);
        ActivityMetrics recalculated = recalculate(activity, rows);
        ActivityDtos.Comparison comparison = comparison(activity, plannedWorkout, recalculated);
        return new ActivityDtos.AnalysisResponse(
                mapper.toSummary(activity, athleteName, recalculated), series, zones, laps, splits,
                planned, comparison);
    }

    /**
     * Série temporal com no máximo 400 pontos. Mantém primeiro e último ponto e distribui o
     * restante uniformemente; o pace instantâneo é derivado da velocidade (ou da distância).
     */
    private List<ActivityDtos.SeriesPoint> buildSeries(List<ActivityPoint> points) {
        if (points.isEmpty()) {
            return List.of();
        }
        long baseOffset = points.get(0).offsetSec();
        List<ActivityDtos.SeriesPoint> series = new ArrayList<>();
        int count = points.size();
        if (count <= MAX_SERIES_POINTS) {
            for (int i = 0; i < count; i++) {
                series.add(seriesPoint(points, i, baseOffset));
            }
            return series;
        }
        for (int i = 0; i < MAX_SERIES_POINTS; i++) {
            int index = (int) Math.round(i * (count - 1.0) / (MAX_SERIES_POINTS - 1.0));
            series.add(seriesPoint(points, index, baseOffset));
        }
        return series;
    }

    private ActivityDtos.SeriesPoint seriesPoint(List<ActivityPoint> points, int index,
                                                 long baseOffset) {
        ActivityPoint point = points.get(index);
        Integer pace = paceAt(points, index);
        return new ActivityDtos.SeriesPoint(point.offsetSec() - baseOffset, point.hr(), pace,
                point.power(), point.cadence(), point.elevationM(),
                (int) Math.round(point.distanceM()));
    }

    private Integer paceAt(List<ActivityPoint> points, int index) {
        ActivityPoint point = points.get(index);
        if (point.speedMps() != null && point.speedMps() > 0.2) {
            return (int) Math.round(1000.0 / point.speedMps());
        }
        if (index + 1 < points.size()) {
            return paceBetween(points.get(index), points.get(index + 1));
        }
        if (index > 0) {
            return paceBetween(points.get(index - 1), point);
        }
        return null;
    }

    private Integer paceBetween(ActivityPoint from, ActivityPoint to) {
        long delta = to.offsetSec() - from.offsetSec();
        double distance = to.distanceM() - from.distanceM();
        if (delta <= 0 || distance <= 0.5) {
            return null;
        }
        return (int) Math.round(1000.0 * delta / distance);
    }

    /**
     * Tempo em zonas por tipo. Só entram tipos com conjunto de zonas configurado e amostras com
     * a métrica; a porcentagem usa o total do próprio tipo, então as zonas somam 100% e os
     * segundos somam aproximadamente a duração da atividade.
     */
    private List<ActivityDtos.ZonePoint> buildZones(Activity activity, List<ActivityPoint> points) {
        if (points.size() < 2) {
            return List.of();
        }
        Map<ZoneType, List<AthleteZone>> sets = new EnumMap<>(ZoneType.class);
        for (ZoneSet zoneSet : zoneSetRepository.findByAthleteId(activity.getAthleteId())) {
            if (zoneSet.getSport() == activity.getSport()) {
                sets.put(zoneSet.getZoneType(), zoneSet.getZones().stream()
                        .sorted(Comparator.comparingInt(AthleteZone::getZoneNumber)).toList());
            }
        }
        List<ActivityDtos.ZonePoint> result = new ArrayList<>();
        for (ZoneType type : List.of(ZoneType.HR, ZoneType.PACE, ZoneType.POWER)) {
            List<AthleteZone> zones = sets.get(type);
            if (zones == null || zones.isEmpty()) {
                continue;
            }
            Map<Integer, Long> seconds = new java.util.HashMap<>();
            long total = 0;
            for (int i = 0; i < points.size() - 1; i++) {
                Integer value = metricForZone(type, points, i);
                if (value == null) {
                    continue;
                }
                long delta = points.get(i + 1).offsetSec() - points.get(i).offsetSec();
                if (delta <= 0) {
                    continue;
                }
                AthleteZone zone = findZone(zones, value, type);
                if (zone == null) {
                    continue;
                }
                seconds.merge(zone.getZoneNumber(), delta, Long::sum);
                total += delta;
            }
            if (total <= 0) {
                continue;
            }
            for (AthleteZone zone : zones) {
                long zoneSeconds = seconds.getOrDefault(zone.getZoneNumber(), 0L);
                double pct = Math.round(zoneSeconds * 1000.0 / total) / 10.0;
                result.add(new ActivityDtos.ZonePoint(type, zone.getZoneNumber(),
                        (int) Math.min(Integer.MAX_VALUE, zoneSeconds), pct));
            }
        }
        return result;
    }

    private Integer metricForZone(ZoneType type, List<ActivityPoint> points, int index) {
        return switch (type) {
            case HR -> points.get(index).hr();
            case POWER -> points.get(index).power();
            case PACE -> paceAt(points, index);
        };
    }

    /**
     * Encontra a zona do valor. Faixas geradas podem ter pequenos vãos (arredondamento de
     * percentuais); nesse caso escolhe-se a zona mais próxima, garantindo que nenhum intervalo
     * fique sem zona.
     */
    private AthleteZone findZone(List<AthleteZone> zones, int value, ZoneType type) {
        int normalized = value;
        if (type == ZoneType.PACE && zones.get(0).getUnit() != null
                && "s_per_100m".equals(zones.get(0).getUnit())) {
            normalized = (int) Math.round(value / 10.0);
        }
        AthleteZone nearest = null;
        long nearestDistance = Long.MAX_VALUE;
        for (AthleteZone zone : zones) {
            int min = Math.min(zone.getMinValue(), zone.getMaxValue());
            int max = Math.max(zone.getMinValue(), zone.getMaxValue());
            if (normalized >= min && normalized <= max) {
                return zone;
            }
            long distance = normalized < min ? (long) min - normalized : (long) normalized - max;
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = zone;
            }
        }
        return nearest;
    }

    private List<ActivityDtos.SplitPoint> buildSplits(List<ActivityPoint> points) {
        if (points.size() < 2) {
            return List.of();
        }
        double totalDistance = points.get(points.size() - 1).distanceM();
        if (totalDistance <= MIN_PARTIAL_SPLIT_M) {
            return List.of();
        }
        List<Boundary> boundaries = new ArrayList<>();
        double nextKm = 1000.0;
        ActivityPoint previous = points.get(0);
        for (int i = 1; i < points.size(); i++) {
            ActivityPoint current = points.get(i);
            while (current.distanceM() >= nextKm && nextKm <= totalDistance) {
                long crossingTime = interpolateTime(previous, current, nextKm);
                boundaries.add(new Boundary(nextKm, crossingTime));
                nextKm += 1000.0;
            }
            previous = current;
        }
        List<ActivityDtos.SplitPoint> splits = new ArrayList<>();
        double splitStartDist = points.get(0).distanceM();
        long splitStartTime = points.get(0).offsetSec();
        int km = 1;
        for (Boundary boundary : boundaries) {
            splits.add(split(points, km++, splitStartDist, splitStartTime,
                    boundary.distanceM(), boundary.time()));
            splitStartDist = boundary.distanceM();
            splitStartTime = boundary.time();
        }
        double remainder = totalDistance - splitStartDist;
        if (remainder >= MIN_PARTIAL_SPLIT_M) {
            splits.add(split(points, km, splitStartDist, splitStartTime, totalDistance,
                    points.get(points.size() - 1).offsetSec()));
        }
        return splits;
    }

    private long interpolateTime(ActivityPoint from, ActivityPoint to, double targetDistance) {
        double distance = to.distanceM() - from.distanceM();
        if (distance <= 0) {
            return to.offsetSec();
        }
        double fraction = Math.max(0.0, Math.min(1.0, (targetDistance - from.distanceM()) / distance));
        return from.offsetSec() + Math.round(fraction * (to.offsetSec() - from.offsetSec()));
    }

    private ActivityDtos.SplitPoint split(List<ActivityPoint> points, int km, double startDistance,
                                          long startTime, double endDistance, long endTime) {
        int duration = (int) Math.max(0, endTime - startTime);
        double distance = endDistance - startDistance;
        int pace = distance > 0 ? (int) Math.round(duration * 1000.0 / distance) : 0;
        double hrSum = 0;
        int hrCount = 0;
        double elevationGain = 0;
        Double previousElevation = null;
        for (ActivityPoint point : points) {
            if (point.offsetSec() < startTime || point.offsetSec() > endTime) {
                continue;
            }
            if (point.hr() != null) {
                hrSum += point.hr();
                hrCount++;
            }
            if (point.elevationM() != null) {
                if (previousElevation != null && point.elevationM() > previousElevation) {
                    elevationGain += point.elevationM() - previousElevation;
                }
                previousElevation = point.elevationM();
            }
        }
        Integer avgHr = hrCount == 0 ? null : (int) Math.round(hrSum / hrCount);
        return new ActivityDtos.SplitPoint(km, duration, pace, avgHr,
                (int) Math.round(elevationGain));
    }

    /**
     * Recalcula as métricas a partir dos samples persistidos no momento da análise, como pedido
     * no complemento da SPEC 12.2. As calorias já resolvidas da atividade entram como fallback
     * quando o arquivo original tinha o dado; limiares e peso vêm do atleta.
     */
    private ActivityMetrics recalculate(Activity activity, List<ActivitySample> rows) {
        List<ParsedActivity.ParsedSample> samples = rows.stream()
                .map(row -> new ParsedActivity.ParsedSample(
                        row.getOffsetSec() == null ? 0 : row.getOffsetSec(),
                        row.getDistanceM(), row.getHr(), row.getSpeedMps(), row.getPower(),
                        row.getCadence(), row.getElevationM(), row.getLat(), row.getLon()))
                .toList();
        Athlete athlete = athleteRepository.findById(activity.getAthleteId()).orElse(null);
        Double weight = athlete == null ? null : athlete.getWeightKg();
        SportThreshold threshold = thresholdRepository
                .findByAthleteIdAndSport(activity.getAthleteId(), activity.getSport()).orElse(null);
        return metricsCalculator.calculate(activity.getSport(), samples, activity.getCalories(),
                weight, threshold);
    }

    private Workout plannedWorkout(Activity activity) {
        if (activity.getPlannedWorkoutId() == null) {
            return null;
        }
        PlannedWorkout planned = plannedWorkoutRepository.findById(activity.getPlannedWorkoutId())
                .orElse(null);
        if (planned == null) {
            return null;
        }
        return workoutRepository.findById(planned.getWorkoutId()).orElse(null);
    }

    private ActivityDtos.PlannedInfo plannedInfo(Workout workout) {
        if (workout == null) {
            return null;
        }
        List<ActivityDtos.PlannedBlock> blocks = new ArrayList<>();
        if (workout.getBlocks() != null) {
            for (WorkoutBlock block : workout.getBlocks()) {
                List<ActivityDtos.PlannedStep> steps = new ArrayList<>();
                int repeat = block.getRepeatCount() == null ? 1 : Math.max(1, block.getRepeatCount());
                int blockDuration = 0;
                for (WorkoutStep step : block.getSteps()) {
                    if (step.getDurationSec() != null) {
                        blockDuration += step.getDurationSec();
                    }
                    steps.add(new ActivityDtos.PlannedStep(roleName(step.getRole()),
                            step.getDurationType() == null ? null : step.getDurationType().name(),
                            step.getDurationSec(), step.getDistanceM(),
                            targetLabel(step.getTarget())));
                }
                blocks.add(new ActivityDtos.PlannedBlock(block.getTitle(), repeat,
                        blockDuration, steps));
            }
        }
        return new ActivityDtos.PlannedInfo(workout.getName(), blocks, workout.getEstimatedTss(),
                workout.getEstimatedDurationSec());
    }

    private String roleName(StepRole role) {
        return role == null ? null : role.name();
    }

    private String targetLabel(Target target) {
        if (target == null) {
            return null;
        }
        if (target.getDisplay() != null && !target.getDisplay().isBlank()) {
            return target.getDisplay();
        }
        if (target.getZone() != null) {
            return "Z" + target.getZone();
        }
        return target.getType() == null ? null : target.getType().name();
    }

    private ActivityDtos.Comparison comparison(Activity activity, Workout planned,
                                               ActivityMetrics metrics) {
        Integer durationDelta = null;
        Integer distanceDelta = null;
        Integer tssDelta = null;
        String compliance = "NAO_PLANEJADO";
        if (planned != null) {
            Integer plannedDuration = planned.getEstimatedDurationSec();
            if (plannedDuration != null && plannedDuration > 0) {
                durationDelta = metrics.durationSec() - plannedDuration;
            }
            if (planned.getEstimatedDistanceM() != null && planned.getEstimatedDistanceM() > 0) {
                distanceDelta = metrics.distanceM() - planned.getEstimatedDistanceM();
            }
            if (planned.getEstimatedTss() != null && metrics.tss() != null) {
                tssDelta = metrics.tss() - planned.getEstimatedTss();
            }
            compliance = compliance(metrics, planned);
        }
        return new ActivityDtos.Comparison(durationDelta, distanceDelta, tssDelta,
                metrics.intensityFactor(), compliance);
    }

    /**
     * CONFORME quando duração e TSS ficam a ±20% do planejado (ou a distância, quando não há
     * duração estimada). Qualquer desvio maior é PARCIAL; sem vínculo é NAO_PLANEJADO.
     */
    private String compliance(ActivityMetrics metrics, Workout planned) {
        boolean hasDuration = planned.getEstimatedDurationSec() != null
                && planned.getEstimatedDurationSec() > 0;
        boolean hasTss = planned.getEstimatedTss() != null && metrics.tss() != null;
        boolean durationOk = true;
        boolean tssOk = true;
        if (hasDuration) {
            durationOk = withinPercent(metrics.durationSec(), planned.getEstimatedDurationSec(), 0.20);
        } else if (planned.getEstimatedDistanceM() != null
                && planned.getEstimatedDistanceM() > 0) {
            durationOk = withinPercent(metrics.distanceM(), planned.getEstimatedDistanceM(), 0.20);
        }
        if (hasTss) {
            tssOk = withinPercent(metrics.tss(), planned.getEstimatedTss(), 0.20);
        }
        return durationOk && tssOk ? "CONFORME" : "PARCIAL";
    }

    private boolean withinPercent(int actual, int planned, double tolerance) {
        if (planned <= 0) {
            return true;
        }
        double ratio = actual / (double) planned;
        return ratio >= 1.0 - tolerance && ratio <= 1.0 + tolerance;
    }

    private int value(Integer value) {
        return value == null ? 0 : value;
    }

    private record Boundary(double distanceM, long time) {
    }
}
