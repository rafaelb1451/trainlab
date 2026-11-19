package com.trainlab.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Mudanca de planejamento esperando o proximo resumo.
 *
 * <p>Em vez de mandar um e-mail a cada clique do treinador, a intencao fica registrada aqui e
 * o job periodico agrupa por atleta. A chave unica (atleta + treino) garante que mover a mesma
 * sessao cinco vezes vire <b>uma</b> linha, com o estado final.</p>
 */
@Entity
@Table(name = "pending_notification", uniqueConstraints = {
        @UniqueConstraint(name = "uk_pending_notification_athlete_workout",
                columnNames = {"athlete_id", "workout_id"})
})
public class PendingNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "athlete_id", nullable = false)
    private UUID athleteId;

    @Column(name = "workout_id", nullable = false)
    private UUID workoutId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationAction action;

    @Column(name = "scheduled_date")
    private LocalDate scheduledDate;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    /** Preenchido quando o resumo ja' foi enviado. */
    @Column(name = "processed_at")
    private Instant processedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getAthleteId() { return athleteId; }
    public void setAthleteId(UUID athleteId) { this.athleteId = athleteId; }

    public UUID getWorkoutId() { return workoutId; }
    public void setWorkoutId(UUID workoutId) { this.workoutId = workoutId; }

    public NotificationAction getAction() { return action; }
    public void setAction(NotificationAction action) { this.action = action; }

    public LocalDate getScheduledDate() { return scheduledDate; }
    public void setScheduledDate(LocalDate scheduledDate) { this.scheduledDate = scheduledDate; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Instant getProcessedAt() { return processedAt; }
    public void setProcessedAt(Instant processedAt) { this.processedAt = processedAt; }
}
