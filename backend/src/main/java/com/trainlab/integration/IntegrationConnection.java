package com.trainlab.integration;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.UUID;

/**
 * Vinculo de um atleta com um servico externo.
 *
 * <p>A credencial fica <b>cifrada</b> (AES-GCM) na coluna {@code credential}: o banco nunca
 * guarda a chave em texto puro. Como o Intervals.icu usa chave de API (e nao OAuth), nao ha
 * refresh token — so a chave e o id do atleta la.</p>
 */
@Entity
@Table(name = "integration_connection", uniqueConstraints = {
        @UniqueConstraint(name = "uk_integration_athlete_provider",
                columnNames = {"athlete_id", "provider"})
})
public class IntegrationConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "athlete_id", nullable = false)
    private UUID athleteId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Provider provider;

    /** Chave de API cifrada. */
    @Column(nullable = false, length = 2000)
    private String credential;

    /** Identificador do atleta no servico externo (ex.: i123456 no Intervals.icu). */
    @Column(name = "external_athlete_id", length = 120)
    private String externalAthleteId;

    /** Nome que o servico devolveu na validacao — util para o atleta confirmar que e' ele. */
    @Column(name = "external_athlete_name", length = 160)
    private String externalAthleteName;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "last_sync_at")
    private Instant lastSyncAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getAthleteId() { return athleteId; }
    public void setAthleteId(UUID athleteId) { this.athleteId = athleteId; }

    public Provider getProvider() { return provider; }
    public void setProvider(Provider provider) { this.provider = provider; }

    public String getCredential() { return credential; }
    public void setCredential(String credential) { this.credential = credential; }

    public String getExternalAthleteId() { return externalAthleteId; }
    public void setExternalAthleteId(String externalAthleteId) { this.externalAthleteId = externalAthleteId; }

    public String getExternalAthleteName() { return externalAthleteName; }
    public void setExternalAthleteName(String externalAthleteName) { this.externalAthleteName = externalAthleteName; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public Instant getLastSyncAt() { return lastSyncAt; }
    public void setLastSyncAt(Instant lastSyncAt) { this.lastSyncAt = lastSyncAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
