package com.trainlab.plan;

import com.trainlab.athlete.Athlete;
import com.trainlab.athlete.AthleteRepository;
import com.trainlab.athlete.AthleteService;
import com.trainlab.common.ApiException;
import com.trainlab.notification.NotificationAction;
import com.trainlab.notification.NotificationService;
import com.trainlab.user.AppUser;
import com.trainlab.user.UserRole;
import com.trainlab.workout.Workout;
import com.trainlab.workout.WorkoutRepository;
import com.trainlab.workout.WorkoutService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class PlannedWorkoutService {

    private final PlannedWorkoutRepository plannedWorkoutRepository;
    private final AthleteRepository athleteRepository;
    private final AthleteService athleteService;
    private final WorkoutRepository workoutRepository;
    private final WorkoutService workoutService;
    private final NotificationService notifications;

    public PlannedWorkoutService(PlannedWorkoutRepository plannedWorkoutRepository,
                                 AthleteRepository athleteRepository,
                                 AthleteService athleteService,
                                 WorkoutRepository workoutRepository,
                                 WorkoutService workoutService,
                                 NotificationService notifications) {
        this.plannedWorkoutRepository = plannedWorkoutRepository;
        this.athleteRepository = athleteRepository;
        this.athleteService = athleteService;
        this.workoutRepository = workoutRepository;
        this.workoutService = workoutService;
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<PlanDtos.PlannedWorkoutDto> list(AppUser currentUser, UUID athleteId,
                                                 LocalDate from, LocalDate to) {
        requireUser(currentUser);
        List<PlannedWorkout> planned;
        if (currentUser.getRole() == UserRole.COACH) {
            if (athleteId != null) {
                athleteService.requireReadable(athleteId, currentUser);
                planned = plannedWorkoutRepository.findByAthleteIdOrderByScheduledDateAsc(athleteId);
            } else {
                List<UUID> ids = athleteRepository.findByCoachIdOrderByDisplayNameAsc(currentUser.getId())
                        .stream().map(Athlete::getId).toList();
                planned = ids.isEmpty() ? new ArrayList<>()
                        : plannedWorkoutRepository.findByAthleteIdInOrderByScheduledDateAsc(ids);
            }
        } else if (currentUser.getRole() == UserRole.ATHLETE) {
            UUID ownAthleteId = athleteService.athleteIdOf(currentUser);
            if (athleteId != null && !athleteId.equals(ownAthleteId)) {
                throw ApiException.forbidden("Você só pode acessar o seu próprio planejamento");
            }
            planned = ownAthleteId == null ? new ArrayList<>()
                    : plannedWorkoutRepository.findByAthleteIdOrderByScheduledDateAsc(ownAthleteId);
        } else {
            throw ApiException.forbidden("Acesso negado");
        }

        return planned.stream()
                .filter(p -> from == null || !p.getScheduledDate().isBefore(from))
                .filter(p -> to == null || !p.getScheduledDate().isAfter(to))
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public PlanDtos.PlannedWorkoutDto create(AppUser currentUser, PlanDtos.PlannedWorkoutRequest request) {
        requireCoach(currentUser);
        Athlete athlete = athleteService.requireReadable(request.athleteId(), currentUser);
        Workout workout = workoutRepository.findById(request.workoutId())
                .orElseThrow(() -> ApiException.notFound("Treino não encontrado"));
        if (!currentUser.getId().equals(workout.getCoachId())) {
            throw ApiException.forbidden("Você só pode planejar treinos que você criou");
        }

        PlannedWorkout planned = new PlannedWorkout();
        planned.setAthleteId(request.athleteId());
        planned.setWorkoutId(request.workoutId());
        planned.setScheduledDate(request.scheduledDate());
        planned.setStatus(request.status() == null ? PlannedStatus.PLANNED : request.status());
        planned.setNotes(request.notes());
        planned = plannedWorkoutRepository.save(planned);

        notifyIfFuture(athlete, planned, NotificationAction.SCHEDULED);
        return toDto(planned);
    }

    @Transactional
    public PlanDtos.PlannedWorkoutDto patch(UUID id, AppUser currentUser,
                                            PlanDtos.PlannedWorkoutPatchRequest request) {
        // Mutação de planejamento é exclusiva do treinador; atleta recebe 403.
        requireCoach(currentUser);
        if (request == null
                || (request.scheduledDate() == null && request.status() == null && request.notes() == null)) {
            throw ApiException.badRequest("Informe scheduledDate e/ou status para atualizar a sessão");
        }

        PlannedWorkout planned = plannedWorkoutRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Sessão planejada não encontrada"));
        Athlete athlete = athleteRepository.findById(planned.getAthleteId())
                .orElseThrow(() -> ApiException.notFound("Atleta não encontrado"));
        if (!currentUser.getId().equals(athlete.getCoachId())) {
            throw ApiException.forbidden("Você só pode alterar planejamentos dos seus atletas");
        }

        if (request.scheduledDate() != null) {
            planned.setScheduledDate(request.scheduledDate());
        }
        if (request.status() != null) {
            planned.setStatus(request.status());
        }
        if (request.notes() != null) {
            planned.setNotes(request.notes());
        }
        planned = plannedWorkoutRepository.save(planned);
        notifyIfFuture(athlete, planned, NotificationAction.UPDATED);
        return toDto(planned);
    }

    @Transactional
    public void delete(UUID id, AppUser currentUser) {
        requireCoach(currentUser);
        PlannedWorkout planned = plannedWorkoutRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Sessão planejada não encontrada"));

        Athlete athlete = athleteRepository.findById(planned.getAthleteId())
                .orElseThrow(() -> ApiException.notFound("Atleta não encontrado"));
        if (!currentUser.getId().equals(athlete.getCoachId())) {
            throw ApiException.forbidden("Você só pode remover planejamentos dos seus atletas");
        }

        plannedWorkoutRepository.delete(planned);
        notifyIfFuture(athlete, planned, NotificationAction.REMOVED);
    }

    /** Avisa o atleta apenas para sessoes de hoje em diante (o passado nao se notifica). */
    private void notifyIfFuture(Athlete athlete, PlannedWorkout planned,
                                NotificationAction action) {
        if (planned.getScheduledDate() == null || planned.getScheduledDate().isBefore(LocalDate.now())) {
            return;
        }
        notifications.workoutChanged(athlete, planned.getWorkoutId(), planned.getScheduledDate(), action);
    }

    private PlanDtos.PlannedWorkoutDto toDto(PlannedWorkout planned) {
        Workout workout = workoutRepository.findById(planned.getWorkoutId()).orElse(null);
        String athleteName = athleteRepository.findById(planned.getAthleteId())
                .map(Athlete::getDisplayName).orElse(null);
        return new PlanDtos.PlannedWorkoutDto(planned.getId(), planned.getAthleteId(), athleteName,
                planned.getWorkoutId(), planned.getScheduledDate(), planned.getStatus(), planned.getNotes(),
                workout == null ? null : workoutService.toSummary(workout));
    }

    private void requireUser(AppUser user) {
        if (user == null) {
            throw ApiException.unauthorized("Autenticação necessária");
        }
    }

    private void requireCoach(AppUser user) {
        requireUser(user);
        if (user.getRole() != UserRole.COACH) {
            throw ApiException.forbidden("Apenas o treinador pode agendar treinos");
        }
    }
}
