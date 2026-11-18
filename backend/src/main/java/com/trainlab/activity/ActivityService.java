package com.trainlab.activity;

import com.trainlab.athlete.Athlete;
import com.trainlab.athlete.AthleteRepository;
import com.trainlab.athlete.AthleteService;
import com.trainlab.common.ApiException;
import com.trainlab.user.AppUser;
import com.trainlab.user.UserRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

/**
 * Leitura e exclusão das atividades executadas (SPEC 12.2). Permissões: COACH só os próprios
 * atletas; ATHLETE só as próprias atividades — em ambos os casos a checagem reusa
 * {@link AthleteService#requireReadable(UUID, AppUser)}.
 */
@Service
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final ActivitySampleRepository sampleRepository;
    private final ActivityLapRepository lapRepository;
    private final AthleteService athleteService;
    private final AthleteRepository athleteRepository;
    private final ActivityMapper mapper;
    private final ActivityAnalysisService analysisService;

    public ActivityService(ActivityRepository activityRepository,
                           ActivitySampleRepository sampleRepository,
                           ActivityLapRepository lapRepository,
                           AthleteService athleteService,
                           AthleteRepository athleteRepository,
                           ActivityMapper mapper,
                           ActivityAnalysisService analysisService) {
        this.activityRepository = activityRepository;
        this.sampleRepository = sampleRepository;
        this.lapRepository = lapRepository;
        this.athleteService = athleteService;
        this.athleteRepository = athleteRepository;
        this.mapper = mapper;
        this.analysisService = analysisService;
    }

    @Transactional(readOnly = true)
    public List<ActivityDtos.ActivitySummary> list(AppUser currentUser, UUID athleteId,
                                                   LocalDate from, LocalDate to) {
        UUID resolvedAthleteId = resolveAthleteId(currentUser, athleteId);
        if (from != null && to != null && from.isAfter(to)) {
            throw ApiException.badRequest("A data inicial não pode ser posterior à data final");
        }
        String athleteName = athleteName(resolvedAthleteId);
        ZoneId zone = ZoneId.systemDefault();
        return activityRepository.findByAthleteIdOrderByStartTimeDesc(resolvedAthleteId).stream()
                .filter(activity -> from == null
                        || !activity.getStartTime().atZone(zone).toLocalDate().isBefore(from))
                .filter(activity -> to == null
                        || !activity.getStartTime().atZone(zone).toLocalDate().isAfter(to))
                .map(activity -> mapper.toSummary(activity, athleteName))
                .toList();
    }

    @Transactional(readOnly = true)
    public ActivityDtos.ActivityDetail get(UUID id, AppUser currentUser) {
        Activity activity = requireReadableActivity(id, currentUser);
        List<ActivitySample> samples = sampleRepository
                .findByActivityIdOrderByOffsetSecAsc(activity.getId());
        List<ActivityLap> laps = lapRepository.findByActivityIdOrderByLapIndexAsc(activity.getId());
        return mapper.toDetail(activity, athleteName(activity.getAthleteId()), laps, samples);
    }

    @Transactional(readOnly = true)
    public ActivityDtos.AnalysisResponse analysis(UUID id, AppUser currentUser) {
        Activity activity = requireReadableActivity(id, currentUser);
        return analysisService.analyze(activity, athleteName(activity.getAthleteId()));
    }

    @Transactional
    public void delete(UUID id, AppUser currentUser) {
        Activity activity = requireReadableActivity(id, currentUser);
        sampleRepository.deleteByActivityId(activity.getId());
        lapRepository.deleteByActivityId(activity.getId());
        activityRepository.delete(activity);
    }

    private Activity requireReadableActivity(UUID id, AppUser currentUser) {
        Activity activity = activityRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Atividade não encontrada"));
        athleteService.requireReadable(activity.getAthleteId(), currentUser);
        return activity;
    }

    private UUID resolveAthleteId(AppUser currentUser, UUID athleteId) {
        if (currentUser == null) {
            throw ApiException.unauthorized("Autenticação necessária");
        }
        if (currentUser.getRole() == UserRole.COACH) {
            if (athleteId == null) {
                throw ApiException.badRequest("Informe athleteId para consultar as atividades");
            }
            athleteService.requireReadable(athleteId, currentUser);
            return athleteId;
        }
        if (currentUser.getRole() == UserRole.ATHLETE) {
            UUID own = athleteService.athleteIdOf(currentUser);
            if (own == null) {
                throw ApiException.forbidden("Perfil de atleta não encontrado");
            }
            if (athleteId != null && !athleteId.equals(own)) {
                throw ApiException.forbidden("Você só pode consultar as suas próprias atividades");
            }
            return own;
        }
        throw ApiException.forbidden("Acesso negado");
    }

    private String athleteName(UUID athleteId) {
        return athleteRepository.findById(athleteId).map(Athlete::getDisplayName).orElse(null);
    }
}
