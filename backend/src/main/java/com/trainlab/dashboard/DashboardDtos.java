package com.trainlab.dashboard;

import com.trainlab.athlete.MetricDtos;
import com.trainlab.workout.Sport;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class DashboardDtos {

    private DashboardDtos() {
    }

    public record DashboardResponse(
            Integer athleteCount,
            Integer workoutCount,
            Integer plannedSessions7d,
            Integer plannedMinutes7d,
            List<RosterEntry> roster
    ) {
    }

    public record RosterEntry(
            UUID athleteId,
            String displayName,
            List<Sport> sports,
            Integer plannedMinutes7d,
            LocalDate nextSessionDate,
            String nextWorkoutName,
            MetricDtos.DailyMetricDto latestMetric
    ) {
    }
}
