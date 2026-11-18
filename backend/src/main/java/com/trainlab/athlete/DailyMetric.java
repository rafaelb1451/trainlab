package com.trainlab.athlete;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Métricas diárias de recuperação e percepção do atleta (sono, VFC, FC de repouso,
 * Body Battery, estresse, humor, RPE e peso). Uma linha por atleta + data.
 */
@Entity
@Table(name = "daily_metrics", uniqueConstraints = {
        @UniqueConstraint(name = "uk_daily_metrics_athlete_date", columnNames = {"athlete_id", "metric_date"})
})
public class DailyMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "athlete_id", nullable = false)
    private UUID athleteId;

    @NotNull(message = "a data da métrica é obrigatória")
    @Column(name = "metric_date", nullable = false)
    private LocalDate date;

    @DecimalMin(value = "0.0", message = "as horas de sono devem ser no mínimo 0")
    @DecimalMax(value = "24.0", message = "as horas de sono devem ser no máximo 24")
    @Column(name = "sleep_hours")
    private Double sleepHours;

    @DecimalMin(value = "0.0", message = "as horas de sono profundo devem ser no mínimo 0")
    @DecimalMax(value = "24.0", message = "as horas de sono profundo devem ser no máximo 24")
    @Column(name = "deep_sleep_hours")
    private Double deepSleepHours;

    @DecimalMin(value = "0.0", message = "as horas de sono REM devem ser no mínimo 0")
    @DecimalMax(value = "24.0", message = "as horas de sono REM devem ser no máximo 24")
    @Column(name = "rem_sleep_hours")
    private Double remSleepHours;

    @DecimalMin(value = "0.0", message = "as horas de sono leve devem ser no mínimo 0")
    @DecimalMax(value = "24.0", message = "as horas de sono leve devem ser no máximo 24")
    @Column(name = "light_sleep_hours")
    private Double lightSleepHours;

    @DecimalMin(value = "0.0", message = "as horas acordado devem ser no mínimo 0")
    @DecimalMax(value = "24.0", message = "as horas acordado devem ser no máximo 24")
    @Column(name = "awake_hours")
    private Double awakeHours;

    @Min(value = 0, message = "a VFC deve ser no mínimo 0 ms")
    @Max(value = 400, message = "a VFC deve ser no máximo 400 ms")
    @Column(name = "hrv")
    private Integer hrv;

    @Min(value = 20, message = "a FC de repouso deve ser no mínimo 20 bpm")
    @Max(value = 250, message = "a FC de repouso deve ser no máximo 250 bpm")
    @Column(name = "resting_hr")
    private Integer restingHr;

    @Min(value = 0, message = "o Body Battery mínimo deve ser no mínimo 0")
    @Max(value = 100, message = "o Body Battery mínimo deve ser no máximo 100")
    @Column(name = "body_battery_low")
    private Integer bodyBatteryLow;

    @Min(value = 0, message = "o Body Battery máximo deve ser no mínimo 0")
    @Max(value = 100, message = "o Body Battery máximo deve ser no máximo 100")
    @Column(name = "body_battery_high")
    private Integer bodyBatteryHigh;

    @Min(value = 0, message = "o nível de estresse deve ser no mínimo 0")
    @Max(value = 100, message = "o nível de estresse deve ser no máximo 100")
    @Column(name = "stress_level")
    private Integer stressLevel;

    @Min(value = 1, message = "o humor deve ser entre 1 e 5")
    @Max(value = 5, message = "o humor deve ser entre 1 e 5")
    @Column(name = "mood")
    private Integer mood;

    @Min(value = 1, message = "o RPE deve ser entre 1 e 10")
    @Max(value = 10, message = "o RPE deve ser entre 1 e 10")
    @Column(name = "rpe")
    private Integer rpe;

    @DecimalMin(value = "20.0", message = "o peso deve ser no mínimo 20 kg")
    @DecimalMax(value = "300.0", message = "o peso deve ser no máximo 300 kg")
    @Column(name = "weight_kg")
    private Double weightKg;

    @Size(max = 2000, message = "as observações devem ter no máximo 2000 caracteres")
    @Column(length = 2000)
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getAthleteId() {
        return athleteId;
    }

    public void setAthleteId(UUID athleteId) {
        this.athleteId = athleteId;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public Double getSleepHours() {
        return sleepHours;
    }

    public void setSleepHours(Double sleepHours) {
        this.sleepHours = sleepHours;
    }

    public Double getDeepSleepHours() {
        return deepSleepHours;
    }

    public void setDeepSleepHours(Double deepSleepHours) {
        this.deepSleepHours = deepSleepHours;
    }

    public Double getRemSleepHours() {
        return remSleepHours;
    }

    public void setRemSleepHours(Double remSleepHours) {
        this.remSleepHours = remSleepHours;
    }

    public Double getLightSleepHours() {
        return lightSleepHours;
    }

    public void setLightSleepHours(Double lightSleepHours) {
        this.lightSleepHours = lightSleepHours;
    }

    public Double getAwakeHours() {
        return awakeHours;
    }

    public void setAwakeHours(Double awakeHours) {
        this.awakeHours = awakeHours;
    }

    public Integer getHrv() {
        return hrv;
    }

    public void setHrv(Integer hrv) {
        this.hrv = hrv;
    }

    public Integer getRestingHr() {
        return restingHr;
    }

    public void setRestingHr(Integer restingHr) {
        this.restingHr = restingHr;
    }

    public Integer getBodyBatteryLow() {
        return bodyBatteryLow;
    }

    public void setBodyBatteryLow(Integer bodyBatteryLow) {
        this.bodyBatteryLow = bodyBatteryLow;
    }

    public Integer getBodyBatteryHigh() {
        return bodyBatteryHigh;
    }

    public void setBodyBatteryHigh(Integer bodyBatteryHigh) {
        this.bodyBatteryHigh = bodyBatteryHigh;
    }

    public Integer getStressLevel() {
        return stressLevel;
    }

    public void setStressLevel(Integer stressLevel) {
        this.stressLevel = stressLevel;
    }

    public Integer getMood() {
        return mood;
    }

    public void setMood(Integer mood) {
        this.mood = mood;
    }

    public Integer getRpe() {
        return rpe;
    }

    public void setRpe(Integer rpe) {
        this.rpe = rpe;
    }

    public Double getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(Double weightKg) {
        this.weightKg = weightKg;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
