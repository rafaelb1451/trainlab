package com.trainlab.activity;

import com.trainlab.workout.Sport;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Atividade executada importada de um arquivo (SPEC 12.1). É o lado "realizado" do treino:
 * as métricas resumidas ficam aqui e os pontos/voltas nas tabelas filhas
 * {@link ActivitySample} e {@link ActivityLap}.
 */
@Entity
@Table(name = "activities", indexes = {
        @Index(name = "idx_activities_athlete", columnList = "athlete_id"),
        @Index(name = "idx_activities_start_time", columnList = "start_time"),
        @Index(name = "idx_activities_athlete_start", columnList = "athlete_id,start_time")
})
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "athlete_id", nullable = false)
    private UUID athleteId;

    /** Sessão planejada vinculada automaticamente por atleta + data + esporte (pode ser nula). */
    @Column(name = "planned_workout_id")
    private UUID plannedWorkoutId;

    @Column(nullable = false, length = 160)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Sport sport;

    @Column(name = "start_time", nullable = false)
    private Instant startTime;

    @Column(name = "duration_sec", nullable = false)
    private Integer durationSec = 0;

    @Column(name = "moving_time_sec", nullable = false)
    private Integer movingTimeSec = 0;

    @Column(name = "stopped_time_sec")
    private Integer stoppedTimeSec;

    @Column(name = "distance_m")
    private Integer distanceM;

    @Column(name = "avg_hr")
    private Integer avgHr;

    @Column(name = "max_hr")
    private Integer maxHr;

    @Column(name = "min_hr")
    private Integer minHr;

    @Column(name = "avg_power")
    private Integer avgPower;

    @Column(name = "max_power")
    private Integer maxPower;

    @Column(name = "normalized_power")
    private Integer normalizedPower;

    /** VI = potência normalizada / potência média. */
    @Column(name = "variability_index")
    private Double variabilityIndex;

    /** EF = potência normalizada / FC média (potência por batimento). */
    @Column(name = "efficiency_factor")
    private Double efficiencyFactor;

    /** Pw:Hr — desacoplamento potência/FC entre as duas metades (%). */
    @Column(name = "pw_hr")
    private Double pwHr;

    /** Pa:Hr — desacoplamento pace/FC entre as duas metades (%). */
    @Column(name = "pa_hr")
    private Double paHr;

    /** W/kg = potência normalizada / peso do atleta. */
    @Column(name = "watts_per_kg")
    private Double wattsPerKg;

    @Column(name = "avg_pace_sec_per_km")
    private Integer avgPaceSecPerKm;

    @Column(name = "max_pace_sec_per_km")
    private Integer maxPaceSecPerKm;

    @Column(name = "min_pace_sec_per_km")
    private Integer minPaceSecPerKm;

    /** NGP (Normalized Graded Pace) apenas para corrida; nulo nas demais modalidades. */
    @Column(name = "normalized_graded_pace_sec_per_km")
    private Integer normalizedGradedPaceSecPerKm;

    @Column(name = "elevation_gain_m")
    private Integer elevationGainM;

    @Column(name = "elevation_loss_m")
    private Integer elevationLossM;

    @Column(name = "altitude_max_m")
    private Integer altitudeMaxM;

    @Column(name = "altitude_avg_m")
    private Integer altitudeAvgM;

    @Column(name = "altitude_min_m")
    private Integer altitudeMinM;

    @Column(name = "cadence_max")
    private Integer cadenceMax;

    @Column(name = "cadence_avg")
    private Integer cadenceAvg;

    @Column(name = "cadence_min")
    private Integer cadenceMin;

    private Integer calories;

    private Integer tss;

    @Column(name = "intensity_factor")
    private Double intensityFactor;

    /** Rótulo do TSS conforme o esporte: rTSS (corrida), sTSS (natação) ou TSS. */
    @Column(name = "tss_type", length = 10)
    private String tssType;

    @Column(name = "device_laps")
    private Integer deviceLaps;

    @Column(name = "user_laps")
    private Integer userLaps;

    @Column(name = "climb_laps")
    private Integer climbLaps;

    @Column(name = "interval_laps")
    private Integer intervalLaps;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ActivitySource source;

    @Column(name = "file_name", length = 260)
    private String fileName;

    @Column(length = 2000)
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (durationSec == null) {
            durationSec = 0;
        }
        if (movingTimeSec == null) {
            movingTimeSec = 0;
        }
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

    public UUID getPlannedWorkoutId() {
        return plannedWorkoutId;
    }

    public void setPlannedWorkoutId(UUID plannedWorkoutId) {
        this.plannedWorkoutId = plannedWorkoutId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Sport getSport() {
        return sport;
    }

    public void setSport(Sport sport) {
        this.sport = sport;
    }

    public Instant getStartTime() {
        return startTime;
    }

    public void setStartTime(Instant startTime) {
        this.startTime = startTime;
    }

    public Integer getDurationSec() {
        return durationSec;
    }

    public void setDurationSec(Integer durationSec) {
        this.durationSec = durationSec;
    }

    public Integer getMovingTimeSec() {
        return movingTimeSec;
    }

    public void setMovingTimeSec(Integer movingTimeSec) {
        this.movingTimeSec = movingTimeSec;
    }

    public Integer getDistanceM() {
        return distanceM;
    }

    public void setDistanceM(Integer distanceM) {
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

    public Integer getMaxPower() {
        return maxPower;
    }

    public void setMaxPower(Integer maxPower) {
        this.maxPower = maxPower;
    }

    public Integer getNormalizedPower() {
        return normalizedPower;
    }

    public void setNormalizedPower(Integer normalizedPower) {
        this.normalizedPower = normalizedPower;
    }

    public Integer getAvgPaceSecPerKm() {
        return avgPaceSecPerKm;
    }

    public void setAvgPaceSecPerKm(Integer avgPaceSecPerKm) {
        this.avgPaceSecPerKm = avgPaceSecPerKm;
    }

    public Integer getElevationGainM() {
        return elevationGainM;
    }

    public void setElevationGainM(Integer elevationGainM) {
        this.elevationGainM = elevationGainM;
    }

    public Integer getCalories() {
        return calories;
    }

    public void setCalories(Integer calories) {
        this.calories = calories;
    }

    public Integer getTss() {
        return tss;
    }

    public void setTss(Integer tss) {
        this.tss = tss;
    }

    public Double getIntensityFactor() {
        return intensityFactor;
    }

    public void setIntensityFactor(Double intensityFactor) {
        this.intensityFactor = intensityFactor;
    }

    public ActivitySource getSource() {
        return source;
    }

    public void setSource(ActivitySource source) {
        this.source = source;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }


    public Integer getStoppedTimeSec() {
        return stoppedTimeSec;
    }

    public void setStoppedTimeSec(Integer stoppedTimeSec) {
        this.stoppedTimeSec = stoppedTimeSec;
    }

    public Integer getMinHr() {
        return minHr;
    }

    public void setMinHr(Integer minHr) {
        this.minHr = minHr;
    }

    public Double getVariabilityIndex() {
        return variabilityIndex;
    }

    public void setVariabilityIndex(Double variabilityIndex) {
        this.variabilityIndex = variabilityIndex;
    }

    public Double getEfficiencyFactor() {
        return efficiencyFactor;
    }

    public void setEfficiencyFactor(Double efficiencyFactor) {
        this.efficiencyFactor = efficiencyFactor;
    }

    public Double getPwHr() {
        return pwHr;
    }

    public void setPwHr(Double pwHr) {
        this.pwHr = pwHr;
    }

    public Double getPaHr() {
        return paHr;
    }

    public void setPaHr(Double paHr) {
        this.paHr = paHr;
    }

    public Double getWattsPerKg() {
        return wattsPerKg;
    }

    public void setWattsPerKg(Double wattsPerKg) {
        this.wattsPerKg = wattsPerKg;
    }

    public Integer getMaxPaceSecPerKm() {
        return maxPaceSecPerKm;
    }

    public void setMaxPaceSecPerKm(Integer maxPaceSecPerKm) {
        this.maxPaceSecPerKm = maxPaceSecPerKm;
    }

    public Integer getMinPaceSecPerKm() {
        return minPaceSecPerKm;
    }

    public void setMinPaceSecPerKm(Integer minPaceSecPerKm) {
        this.minPaceSecPerKm = minPaceSecPerKm;
    }

    public Integer getNormalizedGradedPaceSecPerKm() {
        return normalizedGradedPaceSecPerKm;
    }

    public void setNormalizedGradedPaceSecPerKm(Integer normalizedGradedPaceSecPerKm) {
        this.normalizedGradedPaceSecPerKm = normalizedGradedPaceSecPerKm;
    }

    public Integer getElevationLossM() {
        return elevationLossM;
    }

    public void setElevationLossM(Integer elevationLossM) {
        this.elevationLossM = elevationLossM;
    }

    public Integer getAltitudeMaxM() {
        return altitudeMaxM;
    }

    public void setAltitudeMaxM(Integer altitudeMaxM) {
        this.altitudeMaxM = altitudeMaxM;
    }

    public Integer getAltitudeAvgM() {
        return altitudeAvgM;
    }

    public void setAltitudeAvgM(Integer altitudeAvgM) {
        this.altitudeAvgM = altitudeAvgM;
    }

    public Integer getAltitudeMinM() {
        return altitudeMinM;
    }

    public void setAltitudeMinM(Integer altitudeMinM) {
        this.altitudeMinM = altitudeMinM;
    }

    public Integer getCadenceMax() {
        return cadenceMax;
    }

    public void setCadenceMax(Integer cadenceMax) {
        this.cadenceMax = cadenceMax;
    }

    public Integer getCadenceAvg() {
        return cadenceAvg;
    }

    public void setCadenceAvg(Integer cadenceAvg) {
        this.cadenceAvg = cadenceAvg;
    }

    public Integer getCadenceMin() {
        return cadenceMin;
    }

    public void setCadenceMin(Integer cadenceMin) {
        this.cadenceMin = cadenceMin;
    }

    public String getTssType() {
        return tssType;
    }

    public void setTssType(String tssType) {
        this.tssType = tssType;
    }

    public Integer getDeviceLaps() {
        return deviceLaps;
    }

    public void setDeviceLaps(Integer deviceLaps) {
        this.deviceLaps = deviceLaps;
    }

    public Integer getUserLaps() {
        return userLaps;
    }

    public void setUserLaps(Integer userLaps) {
        this.userLaps = userLaps;
    }

    public Integer getClimbLaps() {
        return climbLaps;
    }

    public void setClimbLaps(Integer climbLaps) {
        this.climbLaps = climbLaps;
    }

    public Integer getIntervalLaps() {
        return intervalLaps;
    }

    public void setIntervalLaps(Integer intervalLaps) {
        this.intervalLaps = intervalLaps;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
