package com.trainlab.analytics;

import com.trainlab.athlete.Athlete;
import com.trainlab.athlete.AthleteService;
import com.trainlab.athlete.DailyMetric;
import com.trainlab.athlete.DailyMetricRepository;
import com.trainlab.common.ApiException;
import com.trainlab.common.TrainingLoadCalculator;
import com.trainlab.plan.PlannedWorkout;
import com.trainlab.plan.PlannedWorkoutRepository;
import com.trainlab.user.AppUser;
import com.trainlab.user.UserRole;
import com.trainlab.workout.Sport;
import com.trainlab.workout.Workout;
import com.trainlab.workout.WorkoutRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Painel de análises da v4 (SPEC 10.1). Agrega os treinos planejados no período em totais,
 * semanas, PMC diário, zonas, distribuição por esporte e recordes, além das métricas diárias.
 * Como ainda não há atividades importadas, os campos de concluído ficam em 0 e a conformidade
 * permanece nula.
 */
@Service
public class AnalyticsService {

    /** Concluído depende de atividades importadas (fase seguinte); 0 por enquanto. */
    private static final int NO_COMPLETED_WORK = 0;

    private final AthleteService athleteService;
    private final PlannedWorkoutRepository plannedWorkoutRepository;
    private final WorkoutRepository workoutRepository;
    private final DailyMetricRepository dailyMetricRepository;
    private final TrainingLoadCalculator trainingLoadCalculator;
    private final ZoneTimeAnalyzer zoneTimeAnalyzer;

    public AnalyticsService(AthleteService athleteService,
                            PlannedWorkoutRepository plannedWorkoutRepository,
                            WorkoutRepository workoutRepository,
                            DailyMetricRepository dailyMetricRepository,
                            TrainingLoadCalculator trainingLoadCalculator,
                            ZoneTimeAnalyzer zoneTimeAnalyzer) {
        this.athleteService = athleteService;
        this.plannedWorkoutRepository = plannedWorkoutRepository;
        this.workoutRepository = workoutRepository;
        this.dailyMetricRepository = dailyMetricRepository;
        this.trainingLoadCalculator = trainingLoadCalculator;
        this.zoneTimeAnalyzer = zoneTimeAnalyzer;
    }

    @Transactional(readOnly = true)
    public AnalyticsDtos.AnalyticsResponse get(AppUser currentUser, UUID athleteId,
                                               LocalDate from, LocalDate to) {
        Athlete athlete = resolveAthlete(currentUser, athleteId);
        LocalDate rangeFrom = from == null ? LocalDate.now().withDayOfMonth(1) : from;
        LocalDate rangeTo = to == null ? rangeFrom.withDayOfMonth(rangeFrom.lengthOfMonth()) : to;
        if (rangeFrom.isAfter(rangeTo)) {
            throw ApiException.badRequest("A data inicial não pode ser posterior à data final");
        }

        LocalDate historyStart = rangeFrom.minusDays(TrainingLoadCalculator.LOAD_HISTORY_DAYS);
        List<PlannedWorkout> plannedHistory = plannedWorkoutRepository
                .findByAthleteIdAndScheduledDateBetweenOrderByScheduledDateAsc(
                        athlete.getId(), historyStart, rangeTo);
        Map<UUID, Workout> workouts = workoutsById(plannedHistory);

        List<PlannedWorkout> planned = plannedHistory.stream()
                .filter(session -> !session.getScheduledDate().isBefore(rangeFrom)
                        && !session.getScheduledDate().isAfter(rangeTo))
                .toList();

        List<AnalyticsDtos.WeeklyPoint> weekly = weekly(rangeFrom, rangeTo, planned, workouts);
        AnalyticsDtos.Totals totals = totals(planned, weekly);
        List<AnalyticsDtos.PmcPoint> pmc = pmc(rangeFrom, rangeTo, historyStart, plannedHistory, workouts);

        return new AnalyticsDtos.AnalyticsResponse(
                rangeFrom,
                rangeTo,
                totals,
                weekly,
                pmc,
                zoneTimeAnalyzer.analyze(athlete.getId(), planned, workouts),
                metricsSeries(athlete.getId(), rangeFrom, rangeTo),
                sportDistribution(planned, workouts),
                records(planned, workouts));
    }

