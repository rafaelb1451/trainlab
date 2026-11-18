package com.trainlab.activity;

import com.trainlab.activity.ActivitySampleNormalizer.ActivityPoint;
import com.trainlab.athlete.Athlete;
import com.trainlab.athlete.AthleteRepository;
import com.trainlab.athlete.AthleteService;
import com.trainlab.athlete.SportThreshold;
import com.trainlab.athlete.SportThresholdRepository;
import com.trainlab.common.ApiException;
import com.trainlab.plan.PlannedStatus;
import com.trainlab.plan.PlannedWorkout;
import com.trainlab.plan.PlannedWorkoutRepository;
import com.trainlab.user.AppUser;
import com.trainlab.workout.Sport;
import com.trainlab.workout.Workout;
import com.trainlab.workout.WorkoutRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Pipeline único de importação (SPEC 12.2): arquivo → parser → métricas → persistência →
 * vínculo automático com a sessão planejada. O seed usa exatamente o mesmo caminho, com TCX
 * gerado em memória, para exercitar parser e vínculo de verdade.
 */
@Service
public class ActivityImportService {

    private static final int MAX_FILE_NAME_LENGTH = 240;

    private final AthleteService athleteService;
    private final AthleteRepository athleteRepository;
    private final SportThresholdRepository thresholdRepository;
    private final ActivityFileParser fileParser;
    private final ActivityMetricsCalculator metricsCalculator;
    private final ActivityRepository activityRepository;
    private final ActivitySampleRepository sampleRepository;
    private final ActivityLapRepository lapRepository;
    private final PlannedWorkoutRepository plannedWorkoutRepository;
    private final WorkoutRepository workoutRepository;
    private final ActivityMapper mapper;

    public ActivityImportService(AthleteService athleteService,
                                 AthleteRepository athleteRepository,
                                 SportThresholdRepository thresholdRepository,
                                 ActivityFileParser fileParser,
                                 ActivityMetricsCalculator metricsCalculator,
                                 ActivityRepository activityRepository,
                                 ActivitySampleRepository sampleRepository,
                                 ActivityLapRepository lapRepository,
                                 PlannedWorkoutRepository plannedWorkoutRepository,
                                 WorkoutRepository workoutRepository,
                                 ActivityMapper mapper) {
        this.athleteService = athleteService;
        this.athleteRepository = athleteRepository;
        this.thresholdRepository = thresholdRepository;
        this.fileParser = fileParser;
        this.metricsCalculator = metricsCalculator;
        this.activityRepository = activityRepository;
        this.sampleRepository = sampleRepository;
        this.lapRepository = lapRepository;
        this.plannedWorkoutRepository = plannedWorkoutRepository;
        this.workoutRepository = workoutRepository;
        this.mapper = mapper;
    }

