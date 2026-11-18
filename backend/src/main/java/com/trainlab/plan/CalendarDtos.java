package com.trainlab.plan;

import com.trainlab.workout.Sport;
import com.trainlab.workout.WorkoutType;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Contrato do calendário mensal da v3 (SPEC 9.1): dias com métricas e sessões,
 * semanas com carga planejada e CTL/ATL/TSB.
 */
public final class CalendarDtos {

    private CalendarDtos() {
    }

    public record CalendarResponse(
            UUID athleteId,
            LocalDate from,
            LocalDate to,
            List<CalendarDay> days,
            List<CalendarWeek> weeks
    ) {
    }

    public record CalendarDay(
            LocalDate date,
            CalendarMetric metrics,
            List<CalendarSession> sessions
    ) {
    }

    public record CalendarMetric(
            Double sleepHours,
            Integer hrv,
            Integer restingHr,
            Integer bodyBatteryLow,
            Integer bodyBatteryHigh,
            Integer stressLevel,
            Integer mood,
            Integer rpe
    ) {
    }

    public record CalendarSession(
            UUID id,
            LocalDate scheduledDate,
            PlannedStatus status,
            CalendarWorkout workout
    ) {
    }

    public record CalendarWorkout(
            UUID id,
            String name,
            Sport sport,
            WorkoutType type,
            String description,
            Integer estimatedDurationSec,
            Integer estimatedTss,
            Integer estimatedDistanceM
    ) {
    }

    public record CalendarWeek(
            LocalDate weekStart,
            Integer plannedMinutes,
            Integer plannedTss,
            Integer plannedSessions,
            Integer ctl,
            Integer atl,
            Integer tsb
    ) {
    }
}
