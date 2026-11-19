package com.trainlab.integration;

import com.trainlab.athlete.Athlete;
import com.trainlab.athlete.AthleteRepository;
import com.trainlab.athlete.AthleteService;
import com.trainlab.common.ApiException;
import com.trainlab.user.AppUser;
import com.trainlab.user.UserRole;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/integrations")
public class IntegrationController {

    private final IntegrationService integrationService;
    private final AthleteRepository athleteRepository;
    private final AthleteService athleteService;

    public IntegrationController(IntegrationService integrationService,
                                 AthleteRepository athleteRepository,
                                 AthleteService athleteService) {
        this.integrationService = integrationService;
        this.athleteRepository = athleteRepository;
        this.athleteService = athleteService;
    }

    @GetMapping
    public List<IntegrationDtos.ConnectionView> list(@AuthenticationPrincipal AppUser user,
                                                     @RequestParam(required = false) UUID athleteId) {
        return integrationService.list(resolveAthlete(user, athleteId));
    }

    @PutMapping("/intervals")
    public IntegrationDtos.ConnectionView connect(@AuthenticationPrincipal AppUser user,
                                                  @RequestParam(required = false) UUID athleteId,
                                                  @RequestBody IntegrationDtos.ConnectionRequest request) {
        return integrationService.connect(resolveAthlete(user, athleteId),
                request.apiKey(), request.externalAthleteId());
    }

    @PostMapping("/intervals/test")
    public IntegrationDtos.ConnectionView test(@AuthenticationPrincipal AppUser user,
                                               @RequestParam(required = false) UUID athleteId) {
        return integrationService.test(resolveAthlete(user, athleteId));
    }

    @DeleteMapping("/intervals")
    public ResponseEntity<Void> disconnect(@AuthenticationPrincipal AppUser user,
                                           @RequestParam(required = false) UUID athleteId) {
        integrationService.disconnect(resolveAthlete(user, athleteId));
        return ResponseEntity.noContent().build();
    }

    /** Envia o treino planejado para o calendario do Intervals.icu (e dai para o relogio). */
    @PostMapping("/intervals/deliver/{plannedWorkoutId}")
    public IntegrationDtos.DeliveryResult deliver(@AuthenticationPrincipal AppUser user,
                                                  @RequestParam(required = false) UUID athleteId,
                                                  @PathVariable UUID plannedWorkoutId) {
        UUID resolved = resolveAthlete(user, athleteId);
        return integrationService.deliver(resolved, plannedWorkoutId);
    }

    @GetMapping("/deliveries/{plannedWorkoutId}")
    public ResponseEntity<IntegrationDtos.DeliveryView> delivery(
            @AuthenticationPrincipal AppUser user,
            @RequestParam(required = false) UUID athleteId,
            @PathVariable UUID plannedWorkoutId) {
        UUID resolved = resolveAthlete(user, athleteId);
        return integrationService.deliveryOf(resolved, plannedWorkoutId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /**
     * Atleta so' enxerga a si mesmo; treinador so' os proprios atletas.
     *
     * <p>A checagem fica no {@link AthleteService#requireReadable} — a mesma usada pelo resto
     * da API — para nao abrir uma porta lateral so' porque este controller e' novo.</p>
     */
    private UUID resolveAthlete(AppUser user, UUID requested) {
        if (user == null) {
            throw ApiException.unauthorized("Autenticacao necessaria");
        }
        if (user.getRole() == UserRole.ATHLETE) {
            return athleteRepository.findByUserId(user.getId())
                    .map(Athlete::getId)
                    .orElseThrow(() -> ApiException.notFound("Perfil de atleta nao encontrado"));
        }
        if (requested == null) {
            throw ApiException.badRequest("Informe o atleta (athleteId)");
        }
        return athleteService.requireReadable(requested, user).getId();
    }
}
