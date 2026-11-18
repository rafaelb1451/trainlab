package com.trainlab.common;

/**
 * Fórmulas de intensidade e TSS compartilhadas pela importação de atividades (SPEC 12.2).
 * Para potência usamos NP/FTP quando disponível; senão FC/LTHR; senão pace/limiar. O TSS
 * segue a mesma convenção do TSS estimado de um treino (SPEC 9.1): horas × IF² × 100.
 */
public final class TrainingStressCalculator {

    private TrainingStressCalculator() {
    }

    public static Integer tss(int movingTimeSec, Double intensityFactor) {
        if (intensityFactor == null || intensityFactor <= 0 || movingTimeSec <= 0) {
            return null;
        }
        return (int) Math.round((movingTimeSec / 3600.0) * intensityFactor * intensityFactor * 100.0);
    }

    /** Potência: usa a potência normalizada como esforço efetivo, com fallback para a média. */
    public static Double powerIntensity(Integer normalizedPower, Integer avgPower, Integer ftpWatts) {
        Integer effort = normalizedPower != null ? normalizedPower : avgPower;
        if (effort == null || effort <= 0 || ftpWatts == null || ftpWatts <= 0) {
            return null;
        }
        return effort / (double) ftpWatts;
    }

    public static Double heartRateIntensity(Integer avgHr, Integer lthr, Integer maxHr) {
        Integer threshold = lthr;
        if ((threshold == null || threshold <= 0) && maxHr != null && maxHr > 0) {
            threshold = (int) Math.round(maxHr * 0.85);
        }
        if (avgHr == null || avgHr <= 0 || threshold == null || threshold <= 0) {
            return null;
        }
        return avgHr / (double) threshold;
    }

    /**
     * Pace é velocidade invertida: IF = pace de limiar / pace realizado. Para natação o pace
     * deve estar em s/100 m (a atividade guarda s/km; a conversão é feita pelo chamador).
     */
    public static Double paceIntensity(Integer thresholdPaceSecPerUnit, Integer actualPaceSecPerUnit) {
        if (thresholdPaceSecPerUnit == null || thresholdPaceSecPerUnit <= 0
                || actualPaceSecPerUnit == null || actualPaceSecPerUnit <= 0) {
            return null;
        }
        return thresholdPaceSecPerUnit / (double) actualPaceSecPerUnit;
    }

    public static double round(Double value, int decimals) {
        if (value == null) {
            return 0.0;
        }
        double factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }
}
