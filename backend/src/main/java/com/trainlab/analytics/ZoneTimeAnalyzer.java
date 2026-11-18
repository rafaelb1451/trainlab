package com.trainlab.analytics;

import com.trainlab.athlete.AthleteZone;
import com.trainlab.athlete.SportThreshold;
import com.trainlab.athlete.SportThresholdRepository;
import com.trainlab.athlete.ZoneSet;
import com.trainlab.athlete.ZoneSetRepository;
import com.trainlab.plan.PlannedWorkout;
import com.trainlab.workout.Sport;
import com.trainlab.workout.Target;
import com.trainlab.workout.TargetType;
import com.trainlab.workout.Workout;
import com.trainlab.workout.WorkoutBlock;
import com.trainlab.workout.WorkoutStep;
import com.trainlab.workout.ZoneType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Calcula o tempo em zonas a partir da estrutura dos treinos planejados (SPEC 10.1):
 * cada step de tempo soma {@code durationSec × repeat} na zona do alvo. Alvos
 * {@code *_ZONE} usam a zona informada; alvos {@code *_PERCENT} são convertidos em valores
 * absolutos pelos limiares do atleta (LTHR, FTP, pace/CSS) e então encaixados na zona
 * correspondente do conjunto de zonas configurado. Alvos RPE/FREE e steps de DISTANCE/OPEN
 * sem duração não entram no cálculo.
 */
@Component
public class ZoneTimeAnalyzer {

    private final ZoneSetRepository zoneSetRepository;
    private final SportThresholdRepository thresholdRepository;

    public ZoneTimeAnalyzer(ZoneSetRepository zoneSetRepository,
                            SportThresholdRepository thresholdRepository) {
        this.zoneSetRepository = zoneSetRepository;
        this.thresholdRepository = thresholdRepository;
    }

    public List<AnalyticsDtos.ZonePoint> analyze(UUID athleteId, List<PlannedWorkout> planned,
                                                 Map<UUID, Workout> workouts) {
        Map<Sport, Map<ZoneType, ZoneSet>> zoneSets = loadZoneSets(athleteId);
        Map<Sport, SportThreshold> thresholds = loadThresholds(athleteId);

        Map<ZoneKey, Long> seconds = new HashMap<>();
        Map<ZoneKey, Set<UUID>> sessions = new HashMap<>();

        for (PlannedWorkout session : planned) {
            Workout workout = workouts.get(session.getWorkoutId());
            if (workout == null || workout.getBlocks() == null) {
                continue;
            }
            Map<ZoneType, ZoneSet> setsByType =
                    zoneSets.getOrDefault(workout.getSport(), Map.of());
            SportThreshold threshold = thresholds.get(workout.getSport());
            for (WorkoutBlock block : workout.getBlocks()) {
                int repeat = block.getRepeatCount() == null ? 1 : Math.max(1, block.getRepeatCount());
                for (WorkoutStep step : block.getSteps()) {
                    // DISTANCE/OPEN sem duração não entram; qualquer step com duração conta.
                    if (step.getDurationSec() == null || step.getDurationSec() <= 0) {
                        continue;
                    }
                    ZoneType type = zoneTypeOf(step.getTarget());
                    if (type == null) {
                        continue;
                    }
                    Integer zoneNumber = zoneNumber(workout, step.getTarget(), setsByType, threshold);
                    if (zoneNumber == null || zoneNumber < 1) {
                        continue;
                    }
                    ZoneKey key = new ZoneKey(workout.getSport(), type, zoneNumber);
                    long stepSeconds = (long) step.getDurationSec() * repeat;
                    seconds.merge(key, stepSeconds, Long::sum);
                    sessions.computeIfAbsent(key, ignored -> new HashSet<>()).add(session.getId());
                }
            }
        }

        List<AnalyticsDtos.ZonePoint> result = new ArrayList<>();
        for (Map.Entry<ZoneKey, Long> entry : seconds.entrySet()) {
            ZoneKey key = entry.getKey();
            result.add(new AnalyticsDtos.ZonePoint(key.sport(), key.type(), key.zoneNumber(),
                    (int) Math.min(Integer.MAX_VALUE, entry.getValue()),
                    sessions.getOrDefault(key, Set.of()).size()));
        }
        result.sort(Comparator
                .comparingInt((AnalyticsDtos.ZonePoint point) -> point.sport().ordinal())
                .thenComparingInt(point -> point.type().ordinal())
                .thenComparingInt(AnalyticsDtos.ZonePoint::zoneNumber));
        return result;
    }

