package com.trainlab.analytics;

import com.trainlab.workout.Sport;
import com.trainlab.workout.ZoneType;

import java.time.LocalDate;
import java.util.List;

/**
 * Contrato do painel de análises (SPEC 10.1): totais planejados, séries semanais, PMC diário,
 * tempo em zonas, métricas diárias, distribuição por esporte e recordes de treino planejado.
 */
public final class AnalyticsDtos {

    private AnalyticsDtos() {
    }

    public record AnalyticsResponse(
            LocalDate from,
            LocalDate to,
            Totals totals,
            List<WeeklyPoint> weekly,
            List<PmcPoint> pmc,
            List<ZonePoint> zones,
            List<MetricPoint> metricsSeries,
            List<SportPoint> sportDistribution,
            Records records
    ) {
    }

    public record Totals(
            int plannedSessions,
            int plannedMinutes,
            int plannedTss,
            int plannedDistanceM,
            int completedSessions,
            int completedMinutes,
            int completedTss,
            Double compliancePct
    ) {
    }

    public record WeeklyPoint(
            LocalDate weekStart,
            int plannedMinutes,
            int plannedTss,
            int plannedDistanceM,
            int completedTss
    ) {
    }

    public record PmcPoint(
            LocalDate date,
            int ctl,
            int atl,
            int tsb
    ) {
    }

    public record ZonePoint(
            Sport sport,
            ZoneType type,
            int zoneNumber,
            int seconds,
            int sessions
    ) {
    }

    public record MetricPoint(
            LocalDate date,
            Double sleepHours,
            Integer hrv,
            Integer restingHr,
            Double weightKg,
            Integer mood,
            Integer rpe
    ) {
    }

    public record SportPoint(
            Sport sport,
            int sessions,
            int minutes
    ) {
    }

    public record Records(
            int longestDurationSec,
            String longestDurationWorkout,
            int longestDistanceM,
            String longestDistanceWorkout
    ) {
    }
}
