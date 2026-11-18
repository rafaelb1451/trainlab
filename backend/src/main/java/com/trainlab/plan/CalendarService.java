package com.trainlab.plan;

import com.trainlab.athlete.Athlete;
import com.trainlab.athlete.AthleteService;
import com.trainlab.athlete.DailyMetric;
import com.trainlab.athlete.DailyMetricRepository;
import com.trainlab.common.ApiException;
import com.trainlab.user.AppUser;
import com.trainlab.user.UserRole;
import com.trainlab.workout.Workout;
import com.trainlab.workout.WorkoutRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Monta o calendário mensal no formato do TrainingPeaks: cada dia com métricas e sessões
 * planejadas; cada semana com totais planejados e as métricas de carga CTL/ATL/TSB.
 */
@Service
public class CalendarService {

    /** Histórico considerado no cálculo exponencial de CTL/ATL antes de {@code from}. */
    public static final int LOAD_HISTORY_DAYS = 90;
    public static final int CTL_TIME_CONSTANT_DAYS = 42;
    public static final int ATL_TIME_CONSTANT_DAYS = 7;

    private final AthleteService athleteService;
    private final PlannedWorkoutRepository plannedWorkoutRepository;
    private final WorkoutRepository workoutRepository;
    private final DailyMetricRepository dailyMetricRepository;

    public CalendarService(AthleteService athleteService,
                           PlannedWorkoutRepository plannedWorkoutRepository,
                           WorkoutRepository workoutRepository,
                           DailyMetricRepository dailyMetricRepository) {
        this.athleteService = athleteService;
        this.plannedWorkoutRepository = plannedWorkoutRepository;
        this.workoutRepository = workoutRepository;
        this.dailyMetricRepository = dailyMetricRepository;
    }

    @Transactional(readOnly = true)
    public CalendarDtos.CalendarResponse get(AppUser currentUser, UUID athleteId, LocalDate from, LocalDate to) {
        Athlete athlete = resolveAthlete(currentUser, athleteId);
        LocalDate rangeFrom = from == null ? LocalDate.now().withDayOfMonth(1) : from;
        LocalDate rangeTo = to == null ? rangeFrom.withDayOfMonth(rangeFrom.lengthOfMonth()) : to;
        if (rangeFrom.isAfter(rangeTo)) {
            throw ApiException.badRequest("A data inicial não pode ser posterior à data final");
        }

        LocalDate historyStart = rangeFrom.minusDays(LOAD_HISTORY_DAYS);
        List<PlannedWorkout> planned = plannedWorkoutRepository
                .findByAthleteIdAndScheduledDateBetweenOrderByScheduledDateAsc(
                        athlete.getId(), historyStart, rangeTo);

        Map<UUID, Workout> workouts = new HashMap<>();
        List<UUID> workoutIds = planned.stream().map(PlannedWorkout::getWorkoutId).distinct().toList();
        if (!workoutIds.isEmpty()) {
            workoutRepository.findAllById(workoutIds).forEach(workout -> workouts.put(workout.getId(), workout));
        }

        Map<LocalDate, DailyMetric> metrics = new HashMap<>();
        for (DailyMetric metric : dailyMetricRepository
                .findByAthleteIdAndDateBetweenOrderByDateDesc(athlete.getId(), rangeFrom, rangeTo)) {
            metrics.put(metric.getDate(), metric);
        }

        Map<LocalDate, List<PlannedWorkout>> byDate = new HashMap<>();
        Map<LocalDate, double[]> loadByDate = new HashMap<>();
        for (PlannedWorkout session : planned) {
            byDate.computeIfAbsent(session.getScheduledDate(), ignored -> new ArrayList<>()).add(session);
            double tss = tssOf(session, workouts);
            loadByDate.computeIfAbsent(session.getScheduledDate(), ignored -> new double[1])[0] += tss;
        }

        List<CalendarDtos.CalendarDay> days = new ArrayList<>();
        for (LocalDate date = rangeFrom; !date.isAfter(rangeTo); date = date.plusDays(1)) {
            DailyMetric metric = metrics.get(date);
            List<CalendarDtos.CalendarSession> sessions = byDate.getOrDefault(date, List.of()).stream()
                    .map(session -> toSession(session, workouts.get(session.getWorkoutId())))
                    .toList();
            days.add(new CalendarDtos.CalendarDay(date, metric == null ? null : toMetric(metric), sessions));
        }

        Map<LocalDate, double[]> loadSeries = loadSeries(historyStart, rangeTo, loadByDate);
        List<CalendarDtos.CalendarWeek> weeks = weeks(rangeFrom, rangeTo, planned, workouts, loadSeries);

        return new CalendarDtos.CalendarResponse(athlete.getId(), rangeFrom, rangeTo, days, weeks);
    }