    private Map<Sport, Map<ZoneType, ZoneSet>> loadZoneSets(UUID athleteId) {
        Map<Sport, Map<ZoneType, ZoneSet>> result = new EnumMap<>(Sport.class);
        for (ZoneSet zoneSet : zoneSetRepository.findByAthleteId(athleteId)) {
            result.computeIfAbsent(zoneSet.getSport(), ignored -> new EnumMap<>(ZoneType.class))
                    .put(zoneSet.getZoneType(), zoneSet);
        }
        return result;
    }

    private Map<Sport, SportThreshold> loadThresholds(UUID athleteId) {
        Map<Sport, SportThreshold> result = new EnumMap<>(Sport.class);
        for (SportThreshold threshold : thresholdRepository.findByAthleteIdOrderBySportAsc(athleteId)) {
            result.put(threshold.getSport(), threshold);
        }
        return result;
    }

    private ZoneType zoneTypeOf(Target target) {
        if (target == null || target.getType() == null) {
            return null;
        }
        return switch (target.getType()) {
            case HR_ZONE, HR_PERCENT -> ZoneType.HR;
            case PACE_ZONE, PACE_PERCENT -> ZoneType.PACE;
            case POWER_ZONE, POWER_PERCENT -> ZoneType.POWER;
            case RPE, FREE -> null;
        };
    }

    private Integer zoneNumber(Workout workout, Target target,
                               Map<ZoneType, ZoneSet> setsByType, SportThreshold threshold) {
        if (target == null || target.getType() == null) {
            return null;
        }
        ZoneType type = zoneTypeOf(target);
        if (type == null) {
            return null;
        }
        TargetType targetType = target.getType();
        if (targetType == TargetType.HR_ZONE || targetType == TargetType.PACE_ZONE
                || targetType == TargetType.POWER_ZONE) {
            return target.getZone();
        }
        if (target.getMinValue() == null || target.getMaxValue() == null
                || target.getMinValue() <= 0 || target.getMaxValue() <= 0) {
            return null;
        }
        int min;
        int max;
        switch (targetType) {
            case HR_PERCENT -> {
                Integer lthr = threshold == null ? null : threshold.getLthr();
                if (lthr == null && threshold != null && threshold.getMaxHr() != null) {
                    lthr = (int) Math.round(threshold.getMaxHr() * 0.85);
                }
                if (lthr == null || lthr <= 0) {
                    return null;
                }
                min = (int) Math.round(lthr * target.getMinValue() / 100.0);
                max = (int) Math.round(lthr * target.getMaxValue() / 100.0);
            }
            case POWER_PERCENT -> {
                Integer ftp = threshold == null ? null : threshold.getFtpWatts();
                if (ftp == null || ftp <= 0) {
                    return null;
                }
                min = (int) Math.round(ftp * target.getMinValue() / 100.0);
                max = (int) Math.round(ftp * target.getMaxValue() / 100.0);
            }
            case PACE_PERCENT -> {
                Integer thresholdPace = threshold == null ? null
                        : (workout.getSport() == Sport.SWIM
                        ? threshold.getCssSecPer100m() : threshold.getThresholdPaceSecPerKm());
                if (thresholdPace == null || thresholdPace <= 0) {
                    return null;
                }
                // Pace é velocidade invertida: percentual maior = pace menor (mais rápido).
                min = (int) Math.round(thresholdPace * 100.0 / target.getMaxValue());
                max = (int) Math.round(thresholdPace * 100.0 / target.getMinValue());
            }
            default -> {
                return null;
            }
        }
        return findZoneNumber(setsByType.get(type), min, max);
    }

    private Integer findZoneNumber(ZoneSet set, int min, int max) {
        if (set == null || set.getZones() == null || set.getZones().isEmpty()) {
            return null;
        }
        int midpoint = (min + max) / 2;
        return set.getZones().stream()
                .filter(zone -> midpoint >= Math.min(zone.getMinValue(), zone.getMaxValue())
                        && midpoint <= Math.max(zone.getMinValue(), zone.getMaxValue()))
                .map(AthleteZone::getZoneNumber)
                .min(Integer::compareTo)
                .orElse(null);
    }

    private record ZoneKey(Sport sport, ZoneType type, int zoneNumber) {
    }
}
