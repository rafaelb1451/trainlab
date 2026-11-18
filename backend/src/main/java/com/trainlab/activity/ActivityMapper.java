package com.trainlab.activity;

import org.springframework.stereotype.Component;

import java.util.List;

/** Conversão das entidades de atividade para os DTOs públicos da API. */
@Component
public class ActivityMapper {

    public ActivityDtos.ActivitySummary toSummary(Activity activity, String athleteName) {
        return toSummary(activity, athleteName, null);
    }

    /**
     * Quando {@code metrics} é informado (endpoint de análise recalcula na hora), os valores
     * calculados têm prioridade sobre os persistidos; os metadados da atividade continuam
     * vindo da entidade.
     */
    public ActivityDtos.ActivitySummary toSummary(Activity activity, String athleteName,
                                                  ActivityMetrics metrics) {
        ActivityMetrics m = metrics;
        return new ActivityDtos.ActivitySummary(activity.getId(), activity.getAthleteId(), athleteName,
                activity.getPlannedWorkoutId(), activity.getName(), activity.getSport(),
                activity.getStartTime(),
                m != null ? m.durationSec() : value(activity.getDurationSec()),
                m != null ? m.movingTimeSec() : value(activity.getMovingTimeSec()),
                m != null ? m.stoppedTimeSec() : activity.getStoppedTimeSec(),
                m != null ? m.distanceM() : activity.getDistanceM(),
                m != null ? m.avgHr() : activity.getAvgHr(),
                m != null ? m.maxHr() : activity.getMaxHr(),
                m != null ? m.minHr() : activity.getMinHr(),
                m != null ? m.avgPower() : activity.getAvgPower(),
                m != null ? m.maxPower() : activity.getMaxPower(),
                m != null ? m.normalizedPower() : activity.getNormalizedPower(),
                m != null ? m.variabilityIndex() : activity.getVariabilityIndex(),
                m != null ? m.efficiencyFactor() : activity.getEfficiencyFactor(),
                m != null ? m.pwHr() : activity.getPwHr(),
                m != null ? m.paHr() : activity.getPaHr(),
                m != null ? m.wattsPerKg() : activity.getWattsPerKg(),
                m != null ? m.avgPaceSecPerKm() : activity.getAvgPaceSecPerKm(),
                m != null ? m.maxPaceSecPerKm() : activity.getMaxPaceSecPerKm(),
                m != null ? m.minPaceSecPerKm() : activity.getMinPaceSecPerKm(),
                m != null ? m.normalizedGradedPaceSecPerKm()
                        : activity.getNormalizedGradedPaceSecPerKm(),
                m != null ? m.elevationGainM() : activity.getElevationGainM(),
                m != null ? m.elevationLossM() : activity.getElevationLossM(),
                m != null ? m.altitudeMaxM() : activity.getAltitudeMaxM(),
                m != null ? m.altitudeAvgM() : activity.getAltitudeAvgM(),
                m != null ? m.altitudeMinM() : activity.getAltitudeMinM(),
                m != null ? m.cadenceMax() : activity.getCadenceMax(),
                m != null ? m.cadenceAvg() : activity.getCadenceAvg(),
                m != null ? m.cadenceMin() : activity.getCadenceMin(),
                m != null ? m.calories() : activity.getCalories(),
                m != null ? m.tss() : activity.getTss(),
                m != null ? m.tssType() : activity.getTssType(),
                m != null ? m.intensityFactor() : activity.getIntensityFactor(),
                activity.getSource(), activity.getFileName(),
                value(activity.getDeviceLaps()), value(activity.getUserLaps()),
                value(activity.getClimbLaps()), value(activity.getIntervalLaps()),
                activity.getCreatedAt());
    }

    public ActivityDtos.ActivityDetail toDetail(Activity activity, String athleteName,
                                                List<ActivityLap> laps,
                                                List<ActivitySample> samples) {
        return new ActivityDtos.ActivityDetail(activity.getId(), activity.getAthleteId(), athleteName,
                activity.getPlannedWorkoutId(), activity.getName(), activity.getSport(),
                activity.getStartTime(), value(activity.getDurationSec()),
                value(activity.getMovingTimeSec()), activity.getStoppedTimeSec(),
                activity.getDistanceM(), activity.getAvgHr(), activity.getMaxHr(),
                activity.getMinHr(), activity.getAvgPower(), activity.getMaxPower(),
                activity.getNormalizedPower(), activity.getVariabilityIndex(),
                activity.getEfficiencyFactor(), activity.getPwHr(), activity.getPaHr(),
                activity.getWattsPerKg(), activity.getAvgPaceSecPerKm(),
                activity.getMaxPaceSecPerKm(), activity.getMinPaceSecPerKm(),
                activity.getNormalizedGradedPaceSecPerKm(), activity.getElevationGainM(),
                activity.getElevationLossM(), activity.getAltitudeMaxM(), activity.getAltitudeAvgM(),
                activity.getAltitudeMinM(), activity.getCadenceMax(), activity.getCadenceAvg(),
                activity.getCadenceMin(), activity.getCalories(), activity.getTss(),
                activity.getTssType(), activity.getIntensityFactor(), activity.getSource(),
                activity.getFileName(), activity.getNotes(), value(activity.getDeviceLaps()),
                value(activity.getUserLaps()), value(activity.getClimbLaps()),
                value(activity.getIntervalLaps()),
                activity.getCreatedAt(),
                laps.stream().map(this::toLapDto).toList(),
                samples.stream().map(this::toSampleDto).toList());
    }

    public ActivityDtos.ActivityLapDto toLapDto(ActivityLap lap) {
        return new ActivityDtos.ActivityLapDto(value(lap.getLapIndex()), value(lap.getDurationSec()),
                lap.getDistanceM(), lap.getAvgHr(), lap.getMaxHr(), lap.getAvgPower(),
                lap.getPaceSecPerKm());
    }

    public ActivityDtos.ActivitySampleDto toSampleDto(ActivitySample sample) {
        return new ActivityDtos.ActivitySampleDto(value(sample.getOffsetSec()), sample.getDistanceM(),
                sample.getHr(), sample.getSpeedMps(), sample.getPower(), sample.getCadence(),
                sample.getElevationM(), sample.getLat(), sample.getLon());
    }

    private int value(Integer value) {
        return value == null ? 0 : value;
    }

    private long value(Long value) {
        return value == null ? 0L : value;
    }
}
