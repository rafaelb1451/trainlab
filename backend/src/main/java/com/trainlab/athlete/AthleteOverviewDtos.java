package com.trainlab.athlete;

import com.trainlab.plan.PlannedStatus;
import com.trainlab.workout.Sport;
import com.trainlab.workout.WorkoutType;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class AthleteOverviewDtos {

    private AthleteOverviewDtos() {
    }

    public record AthleteOverview(
            AthleteDtos.AthleteDetail athlete,
            List<AthleteDtos.ThresholdDto> thresholds,
            List<AthleteDtos.ZoneDto> zones,
            List<UpcomingSession> upcoming,
            WeeklyLoad weeklyLoad,
            MetricDtos.DailyMetricDto latestMetric,
            List<MetricDtos.DailyMetricDto> last7Metrics
    ) {
    }

    public record UpcomingSession(
            UUID id,
            LocalDate scheduledDate,
            PlannedStatus status,
            UpcomingWorkout workout
    ) {
    }

    public record UpcomingWorkout(
            UUID id,
            String name,
            Sport sport,
            WorkoutType type,
            Integer estimatedDurationSec
    ) {
    }

    public record WeeklyLoad(
            Integer plannedMinutes,
            Integer plannedSessions
    ) {
    }
}
