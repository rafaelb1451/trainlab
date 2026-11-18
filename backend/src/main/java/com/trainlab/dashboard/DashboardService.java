package com.trainlab.dashboard;

import com.trainlab.athlete.Athlete;
import com.trainlab.athlete.AthleteRepository;
import com.trainlab.athlete.AthleteService;
import com.trainlab.athlete.DailyMetricRepository;
import com.trainlab.athlete.MetricDtos;
import com.trainlab.common.ApiException;
import com.trainlab.plan.PlannedWorkout;
import com.trainlab.plan.PlannedWorkoutRepository;
import com.trainlab.user.AppUser;
import com.trainlab.user.UserRole;
import com.trainlab.workout.Workout;
import com.trainlab.workout.WorkoutRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class DashboardService {

    /** Janela de carga do dashboard: hoje + os próximos 6 dias (7 dias corridos). */
    public static final int LOAD_WINDOW_DAYS = 7;

    private final AthleteRepository athleteRepository;
    private final AthleteService athleteService;
    private final PlannedWorkoutRepository plannedWorkoutRepository;
    private final WorkoutRepository workoutRepository;
    private final DailyMetricRepository dailyMetricRepository;

    public DashboardService(AthleteRepository athleteRepository,
                            AthleteService athleteService,
                            PlannedWorkoutRepository plannedWorkoutRepository,
                            WorkoutRepository workoutRepository,
                            DailyMetricRepository dailyMetricRepository) {
        this.athleteRepository = athleteRepository;
        this.athleteService = athleteService;
        this.plannedWorkoutRepository = plannedWorkoutRepository;
        this.workoutRepository = workoutRepository;
        this.dailyMetricRepository = dailyMetricRepository;
    }

    @Transactional(readOnly = true)
    public DashboardDtos.DashboardResponse get(AppUser currentUser) {
        requireCoach(currentUser);

        List<Athlete> athletes = athleteRepository.findByCoachIdOrderByDisplayNameAsc(currentUser.getId());
        List<UUID> athleteIds = athletes.stream().map(Athlete::getId).toList();
        List<Workout> workouts = workoutRepository.findByCoachIdOrderByUpdatedAtDesc(currentUser.getId());
        Map<UUID, Workout> workoutsById = new HashMap<>();
        workouts.forEach(workout -> workoutsById.put(workout.getId(), workout));

        LocalDate today = LocalDate.now();
        LocalDate windowEnd = today.plusDays(LOAD_WINDOW_DAYS - 1L);

        List<PlannedWorkout> windowSessions = athleteIds.isEmpty() ? List.of()
                : plannedWorkoutRepository.findByAthleteIdInAndScheduledDateBetweenOrderByScheduledDateAsc(
                athleteIds, today, windowEnd);
        List<PlannedWorkout> upcomingSessions = athleteIds.isEmpty() ? List.of()
                : plannedWorkoutRepository.findByAthleteIdInAndScheduledDateGreaterThanEqualOrderByScheduledDateAsc(
                athleteIds, today);

        Map<UUID, List<PlannedWorkout>> windowByAthlete = new HashMap<>();
        for (PlannedWorkout planned : windowSessions) {
            windowByAthlete.computeIfAbsent(planned.getAthleteId(), ignored -> new ArrayList<>()).add(planned);
        }

        Map<UUID, PlannedWorkout> nextByAthlete = new LinkedHashMap<>();
        for (PlannedWorkout planned : upcomingSessions) {
            nextByAthlete.putIfAbsent(planned.getAthleteId(), planned);
        }

        List<DashboardDtos.RosterEntry> roster = new ArrayList<>();
        for (Athlete athlete : athletes) {
            List<PlannedWorkout> athleteSessions = windowByAthlete.getOrDefault(athlete.getId(), List.of());
            int athleteMinutes = plannedMinutes(athleteSessions, workoutsById);

            PlannedWorkout next = nextByAthlete.get(athlete.getId());
            Workout nextWorkout = next == null ? null : workoutsById.get(next.getWorkoutId());

            MetricDtos.DailyMetricDto latestMetric = dailyMetricRepository
                    .findTopByAthleteIdOrderByDateDesc(athlete.getId())
                    .map(MetricDtos.DailyMetricDto::from)
                    .orElse(null);

            roster.add(new DashboardDtos.RosterEntry(
                    athlete.getId(),
                    athlete.getDisplayName(),
                    athleteService.toSummary(athlete).sports(),
                    athleteMinutes,
                    next == null ? null : next.getScheduledDate(),
                    nextWorkout == null ? null : nextWorkout.getName(),
                    latestMetric));
        }
        roster.sort(Comparator.comparing(DashboardDtos.RosterEntry::displayName,
                String.CASE_INSENSITIVE_ORDER));

        return new DashboardDtos.DashboardResponse(
                athletes.size(),
                workouts.size(),
                windowSessions.size(),
                plannedMinutes(windowSessions, workoutsById),
                roster);
    }

    private int plannedMinutes(List<PlannedWorkout> sessions, Map<UUID, Workout> workoutsById) {
        long seconds = 0;
        for (PlannedWorkout session : sessions) {
            Workout workout = workoutsById.get(session.getWorkoutId());
            if (workout != null && workout.getEstimatedDurationSec() != null) {
                seconds += workout.getEstimatedDurationSec();
            }
        }
        return (int) Math.round(seconds / 60.0);
    }

    private void requireCoach(AppUser user) {
        if (user == null) {
            throw ApiException.unauthorized("Autenticação necessária");
        }
        if (user.getRole() != UserRole.COACH) {
            throw ApiException.forbidden("Apenas o treinador pode acessar o dashboard do plantel");
        }
    }
}
