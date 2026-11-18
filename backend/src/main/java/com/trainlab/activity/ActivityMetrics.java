package com.trainlab.activity;

/**
 * Métricas resumidas resultantes do processamento de um arquivo importado (SPEC 12.2 +
 * complemento de análise: VI, EF, Pw:Hr, Pa:Hr, W/kg, NGP, estatísticas de altitude, cadência
 * e FC, perda de elevação e contagem de laps).
 */
public record ActivityMetrics(
        int durationSec,
        int movingTimeSec,
        int stoppedTimeSec,
        int distanceM,
        Integer avgHr,
        Integer maxHr,
        Integer minHr,
        Integer avgPower,
        Integer maxPower,
        Integer normalizedPower,
        Integer avgPaceSecPerKm,
        Integer maxPaceSecPerKm,
        Integer minPaceSecPerKm,
        Integer normalizedGradedPaceSecPerKm,
        int elevationGainM,
        int elevationLossM,
        Integer altitudeMaxM,
        Integer altitudeAvgM,
        Integer altitudeMinM,
        Integer cadenceMax,
        Integer cadenceAvg,
        Integer cadenceMin,
        int calories,
        Integer tss,
        Double intensityFactor,
        Double variabilityIndex,
        Double efficiencyFactor,
        Double pwHr,
        Double paHr,
        Double wattsPerKg,
        String tssType
) {
}
