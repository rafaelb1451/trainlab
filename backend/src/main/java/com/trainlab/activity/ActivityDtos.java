package com.trainlab.activity;

import com.trainlab.workout.Sport;
import com.trainlab.workout.ZoneType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Contratos REST da v6 (SPEC 12.2). O bloco de análise segue exatamente os nomes da SPEC:
 * {@code activity, series, zones, laps, splits, planned, comparison}.
 */
public final class ActivityDtos {

    private ActivityDtos() {
    }

    public record ActivitySummary(
            UUID id,
            UUID athleteId,
            String athleteName,
            UUID plannedWorkoutId,
            String name,
            Sport sport,
            Instant startTime,
            int durationSec,
            int movingTimeSec,
            Integer stoppedTimeSec,
            Integer distanceM,
            Integer avgHr,
            Integer maxHr,
            Integer minHr,
            Integer avgPower,
            Integer maxPower,
            Integer normalizedPower,
            Double variabilityIndex,
            Double efficiencyFactor,
            Double pwHr,
            Double paHr,
            Double wattsPerKg,
            Integer avgPaceSecPerKm,
            Integer maxPaceSecPerKm,
            Integer minPaceSecPerKm,
            Integer normalizedGradedPaceSecPerKm,
            Integer elevationGainM,
            Integer elevationLossM,
            Integer altitudeMaxM,
            Integer altitudeAvgM,
            Integer altitudeMinM,
            Integer cadenceMax,
            Integer cadenceAvg,
            Integer cadenceMin,
            Integer calories,
            Integer tss,
            String tssType,
            Double intensityFactor,
            ActivitySource source,
            String fileName,
            Integer deviceLaps,
            Integer userLaps,
            Integer climbLaps,
            Integer intervalLaps,
            Instant createdAt
    ) {
    }

    public record ActivityDetail(
            UUID id,
            UUID athleteId,
            String athleteName,
            UUID plannedWorkoutId,
            String name,
            Sport sport,
            Instant startTime,
            int durationSec,
            int movingTimeSec,
            Integer stoppedTimeSec,
            Integer distanceM,
            Integer avgHr,
            Integer maxHr,
            Integer minHr,
            Integer avgPower,
            Integer maxPower,
            Integer normalizedPower,
            Double variabilityIndex,
            Double efficiencyFactor,
            Double pwHr,
            Double paHr,
            Double wattsPerKg,
            Integer avgPaceSecPerKm,
            Integer maxPaceSecPerKm,
            Integer minPaceSecPerKm,
            Integer normalizedGradedPaceSecPerKm,
            Integer elevationGainM,
            Integer elevationLossM,
            Integer altitudeMaxM,
            Integer altitudeAvgM,
            Integer altitudeMinM,
            Integer cadenceMax,
            Integer cadenceAvg,
            Integer cadenceMin,
            Integer calories,
            Integer tss,
            String tssType,
            Double intensityFactor,
            ActivitySource source,
            String fileName,
            String notes,
            Integer deviceLaps,
            Integer userLaps,
            Integer climbLaps,
            Integer intervalLaps,
            Instant createdAt,
            List<ActivityLapDto> laps,
            List<ActivitySampleDto> samples
    ) {
    }

    public record ActivitySampleDto(
            long offsetSec,
            Double distanceM,
            Integer hr,
            Double speedMps,
            Integer power,
            Integer cadence,
            Double elevationM,
            Double lat,
            Double lon
    ) {
    }

    public record ActivityLapDto(
            int lapIndex,
            int durationSec,
            Double distanceM,
            Integer avgHr,
            Integer maxHr,
            Integer avgPower,
            Integer paceSecPerKm
    ) {
    }

    public record AnalysisResponse(
            ActivitySummary activity,
            List<SeriesPoint> series,
            List<ZonePoint> zones,
            List<LapAnalysis> laps,
            List<SplitPoint> splits,
            PlannedInfo planned,
            Comparison comparison
    ) {
    }

    public record SeriesPoint(
            long tSec,
            Integer hr,
            Integer paceSecPerKm,
            Integer power,
            Integer cadence,
            Double elevationM,
            Integer distanceM
    ) {
    }

    public record ZonePoint(
            ZoneType type,
            int zoneNumber,
            int seconds,
            double pct
    ) {
    }

    public record LapAnalysis(
            int lapIndex,
            int durationSec,
            Integer distanceM,
            Integer avgHr,
            Integer avgPower,
            Integer paceSecPerKm
    ) {
    }

    public record SplitPoint(
            int km,
            int durationSec,
            int paceSecPerKm,
            Integer avgHr,
            int elevationM
    ) {
    }

    public record PlannedInfo(
            String workoutName,
            List<PlannedBlock> blocks,
            Integer estimatedTss,
            Integer plannedDurationSec
    ) {
    }

    public record PlannedBlock(
            String title,
            Integer repeatCount,
            Integer durationSec,
            List<PlannedStep> steps
    ) {
    }

    public record PlannedStep(
            String role,
            String durationType,
            Integer durationSec,
            Integer distanceM,
            String target
    ) {
    }

    public record Comparison(
            Integer durationDeltaSec,
            Integer distanceDeltaM,
            Integer tssDelta,
            Double ifActual,
            String compliance
    ) {
    }
}