    private AnalyticsDtos.Totals totals(List<PlannedWorkout> planned,
                                        List<AnalyticsDtos.WeeklyPoint> weekly) {
        int plannedMinutes = 0;
        int plannedTss = 0;
        int plannedDistanceM = 0;
        for (AnalyticsDtos.WeeklyPoint point : weekly) {
            plannedMinutes += point.plannedMinutes();
            plannedTss += point.plannedTss();
            plannedDistanceM += point.plannedDistanceM();
        }
        return new AnalyticsDtos.Totals(planned.size(), plannedMinutes, plannedTss, plannedDistanceM,
                NO_COMPLETED_WORK, NO_COMPLETED_WORK, NO_COMPLETED_WORK, null);
    }

    private List<AnalyticsDtos.WeeklyPoint> weekly(LocalDate from, LocalDate to,
                                                   List<PlannedWorkout> planned,
                                                   Map<UUID, Workout> workouts) {
        Map<LocalDate, double[]> secondsByWeek = new HashMap<>();
        Map<LocalDate, Integer> tssByWeek = new HashMap<>();
        Map<LocalDate, Integer> distanceByWeek = new HashMap<>();
        for (PlannedWorkout session : planned) {
            Workout workout = workouts.get(session.getWorkoutId());
            LocalDate weekStart = weekStart(session.getScheduledDate());
            secondsByWeek.computeIfAbsent(weekStart, ignored -> new double[1])[0] += estimatedDurationSec(workout);
            tssByWeek.merge(weekStart, estimatedTss(workout), Integer::sum);
            distanceByWeek.merge(weekStart, estimatedDistanceM(workout), Integer::sum);
        }

        List<AnalyticsDtos.WeeklyPoint> weekly = new ArrayList<>();
        LocalDate weekStart = weekStart(from);
        while (!weekStart.isAfter(to)) {
            double seconds = secondsByWeek.getOrDefault(weekStart, new double[1])[0];
            weekly.add(new AnalyticsDtos.WeeklyPoint(
                    weekStart,
                    (int) Math.round(seconds / 60.0),
                    tssByWeek.getOrDefault(weekStart, 0),
                    distanceByWeek.getOrDefault(weekStart, 0),
                    NO_COMPLETED_WORK));
            weekStart = weekStart.plusWeeks(1);
        }
        return weekly;
    }

