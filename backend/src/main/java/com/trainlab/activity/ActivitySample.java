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
 * Ponto de amostragem de uma atividade (SPEC 12.1). A coluna {@code offset_sec} é relativa ao
 * primeiro trackpoint, o que deixa a série independente de fuso oriundo do arquivo.
 */
@Entity
@Table(name = "activity_samples", indexes = {
        @Index(name = "idx_activity_samples_activity", columnList = "activity_id"),
        @Index(name = "idx_activity_samples_activity_offset", columnList = "activity_id,offset_sec")
})
public class ActivitySample {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "activity_id", nullable = false)
    private UUID activityId;

    @Column(name = "offset_sec", nullable = false)
    private Long offsetSec;

    @Column(name = "distance_m")
    private Double distanceM;

    private Integer hr;

    @Column(name = "speed_mps")
    private Double speedMps;

    private Integer power;

    private Integer cadence;

    @Column(name = "elevation_m")
    private Double elevationM;

    private Double lat;

    private Double lon;

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

    public Long getOffsetSec() {
        return offsetSec;
    }

    public void setOffsetSec(Long offsetSec) {
        this.offsetSec = offsetSec;
    }

    public Double getDistanceM() {
        return distanceM;
    }

    public void setDistanceM(Double distanceM) {
        this.distanceM = distanceM;
    }

    public Integer getHr() {
        return hr;
    }

    public void setHr(Integer hr) {
        this.hr = hr;
    }

    public Double getSpeedMps() {
        return speedMps;
    }

    public void setSpeedMps(Double speedMps) {
        this.speedMps = speedMps;
    }

    public Integer getPower() {
        return power;
    }

    public void setPower(Integer power) {
        this.power = power;
    }

    public Integer getCadence() {
        return cadence;
    }

    public void setCadence(Integer cadence) {
        this.cadence = cadence;
    }

    public Double getElevationM() {
        return elevationM;
    }

    public void setElevationM(Double elevationM) {
        this.elevationM = elevationM;
    }

    public Double getLat() {
        return lat;
    }

    public void setLat(Double lat) {
        this.lat = lat;
    }

    public Double getLon() {
        return lon;
    }

    public void setLon(Double lon) {
        this.lon = lon;
    }
}