    /**
     * Importação autenticada. O coach só importa para os próprios atletas; o atleta só para si
     * (a checagem em {@link AthleteService#requireReadable(UUID, AppUser)} garante 403 para os
     * demais casos).
     */
    @Transactional
    public ActivityDtos.ActivitySummary importActivity(AppUser currentUser, UUID athleteId,
                                                       MultipartFile file, String name, String notes) {
        Athlete athlete = athleteService.requireReadable(athleteId, currentUser);
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Envie o arquivo da atividade no campo multipart 'file'");
        }
        String fileName = sanitizeFileName(file.getOriginalFilename());
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException ex) {
            throw ApiException.badRequest("Não foi possível ler o arquivo enviado");
        }
        return persist(athlete, fileName, content, name, notes);
    }

    /**
     * Entrada usada pelo seed. Idempotente por atleta+fileName: se o arquivo sintético já foi
     * importado, devolve a atividade existente sem duplicar samples/laps.
     */
    @Transactional
    public ActivityDtos.ActivitySummary importSeed(UUID athleteId, String fileName, byte[] content,
                                                   String name) {
        if (activityRepository.existsByAthleteIdAndFileName(athleteId, fileName)) {
            Activity existing = activityRepository
                    .findFirstByAthleteIdAndFileNameOrderByCreatedAtAsc(athleteId, fileName)
                    .orElseThrow();
            return mapper.toSummary(existing, athleteName(existing.getAthleteId()));
        }
        Athlete athlete = athleteRepository.findById(athleteId)
                .orElseThrow(() -> ApiException.notFound("Atleta não encontrado"));
        return persist(athlete, fileName, content, name, null);
    }

    private ActivityDtos.ActivitySummary persist(Athlete athlete, String fileName, byte[] content,
                                                 String name, String notes) {
        ActivityFileParser.ParsedFile parsedFile = fileParser.parse(fileName, content);
        ParsedActivity parsed = parsedFile.activity();
        if (parsed.samples().isEmpty()) {
            throw ApiException.badRequest("O arquivo não contém trackpoints com horário para importar");
        }

        Sport sport = parsed.sport() == null ? Sport.RUN : parsed.sport();
        SportThreshold threshold = thresholdRepository
                .findByAthleteIdAndSport(athlete.getId(), sport).orElse(null);
        ActivityMetrics metrics = metricsCalculator.calculate(sport, parsed.samples(),
                parsed.calories(), athlete.getWeightKg(), threshold);
        List<ActivityPoint> points = ActivitySampleNormalizer.normalize(parsed.samples());
        int userLaps = (int) parsed.laps().stream()
                .filter(lap -> lap.trigger() != null
                        && "manual".equalsIgnoreCase(lap.trigger().trim()))
                .count();
        int deviceLaps = Math.max(0, parsed.laps().size() - userLaps);
        int climbLaps = detectClimbs(points);

        Activity activity = new Activity();
        activity.setAthleteId(athlete.getId());
        activity.setName(activityName(name, fileName));
        activity.setSport(sport);
        activity.setStartTime(parsed.startTime());
        activity.setDurationSec(metrics.durationSec());
        activity.setMovingTimeSec(metrics.movingTimeSec());
        activity.setStoppedTimeSec(metrics.stoppedTimeSec());
        activity.setDistanceM(metrics.distanceM());
        activity.setAvgHr(metrics.avgHr());
        activity.setMaxHr(metrics.maxHr());
        activity.setMinHr(metrics.minHr());
        activity.setAvgPower(metrics.avgPower());
        activity.setMaxPower(metrics.maxPower());
        activity.setNormalizedPower(metrics.normalizedPower());
        activity.setVariabilityIndex(metrics.variabilityIndex());
        activity.setEfficiencyFactor(metrics.efficiencyFactor());
        activity.setPwHr(metrics.pwHr());
        activity.setPaHr(metrics.paHr());
        activity.setWattsPerKg(metrics.wattsPerKg());
        activity.setAvgPaceSecPerKm(metrics.avgPaceSecPerKm());
        activity.setMaxPaceSecPerKm(metrics.maxPaceSecPerKm());
        activity.setMinPaceSecPerKm(metrics.minPaceSecPerKm());
        activity.setNormalizedGradedPaceSecPerKm(metrics.normalizedGradedPaceSecPerKm());
        activity.setElevationGainM(metrics.elevationGainM());
        activity.setElevationLossM(metrics.elevationLossM());
        activity.setAltitudeMaxM(metrics.altitudeMaxM());
        activity.setAltitudeAvgM(metrics.altitudeAvgM());
        activity.setAltitudeMinM(metrics.altitudeMinM());
        activity.setCadenceMax(metrics.cadenceMax());
        activity.setCadenceAvg(metrics.cadenceAvg());
        activity.setCadenceMin(metrics.cadenceMin());
        activity.setCalories(metrics.calories());
        activity.setTss(metrics.tss());
        activity.setTssType(metrics.tssType());
        activity.setIntensityFactor(metrics.intensityFactor());
        activity.setDeviceLaps(deviceLaps);
        activity.setUserLaps(userLaps);
        activity.setClimbLaps(climbLaps);
        activity.setIntervalLaps(0);
        activity.setSource(parsedFile.source());
        activity.setFileName(fileName);
        activity.setNotes(trimToNull(notes));
        activity = activityRepository.save(activity);

        saveSamples(activity.getId(), points);
        saveLaps(activity.getId(), parsed.laps(), points);

        PlannedWorkout planned = linkPlannedWorkout(athlete, parsed, sport);
        if (planned != null) {
            activity.setPlannedWorkoutId(planned.getId());
            activityRepository.save(activity);
        }
        return mapper.toSummary(activity, athlete.getDisplayName());
    }

    /**
     * Conta subidas detectadas: trechos com ganho acumulado de pelo menos 15 m e extensão
     * mínima de 300 m, encerrados quando a elevação cai mais de 2 m. É o valor exibido como
     * "subida detectada" na lista de laps; não substitui os laps do arquivo.
     */
    private int detectClimbs(List<ActivityPoint> points) {
        int climbs = 0;
        boolean inClimb = false;
        double climbStartDistance = 0;
        double climbGain = 0;
        Double previous = null;
        for (ActivityPoint point : points) {
            if (point.elevationM() == null) {
                continue;
            }
            if (previous == null) {
                previous = point.elevationM();
                continue;
            }
            double delta = point.elevationM() - previous;
            if (delta > 0) {
                if (!inClimb) {
                    inClimb = true;
                    climbStartDistance = point.distanceM();
                    climbGain = 0;
                }
                climbGain += delta;
            } else if (delta < -2.0 && inClimb) {
                if (climbGain >= 15 && point.distanceM() - climbStartDistance >= 300) {
                    climbs++;
                }
                inClimb = false;
                climbGain = 0;
            }
            previous = point.elevationM();
        }
        if (inClimb && climbGain >= 15 && !points.isEmpty()
                && points.get(points.size() - 1).distanceM() - climbStartDistance >= 300) {
            climbs++;
        }
        return climbs;
    }

    /** Samples em lote: um único saveAll por atividade; o Hibernate agrupa os INSERTs. */
    private void saveSamples(UUID activityId, List<ActivityPoint> points) {
        List<ActivitySample> rows = new ArrayList<>(points.size());
        for (ActivityPoint point : points) {
            ActivitySample sample = new ActivitySample();
            sample.setActivityId(activityId);
            sample.setOffsetSec(point.offsetSec());
            sample.setDistanceM(point.distanceM());
            sample.setHr(point.hr());
            sample.setSpeedMps(point.speedMps());
            sample.setPower(point.power());
            sample.setCadence(point.cadence());
            sample.setElevationM(point.elevationM());
            sample.setLat(point.lat());
            sample.setLon(point.lon());
            rows.add(sample);
        }
        sampleRepository.saveAll(rows);
    }

    private void saveLaps(UUID activityId, List<ParsedActivity.ParsedLap> parsedLaps,
                          List<ActivityPoint> points) {
        if (parsedLaps.isEmpty()) {
            return;
        }
        List<ActivityLap> rows = new ArrayList<>(parsedLaps.size());
        int index = 0;
        for (ParsedActivity.ParsedLap parsedLap : parsedLaps) {
            List<ActivityPoint> window = points.stream()
                    .filter(point -> point.offsetSec() >= parsedLap.startSec()
                            && point.offsetSec() <= parsedLap.endSec())
                    .toList();
            int duration = (int) Math.max(0, parsedLap.endSec() - parsedLap.startSec());
            Double distance = parsedLap.distanceM();
            if (distance == null && !window.isEmpty()) {
                distance = window.get(window.size() - 1).distanceM() - window.get(0).distanceM();
            }
            Integer avgHr = parsedLap.avgHr() != null ? parsedLap.avgHr() : averageHr(window);
            Integer maxHr = parsedLap.maxHr() != null ? parsedLap.maxHr() : maxHr(window);
            Integer avgPower = parsedLap.avgPower() != null ? parsedLap.avgPower() : averagePower(window);
            Integer pace = distance != null && distance > 0
                    ? (int) Math.round(duration * 1000.0 / distance) : null;

            ActivityLap lap = new ActivityLap();
            lap.setActivityId(activityId);
            lap.setLapIndex(index++);
            lap.setDurationSec(duration);
            lap.setDistanceM(distance);
            lap.setAvgHr(avgHr);
            lap.setMaxHr(maxHr);
            lap.setAvgPower(avgPower);
            lap.setPaceSecPerKm(pace);
            rows.add(lap);
        }
        lapRepository.saveAll(rows);
    }

    private Integer averageHr(List<ActivityPoint> points) {
        double sum = 0;
        int count = 0;
        for (ActivityPoint point : points) {
            if (point.hr() != null) {
                sum += point.hr();
                count++;
            }
        }
        return count == 0 ? null : (int) Math.round(sum / count);
    }

    private Integer maxHr(List<ActivityPoint> points) {
        return points.stream().map(ActivityPoint::hr).filter(value -> value != null)
                .max(Integer::compareTo).orElse(null);
    }

    private Integer averagePower(List<ActivityPoint> points) {
        double sum = 0;
        int count = 0;
        for (ActivityPoint point : points) {
            if (point.power() != null) {
                sum += point.power();
                count++;
            }
        }
        return count == 0 ? null : (int) Math.round(sum / count);
    }

    /**
     * Vínculo automático: sessão do mesmo atleta, na data local do startTime (fuso do arquivo) e
     * mesmo esporte. Preferimos uma sessão PLANNED; se o planejado estiver PLANNED, vira
     * COMPLETED. Sem correspondência, a atividade fica sem vínculo (plannedWorkoutId nulo).
     */
    private PlannedWorkout linkPlannedWorkout(Athlete athlete, ParsedActivity parsed, Sport sport) {
        LocalDate date = parsed.offset() == null
                ? parsed.startTime().atZone(ZoneId.systemDefault()).toLocalDate()
                : parsed.startTime().atOffset(parsed.offset()).toLocalDate();
        List<PlannedWorkout> candidates = plannedWorkoutRepository
                .findByAthleteIdAndScheduledDate(athlete.getId(), date);
        if (candidates.isEmpty()) {
            return null;
        }
        Map<UUID, Workout> workouts = new HashMap<>();
        workoutRepository.findAllById(candidates.stream().map(PlannedWorkout::getWorkoutId)
                .distinct().toList()).forEach(workout -> workouts.put(workout.getId(), workout));
        PlannedWorkout match = candidates.stream()
                .filter(candidate -> {
                    Workout workout = workouts.get(candidate.getWorkoutId());
                    return workout != null && workout.getSport() == sport;
                })
                .sorted(Comparator.comparingInt(candidate ->
                        candidate.getStatus() == PlannedStatus.PLANNED ? 0 : 1))
                .findFirst()
                .orElse(null);
        if (match == null) {
            return null;
        }
        if (match.getStatus() == PlannedStatus.PLANNED) {
            match.setStatus(PlannedStatus.COMPLETED);
            plannedWorkoutRepository.save(match);
        }
        return match;
    }

    private String activityName(String name, String fileName) {
        String explicit = trimToNull(name);
        if (explicit != null) {
            return explicit.length() > 160 ? explicit.substring(0, 160) : explicit;
        }
        String base = fileName;
        int dot = base.lastIndexOf('.');
        if (dot > 0) {
            base = base.substring(0, dot);
        }
        base = base.replace('_', ' ').replace('-', ' ').trim();
        if (base.isBlank()) {
            return "Atividade importada";
        }
        return base.length() > 160 ? base.substring(0, 160) : base;
    }

    private String sanitizeFileName(String original) {
        String value = original == null ? "" : original.trim();
        int slash = Math.max(value.lastIndexOf('/'), value.lastIndexOf('\\'));
        if (slash >= 0) {
            value = value.substring(slash + 1);
        }
        if (value.isBlank()) {
            value = "atividade";
        }
        return value.length() > MAX_FILE_NAME_LENGTH
                ? value.substring(0, MAX_FILE_NAME_LENGTH) : value;
    }

    private String athleteName(UUID athleteId) {
        return athleteRepository.findById(athleteId).map(Athlete::getDisplayName).orElse(null);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
