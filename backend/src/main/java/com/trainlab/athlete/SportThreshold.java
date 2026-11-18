package com.trainlab.athlete;

import com.trainlab.workout.Sport;
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

@Entity
@Table(name = "sport_thresholds", uniqueConstraints = {
        @UniqueConstraint(name = "uk_sport_thresholds_athlete_sport", columnNames = {"athlete_id", "sport"})
})
public class SportThreshold {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "athlete_id", nullable = false)
    private UUID athleteId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Sport sport;

    @Column(name = "max_hr")
    private Integer maxHr;

    @Column(name = "resting_hr")
    private Integer restingHr;

    private Integer lthr;

    @Column(name = "ftp_watts")
    private Integer ftpWatts;

    @Column(name = "threshold_pace_sec_per_km")
    private Integer thresholdPaceSecPerKm;

    @Column(name = "css_sec_per_100m")
    private Integer cssSecPer100m;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
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

    public Sport getSport() {
        return sport;
    }

    public void setSport(Sport sport) {
        this.sport = sport;
    }

    public Integer getMaxHr() {
        return maxHr;
    }

    public void setMaxHr(Integer maxHr) {
        this.maxHr = maxHr;
    }

    public Integer getRestingHr() {
        return restingHr;
    }

    public void setRestingHr(Integer restingHr) {
        this.restingHr = restingHr;
    }

    public Integer getLthr() {
        return lthr;
    }

    public void setLthr(Integer lthr) {
        this.lthr = lthr;
    }

    public Integer getFtpWatts() {
        return ftpWatts;
    }

    public void setFtpWatts(Integer ftpWatts) {
        this.ftpWatts = ftpWatts;
    }

    public Integer getThresholdPaceSecPerKm() {
        return thresholdPaceSecPerKm;
    }

    public void setThresholdPaceSecPerKm(Integer thresholdPaceSecPerKm) {
        this.thresholdPaceSecPerKm = thresholdPaceSecPerKm;
    }

    public Integer getCssSecPer100m() {
        return cssSecPer100m;
    }

    public void setCssSecPer100m(Integer cssSecPer100m) {
        this.cssSecPer100m = cssSecPer100m;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
