package com.trainlab.activity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * Volta/lap de uma atividade (SPEC 12.1). O pace é persistido em segundos por km mesmo na
 * natação, para manter a mesma unidade do resumo da atividade; a UI decide como exibir.
 */
@Entity
@Table(name = "activity_laps", indexes = {
        @Index(name = "idx_activity_laps_activity", columnList = "activity_id"),
        @Index(name = "idx_activity_laps_activity_index", columnList = "activity_id,lap_index")
})
public class ActivityLap {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "activity_id", nullable = false)
    private UUID activityId;

    @Column(name = "lap_index", nullable = false)
    private Integer lapIndex;

    @Column(name = "duration_sec", nullable = false)
    private Integer durationSec = 0;

    @Column(name = "distance_m")
    private Double distanceM;

    @Column(name = "avg_hr")
    private Integer avgHr;

    @Column(name = "max_hr")
    private Integer maxHr;

    @Column(name = "avg_power")
    private Integer avgPower;

    @Column(name = "pace_sec_per_km")
    private Integer paceSecPerKm;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getActivityId() {
        return activityId;
    }

    public void setActivityId(UUID activityId) {
        this.activityId = activityId;
    }

    public Integer getLapIndex() {
        return lapIndex;
    }

    public void setLapIndex(Integer lapIndex) {
        this.lapIndex = lapIndex;
    }

    public Integer getDurationSec() {
        return durationSec;
    }

    public void setDurationSec(Integer durationSec) {
        this.durationSec = durationSec;
    }

    public Double getDistanceM() {
        return distanceM;
    }

    public void setDistanceM(Double distanceM) {
        this.distanceM = distanceM;
    }

    public Integer getAvgHr() {
        return avgHr;
    }

    public void setAvgHr(Integer avgHr) {
        this.avgHr = avgHr;
    }

    public Integer getMaxHr() {
        return maxHr;
    }

    public void setMaxHr(Integer maxHr) {
        this.maxHr = maxHr;
    }

    public Integer getAvgPower() {
        return avgPower;
    }

    public void setAvgPower(Integer avgPower) {
        this.avgPower = avgPower;
    }

    public Integer getPaceSecPerKm() {
        return paceSecPerKm;
    }

    public void setPaceSecPerKm(Integer paceSecPerKm) {
        this.paceSecPerKm = paceSecPerKm;
    }
}
