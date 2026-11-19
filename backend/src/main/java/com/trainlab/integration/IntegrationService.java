package com.trainlab.integration;

import com.trainlab.common.ApiException;
import com.trainlab.plan.PlannedWorkout;
import com.trainlab.plan.PlannedWorkoutRepository;
import com.trainlab.workout.Workout;
import com.trainlab.workout.WorkoutRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Conecta o atleta ao Intervals.icu e entrega os treinos planejados no calendario dele.
 *
 * <p>O Intervals.icu e' o canal que hoje chega ao relogio: la' o atleta tem a Garmin
 * vinculada, entao o treino criado aqui desce no proximo sincronismo do aparelho.</p>
 */
@Service
public class IntegrationService {

    private final IntegrationRepository connections;
    private final DeliveryRecordRepository deliveries;
    private final TokenCipher cipher;
    private final IntervalsIcuClient intervals;
    private final PlannedWorkoutRepository plannedWorkouts;
    private final WorkoutRepository workouts;

    public IntegrationService(IntegrationRepository connections,
                              DeliveryRecordRepository deliveries,
                              TokenCipher cipher,
                              IntervalsIcuClient intervals,
                              PlannedWorkoutRepository plannedWorkouts,
                              WorkoutRepository workouts) {
        this.connections = connections;
        this.deliveries = deliveries;
        this.cipher = cipher;
        this.intervals = intervals;
        this.plannedWorkouts = plannedWorkouts;
        this.workouts = workouts;
    }

    @Transactional(readOnly = true)
    public List<IntegrationDtos.ConnectionView> list(UUID athleteId) {
        return connections.findByAthleteIdAndActiveTrue(athleteId).stream()
                .map(this::view)
                .toList();
    }

    /** Valida a chave contra o Intervals.icu antes de gravar — nunca guardamos credencial invalida. */
    @Transactional
    public IntegrationDtos.ConnectionView connect(UUID athleteId, String apiKey, String externalAthleteId) {
        if (apiKey == null || apiKey.isBlank()) {
            throw ApiException.badRequest("Informe a chave de API do Intervals.icu");
        }
        if (externalAthleteId == null || externalAthleteId.isBlank()) {
            throw ApiException.badRequest("Informe o ID do atleta no Intervals.icu (ex.: i123456)");
        }

        IntervalsIcuClient.AthleteProfile profile =
                intervals.athlete(apiKey.trim(), externalAthleteId.trim());

        IntegrationConnection connection = connections
                .findByAthleteIdAndProvider(athleteId, Provider.INTERVALS_ICU)
                .orElseGet(IntegrationConnection::new);

        connection.setAthleteId(athleteId);
        connection.setProvider(Provider.INTERVALS_ICU);
        connection.setCredential(cipher.encrypt(apiKey.trim()));
        connection.setExternalAthleteId(profile.id());
        connection.setExternalAthleteName(profile.name());
        connection.setActive(true);

        return view(connections.save(connection));
    }

    @Transactional
    public void disconnect(UUID athleteId) {
        IntegrationConnection connection = connections
                .findByAthleteIdAndProvider(athleteId, Provider.INTERVALS_ICU)
                .orElseThrow(() -> ApiException.notFound("Nenhuma conexao com o Intervals.icu"));
        connection.setActive(false);
        connections.save(connection);
    }

    /** Revalida a conexao existente (util depois de trocar a chave no Intervals.icu). */
    @Transactional
    public IntegrationDtos.ConnectionView test(UUID athleteId) {
        IntegrationConnection connection = requireConnection(athleteId);
        IntervalsIcuClient.AthleteProfile profile = intervals.athlete(
                cipher.decrypt(connection.getCredential()), connection.getExternalAthleteId());
        connection.setExternalAthleteName(profile.name());
        return view(connections.save(connection));
    }

    /**
     * Envia um treino planejado para o calendario do Intervals.icu.
     * O texto gerado e' devolvido junto para o treinador conferir o que foi interpretado.
     */
    @Transactional
    public IntegrationDtos.DeliveryResult deliver(UUID athleteId, UUID plannedWorkoutId) {
        PlannedWorkout planned = plannedWorkouts.findById(plannedWorkoutId)
                .orElseThrow(() -> ApiException.notFound("Treino planejado nao encontrado"));
        if (!planned.getAthleteId().equals(athleteId)) {
            throw ApiException.forbidden("Este treino planejado nao pertence ao atleta");
        }
        Workout workout = workouts.findById(planned.getWorkoutId())
                .orElseThrow(() -> ApiException.notFound("Treino nao encontrado"));

        IntegrationConnection connection = requireConnection(athleteId);
        String text = IntervalsWorkoutText.toText(workout);
        if (text.isBlank()) {
            throw ApiException.badRequest("Este treino nao tem passos para enviar ao relogio");
        }

        Map<String, Object> event = new LinkedHashMap<>();
        event.put("category", "WORKOUT");
        event.put("start_date_local", planned.getScheduledDate() + "T00:00:00");
        event.put("type", IntervalsWorkoutText.sportType(workout.getSport()));
        event.put("name", workout.getName());
        event.put("description", text);
        if (workout.getEstimatedDurationSec() != null && workout.getEstimatedDurationSec() > 0) {
            event.put("moving_time", workout.getEstimatedDurationSec());
        }

        String externalId = intervals.createEvent(
                cipher.decrypt(connection.getCredential()), connection.getExternalAthleteId(), event);

        DeliveryRecord record = new DeliveryRecord();
        record.setPlannedWorkoutId(plannedWorkoutId);
        record.setAthleteId(athleteId);
        record.setProvider(Provider.INTERVALS_ICU);
        record.setExternalId(externalId);
        record.setDeliveredAt(Instant.now());
        deliveries.save(record);

        connection.setLastSyncAt(Instant.now());
        connections.save(connection);

        return new IntegrationDtos.DeliveryResult(externalId, record.getDeliveredAt(), text);
    }

    @Transactional(readOnly = true)
    public Optional<IntegrationDtos.DeliveryView> deliveryOf(UUID athleteId, UUID plannedWorkoutId) {
        return deliveries
                .findFirstByPlannedWorkoutIdAndProviderOrderByDeliveredAtDesc(
                        plannedWorkoutId, Provider.INTERVALS_ICU)
                // O registro so' e' devolvido se pertencer ao atleta que esta consultando.
                .filter(record -> athleteId.equals(record.getAthleteId()))
                .map(record -> new IntegrationDtos.DeliveryView(
                        record.getExternalId(), record.getDeliveredAt(),
                        Provider.INTERVALS_ICU.label(), "SENT"));
    }

    // ------------------------------------------------------------------

    private IntegrationConnection requireConnection(UUID athleteId) {
        return connections.findByAthleteIdAndProvider(athleteId, Provider.INTERVALS_ICU)
                .filter(IntegrationConnection::isActive)
                .orElseThrow(() -> ApiException.conflict(
                        "Conecte o Intervals.icu antes de enviar treinos ao relogio"));
    }

    private IntegrationDtos.ConnectionView view(IntegrationConnection connection) {
        String status = connection.isActive() ? "CONNECTED" : "DISCONNECTED";
        return new IntegrationDtos.ConnectionView(
                connection.getId(),
                connection.getProvider().name(),
                connection.getProvider().label(),
                connection.getExternalAthleteId(),
                connection.getExternalAthleteName(),
                connection.isActive(),
                connection.getLastSyncAt(),
                status);
    }
}
