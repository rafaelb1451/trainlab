package com.trainlab.athlete;

import com.trainlab.plan.PlannedWorkout;
import com.trainlab.plan.PlannedWorkoutRepository;
import com.trainlab.user.AppUser;
import com.trainlab.workout.Workout;
import com.trainlab.workout.WorkoutRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Monta a ficha 360 do atleta: dados cadastrais/objetivo, limiares, zonas, próximas
 * sessões, carga da janela de 7 dias e as métricas diárias mais recentes.
 */
@Service
public class AthleteOverviewService {

    /** Janela de carga: hoje + os próximos 6 dias (7 dias corridos). */
    public static final int LOAD_WINDOW_DAYS = 7;

    private static final int UPCOMING_LIMIT = 10;

    private final AthleteService athleteService;
    private final PlannedWorkoutRepository plannedWorkoutRepository;
    private final WorkoutRepository workoutRepository;
    private final DailyMetricRepository dailyMetricRepository;

    public AthleteOverviewService(AthleteService athleteService,
                                  PlannedWorkoutRepository plannedWorkoutRepository,
                                  WorkoutRepository workoutRepository,
                                  DailyMetricRepository dailyMetricRepository) {
        this.athleteService = athleteService;
        this.plannedWorkoutRepository = plannedWorkoutRepository;
        this.workoutRepository = workoutRepository;
        this.dailyMetricRepository = dailyMetricRepository;
    }

    @Transactional(readOnly = true)
    public AthleteOverviewDtos.AthleteOverview get(UUID athleteId, AppUser currentUser) {
        Athlete athlete = athleteService.requireReadable(athleteId, currentUser);
        AthleteDtos.AthleteDetail detail = athleteService.toDetail(athlete);

        LocalDate today = LocalDate.now();
        LocalDate windowEnd = today.plusDays(LOAD_WINDOW_DAYS - 1L);

        List<PlannedWorkout> loadSessions = plannedWorkoutRepository
                .findByAthleteIdAndScheduledDateBetweenOrderByScheduledDateAsc(athleteId, today, windowEnd);

        List<PlannedWorkout> upcomingPlanned = plannedWorkoutRepository
                .findByAthleteIdAndScheduledDateGreaterThanEqualOrderByScheduledDateAsc(athleteId, today).stream()
                .limit(UPCOMING_LIMIT)
                .toList();
        List<PlannedWorkout> allSessions = new ArrayList<>(loadSessions);
        allSessions.addAll(upcomingPlanned);
        Map<UUID, Workout> workouts = workoutsById(allSessions);
        int plannedMinutes = plannedMinutes(loadSessions, workouts);

        List<AthleteOverviewDtos.UpcomingSession> upcoming = upcomingPlanned.stream()
                .map(planned -> toUpcomingSession(planned, workouts))
                .toList();

        MetricDtos.DailyMetricDto latestMetric = dailyMetricRepository
                .findTopByAthleteIdOrderByDateDesc(athleteId)
                .map(MetricDtos.DailyMetricDto::from)
                .orElse(null);

        List<MetricDtos.DailyMetricDto> last7Metrics = dailyMetricRepository
                .findByAthleteIdAndDateBetweenOrderByDateDesc(athleteId, today.minusDays(6), today).stream()
                .map(MetricDtos.DailyMetricDto::from)
                .toList();

        return new AthleteOverviewDtos.AthleteOverview(
                detail,
                athleteService.getThresholds(athleteId, currentUser),
                athleteService.getZones(athleteId, currentUser),
                upcoming,
                new AthleteOverviewDtos.WeeklyLoad(plannedMinutes, loadSessions.size()),
                latestMetric,
                last7Metrics);
    }

    private Map<UUID, Workout> workoutsById(List<PlannedWorkout> planned) {
        List<UUID> workoutIds = planned.stream().map(PlannedWorkout::getWorkoutId).distinct().toList();
        Map<UUID, Workout> workouts = new HashMap<>();
        if (!workoutIds.isEmpty()) {
            workoutRepository.findAllById(workoutIds).forEach(workout -> workouts.put(workout.getId(), workout));
        }
        return workouts;
    }

    private int plannedMinutes(List<PlannedWorkout> planned, Map<UUID, Workout> workouts) {
        long seconds = 0;
        for (PlannedWorkout session : planned) {
            Workout workout = workouts.get(session.getWorkoutId());
            if (workout != null && workout.getEstimatedDurationSec() != null) {
                seconds += workout.getEstimatedDurationSec();
            }
        }
        return (int) Math.round(seconds / 60.0);
    }

    private AthleteOverviewDtos.UpcomingSession toUpcomingSession(PlannedWorkout planned,
                                                                  Map<UUID, Workout> workouts) {
        Workout workout = workouts.get(planned.getWorkoutId());
        AthleteOverviewDtos.UpcomingWorkout workoutDto = workout == null ? null
                : new AthleteOverviewDtos.UpcomingWorkout(workout.getId(), workout.getName(),
                workout.getSport(), workout.getType(), workout.getEstimatedDurationSec());
        return new AthleteOverviewDtos.UpcomingSession(planned.getId(), planned.getScheduledDate(),
                planned.getStatus(), workoutDto);
    }
}