    /**
     * CTL/ATL exponenciais sobre o TSS planejado diário (42 e 7 dias). A série começa em
     * {@code from−90d} com 0; TSB = CTL − ATL. Valores inteiros.
     */
    private Map<LocalDate, double[]> loadSeries(LocalDate start, LocalDate end,
                                                Map<LocalDate, double[]> tssByDate) {
        Map<LocalDate, double[]> series = new HashMap<>();
        double ctl = 0.0;
        double atl = 0.0;
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            double tss = tssByDate.getOrDefault(date, new double[1])[0];
            ctl += (tss - ctl) / CTL_TIME_CONSTANT_DAYS;
            atl += (tss - atl) / ATL_TIME_CONSTANT_DAYS;
            series.put(date, new double[]{ctl, atl});
        }
        return series;
    }

    private List<CalendarDtos.CalendarWeek> weeks(LocalDate from, LocalDate to,
                                                  List<PlannedWorkout> planned,
                                                  Map<UUID, Workout> workouts,
                                                  Map<LocalDate, double[]> loadSeries) {
        Map<LocalDate, double[]> totals = new HashMap<>();
        for (PlannedWorkout session : planned) {
            if (session.getScheduledDate().isBefore(from) || session.getScheduledDate().isAfter(to)) {
                continue;
            }
            LocalDate weekStart = weekStart(session.getScheduledDate());
            double[] values = totals.computeIfAbsent(weekStart, ignored -> new double[3]);
            Workout workout = workouts.get(session.getWorkoutId());
            values[0] += estimatedDurationSec(workout);
            values[1] += estimatedTss(workout);
            values[2] += 1;
        }

        List<CalendarDtos.CalendarWeek> weeks = new ArrayList<>();
        LocalDate weekStart = weekStart(from);
        while (!weekStart.isAfter(to)) {
            LocalDate weekEnd = weekStart.plusDays(6);
            double[] total = totals.getOrDefault(weekStart, new double[3]);
            LocalDate valueDate = weekEnd.isAfter(to) ? to : weekEnd;
            double[] load = loadSeries.getOrDefault(valueDate, new double[]{0.0, 0.0});
            int ctl = (int) Math.round(load[0]);
            int atl = (int) Math.round(load[1]);
            weeks.add(new CalendarDtos.CalendarWeek(
                    weekStart,
                    (int) Math.round(total[0] / 60.0),
                    (int) Math.round(total[1]),
                    (int) total[2],
                    ctl,
                    atl,
                    ctl - atl));
            weekStart = weekStart.plusWeeks(1);
        }
        return weeks;
    }

    private CalendarDtos.CalendarSession toSession(PlannedWorkout planned, Workout workout) {
        CalendarDtos.CalendarWorkout workoutDto = workout == null ? null
                : new CalendarDtos.CalendarWorkout(workout.getId(), workout.getName(), workout.getSport(),
                workout.getType(), workout.getDescription(), estimatedDurationSec(workout),
                estimatedTss(workout), estimatedDistanceM(workout));
        return new CalendarDtos.CalendarSession(planned.getId(), planned.getScheduledDate(),
                planned.getStatus(), workoutDto);
    }

    private CalendarDtos.CalendarMetric toMetric(DailyMetric metric) {
        return new CalendarDtos.CalendarMetric(metric.getSleepHours(), metric.getHrv(), metric.getRestingHr(),
                metric.getBodyBatteryLow(), metric.getBodyBatteryHigh(), metric.getStressLevel(),
                metric.getMood(), metric.getRpe());
    }

    private double tssOf(PlannedWorkout session, Map<UUID, Workout> workouts) {
        return estimatedTss(workouts.get(session.getWorkoutId()));
    }

    private int estimatedDurationSec(Workout workout) {
        return workout == null || workout.getEstimatedDurationSec() == null
                ? 0 : workout.getEstimatedDurationSec();
    }

    private int estimatedTss(Workout workout) {
        return workout == null || workout.getEstimatedTss() == null
                ? 0 : workout.getEstimatedTss();
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
                throw ApiException.badRequest("Informe athleteId para consultar o calendário");
            }
            return athleteService.requireReadable(athleteId, currentUser);
        }
        if (currentUser.getRole() == UserRole.ATHLETE) {
            UUID ownAthleteId = athleteService.athleteIdOf(currentUser);
            if (ownAthleteId == null) {
                throw ApiException.forbidden("Perfil de atleta não encontrado");
            }
            if (athleteId != null && !athleteId.equals(ownAthleteId)) {
                throw ApiException.forbidden("Você só pode acessar o seu próprio calendário");
            }
            return athleteService.requireReadable(ownAthleteId, currentUser);
        }
        throw ApiException.forbidden("Acesso negado");
    }
}