    private List<AnalyticsDtos.PmcPoint> pmc(LocalDate from, LocalDate to, LocalDate historyStart,
                                             List<PlannedWorkout> plannedHistory,
                                             Map<UUID, Workout> workouts) {
        Map<LocalDate, Double> tssByDate = new HashMap<>();
        for (PlannedWorkout session : plannedHistory) {
            if (session.getScheduledDate().isAfter(to)) {
                continue;
            }
            tssByDate.merge(session.getScheduledDate(),
                    (double) estimatedTss(workouts.get(session.getWorkoutId())), Double::sum);
        }
        Map<LocalDate, TrainingLoadCalculator.LoadPoint> series =
                trainingLoadCalculator.series(historyStart, to, tssByDate);
        List<AnalyticsDtos.PmcPoint> pmc = new ArrayList<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            TrainingLoadCalculator.LoadPoint point =
                    series.getOrDefault(date, new TrainingLoadCalculator.LoadPoint(0.0, 0.0));
            pmc.add(new AnalyticsDtos.PmcPoint(date, point.ctlRounded(), point.atlRounded(),
                    point.tsbRounded()));
        }
        return pmc;
    }

    private List<AnalyticsDtos.MetricPoint> metricsSeries(UUID athleteId, LocalDate from, LocalDate to) {
        List<DailyMetric> metrics = new ArrayList<>(dailyMetricRepository
                .findByAthleteIdAndDateBetweenOrderByDateDesc(athleteId, from, to));
        metrics.sort(Comparator.comparing(DailyMetric::getDate));
        return metrics.stream()
                .map(metric -> new AnalyticsDtos.MetricPoint(metric.getDate(), metric.getSleepHours(),
                        metric.getHrv(), metric.getRestingHr(), metric.getWeightKg(),
                        metric.getMood(), metric.getRpe()))
                .toList();
    }

    private List<AnalyticsDtos.SportPoint> sportDistribution(List<PlannedWorkout> planned,
                                                             Map<UUID, Workout> workouts) {
        Map<Sport, long[]> bySport = new EnumMap<>(Sport.class);
        for (PlannedWorkout session : planned) {
            Workout workout = workouts.get(session.getWorkoutId());
            if (workout == null || workout.getSport() == null) {
                continue;
            }
            long[] values = bySport.computeIfAbsent(workout.getSport(), ignored -> new long[2]);
            values[0] += 1;
            values[1] += estimatedDurationSec(workout);
        }
        List<AnalyticsDtos.SportPoint> distribution = new ArrayList<>();
        for (Map.Entry<Sport, long[]> entry : bySport.entrySet()) {
            distribution.add(new AnalyticsDtos.SportPoint(entry.getKey(), (int) entry.getValue()[0],
                    (int) Math.round(entry.getValue()[1] / 60.0)));
        }
        distribution.sort(Comparator.comparingInt(point -> point.sport().ordinal()));
        return distribution;
    }

    private AnalyticsDtos.Records records(List<PlannedWorkout> planned, Map<UUID, Workout> workouts) {
        int longestDurationSec = 0;
        String longestDurationWorkout = null;
        int longestDistanceM = 0;
        String longestDistanceWorkout = null;
        for (PlannedWorkout session : planned) {
            Workout workout = workouts.get(session.getWorkoutId());
            if (workout == null) {
                continue;
            }
            int durationSec = estimatedDurationSec(workout);
            if (durationSec > longestDurationSec) {
                longestDurationSec = durationSec;
                longestDurationWorkout = workout.getName();
            }
            int distanceM = estimatedDistanceM(workout);
            if (distanceM > longestDistanceM) {
                longestDistanceM = distanceM;
                longestDistanceWorkout = workout.getName();
            }
        }
        return new AnalyticsDtos.Records(longestDurationSec, longestDurationWorkout,
                longestDistanceM, longestDistanceWorkout);
    }

    private Map<UUID, Workout> workoutsById(List<PlannedWorkout> planned) {
        Map<UUID, Workout> workouts = new HashMap<>();
        List<UUID> ids = planned.stream().map(PlannedWorkout::getWorkoutId).distinct().toList();
        if (!ids.isEmpty()) {
            workoutRepository.findAllById(ids).forEach(workout -> workouts.put(workout.getId(), workout));
        }
        return workouts;
    }

    private int estimatedDurationSec(Workout workout) {
        return workout == null || workout.getEstimatedDurationSec() == null
                ? 0 : workout.getEstimatedDurationSec();
    }

    private int estimatedTss(Workout workout) {
        return workout == null || workout.getEstimatedTss() == null ? 0 : workout.getEstimatedTss();
    }

    private int estimatedDistanceM(Workout workout) {
        return workout == null || workout.getEstimatedDistanceM() == null
                ? 0 : workout.getEstimatedDistanceM();
    }

    private LocalDate weekStart(LocalDate date) {
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    private Athlete resolveAthlete(AppUser currentUser, UUID athleteId) {
        if (currentUser == null) {
            throw ApiException.unauthorized("Autenticação necessária");
        }
        if (currentUser.getRole() == UserRole.COACH) {
            if (athleteId == null) {
                throw ApiException.badRequest("Informe athleteId para consultar as análises");
            }
            return athleteService.requireReadable(athleteId, currentUser);
        }
        if (currentUser.getRole() == UserRole.ATHLETE) {
            UUID ownAthleteId = athleteService.athleteIdOf(currentUser);
            if (ownAthleteId == null) {
                throw ApiException.forbidden("Perfil de atleta não encontrado");
            }
            if (athleteId != null && !athleteId.equals(ownAthleteId)) {
                throw ApiException.forbidden("Você só pode acessar as suas próprias análises");
            }
            return athleteService.requireReadable(ownAthleteId, currentUser);
        }
        throw ApiException.forbidden("Acesso negado");
    }
}
