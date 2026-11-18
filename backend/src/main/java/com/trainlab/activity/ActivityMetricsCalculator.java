package com.trainlab.activity;

import com.trainlab.activity.ActivitySampleNormalizer.ActivityPoint;
import com.trainlab.athlete.SportThreshold;
import com.trainlab.common.TrainingStressCalculator;
import com.trainlab.workout.Sport;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Calculadora das métricas resumidas de uma atividade importada (SPEC 12.2 + complemento da
 * tela de análise).
 *
 * <p>Decisões relevantes:</p>
 * <ul>
 *   <li>{@code durationSec} = último offset - primeiro offset; {@code stoppedTimeSec} =
 *       duração - tempo em movimento;</li>
 *   <li>{@code movingTimeSec} exclui apenas intervalos maiores que 30 s sem deslocamento
 *       (distância &lt; 1 m e velocidade &lt; 0,5 m/s), como manda a SPEC;</li>
 *   <li>potência normalizada = média móvel de 30 s elevada à 4ª potência, média e raiz 4ª;</li>
 *   <li>NGP (corrida) = pace equivalente no plano, normalizado pela mesma janela de 30 s,
 *       ajustando a velocidade pelo gradiente (elevação/distância);</li>
 *   <li>Pw:Hr e Pa:Hr usam a diferença percentual das razões potência/FC e velocidade/FC entre
 *       a primeira e a segunda metade do tempo em movimento;</li>
 *   <li>calorias: usa as do arquivo quando existem; senão estimativa MET por esporte;</li>
 *   <li>IF/TSS: potência/FTP quando há potência e FTP; senão FC/LTHR; senão pace/limiar.</li>
 * </ul>
 */
@Component
public class ActivityMetricsCalculator {

    private static final int NORMALIZED_POWER_WINDOW_SEC = 30;
    private static final int PAUSE_GAP_SEC = 30;
    private static final double MET_RUN = 9.8;
    private static final double MET_BIKE = 8.0;
    private static final double MET_SWIM = 7.0;
    private static final double DEFAULT_WEIGHT_KG = 70.0;
    /** Fator de ajuste de velocidade por gradiente usado no NGP (uphill acelera o pace plano). */
    private static final double GRADE_FACTOR = 2.5;
    private static final double MAX_GRADE = 0.30;

    public ActivityMetrics calculate(Sport sport, List<ParsedActivity.ParsedSample> samples,
                                     Integer fileCalories, Double weightKg,
                                     SportThreshold threshold) {
        List<ActivityPoint> points = ActivitySampleNormalizer.normalize(samples);
        if (points.isEmpty()) {
            return emptyMetrics();
        }
        long first = points.get(0).offsetSec();
        long last = points.get(points.size() - 1).offsetSec();
        int duration = (int) Math.max(0, last - first);
        int moving = movingTimeSec(points);
        if (moving <= 0 && duration > 0) {
            // Arquivo sem deslocamento detectável (ex.: rolo): não zera uma atividade válida.
            moving = duration;
        }
        int stopped = Math.max(0, duration - moving);
        int distanceM = (int) Math.round(points.get(points.size() - 1).distanceM());

        Integer avgHr = averageHr(points);
        Integer maxHr = maxHr(points);
        Integer minHr = minHr(points);
        Integer avgPower = averagePower(points);
        Integer maxPower = maxPower(points);
        Integer normalizedPower = normalizedPower(points, duration);
        int elevationGain = elevationGain(points);
        int elevationLoss = elevationLoss(points);
        Integer altitudeMax = intStat(points, true, true, false);
        Integer altitudeAvg = intStat(points, true, false, false);
        Integer altitudeMin = intStat(points, true, false, true);
        Integer cadenceMax = intStat(points, false, true, false);
        Integer cadenceAvg = intStat(points, false, false, false);
        Integer cadenceMin = intStat(points, false, false, true);
        PaceStats paceStats = paceStats(points);

        int effectiveMoving = moving > 0 ? moving : duration;
        Integer avgPace = distanceM > 0
                ? (int) Math.round(effectiveMoving * 1000.0 / distanceM) : null;
        Integer ngp = sport == Sport.RUN
                ? normalizedGradedPace(points, duration, avgPace) : null;
        int calories = calories(sport, fileCalories, effectiveMoving, weightKg);
        Double intensityFactor = intensityFactor(sport, threshold, avgHr, normalizedPower,
                avgPower, avgPace);
        Integer tss = TrainingStressCalculator.tss(effectiveMoving, intensityFactor);

        Double variabilityIndex = ratio(normalizedPower, avgPower);
        Double efficiencyFactor = ratio(normalizedPower, avgHr);
        Double wattsPerKg = normalizedPower == null || weightKg == null || weightKg <= 0
                ? null : TrainingStressCalculator.round(normalizedPower / weightKg, 2);
        Double pwHr = decoupling(points, duration, true);
        Double paHr = decoupling(points, duration, false);

        return new ActivityMetrics(duration, moving, stopped, distanceM, avgHr, maxHr, minHr,
                avgPower, maxPower, normalizedPower, avgPace, paceStats.max(), paceStats.min(),
                ngp, elevationGain, elevationLoss, altitudeMax, altitudeAvg, altitudeMin,
                cadenceMax, cadenceAvg, cadenceMin, calories, tss,
                intensityFactor == null ? null : TrainingStressCalculator.round(intensityFactor, 3),
                variabilityIndex, efficiencyFactor, pwHr, paHr, wattsPerKg, tssType(sport));
    }

    private ActivityMetrics emptyMetrics() {
        return new ActivityMetrics(0, 0, 0, 0, null, null, null, null, null, null, null,
                null, null, null, 0, 0, null, null, null, null, null, null, 0, null, null,
                null, null, null, null, null, null);
    }

    /**
     * Tempo em movimento: intervalos parados são agrupados em uma "pausa" contínua; pausas com
     * mais de 30 s são excluídas. Isso captura tanto um gap grande no arquivo quanto uma parada
     * longa amostrada a cada poucos segundos (sem posição/velocidade).
     */
    private int movingTimeSec(List<ActivityPoint> points) {
        long moving = 0;
        long stoppedRun = 0;
        for (int i = 0; i < points.size() - 1; i++) {
            ActivityPoint current = points.get(i);
            ActivityPoint next = points.get(i + 1);
            long delta = next.offsetSec() - current.offsetSec();
            if (delta <= 0) {
                continue;
            }
            double deltaDistance = next.distanceM() - current.distanceM();
            double speed = next.speedMps() == null ? 0.0 : next.speedMps();
            boolean moved = deltaDistance >= 1.0 || speed >= 0.5
                    || deltaDistance / delta >= 0.5;
            if (!moved) {
                stoppedRun += delta;
                continue;
            }
            if (stoppedRun <= PAUSE_GAP_SEC) {
                moving += stoppedRun;
            }
            stoppedRun = 0;
            moving += delta;
        }
        if (stoppedRun > 0 && stoppedRun <= PAUSE_GAP_SEC) {
            moving += stoppedRun;
        }
        return (int) Math.max(0, moving);
    }

    private Integer averageHr(List<ActivityPoint> points) {
        double weighted = 0;
        long covered = 0;
        double simple = 0;
        int count = 0;
        for (int i = 0; i < points.size(); i++) {
            ActivityPoint point = points.get(i);
            if (point.hr() == null) {
                continue;
            }
            simple += point.hr();
            count++;
            if (i < points.size() - 1) {
                long delta = points.get(i + 1).offsetSec() - point.offsetSec();
                if (delta > 0) {
                    weighted += point.hr() * delta;
                    covered += delta;
                }
            }
        }
        if (count == 0) {
            return null;
        }
        double average = covered > 0 ? weighted / covered : simple / count;
        return (int) Math.round(average);
    }

    private Integer maxHr(List<ActivityPoint> points) {
        return points.stream().map(ActivityPoint::hr).filter(value -> value != null)
                .max(Integer::compareTo).orElse(null);
    }

    private Integer minHr(List<ActivityPoint> points) {
        return points.stream().map(ActivityPoint::hr).filter(value -> value != null)
                .min(Integer::compareTo).orElse(null);
    }

    private Integer averagePower(List<ActivityPoint> points) {
        long sum = 0;
        int count = 0;
        for (ActivityPoint point : points) {
            if (point.power() != null) {
                sum += point.power();
                count++;
            }
        }
        return count == 0 ? null : (int) Math.round(sum / (double) count);
    }

    private Integer maxPower(List<ActivityPoint> points) {
        return points.stream().map(ActivityPoint::power).filter(value -> value != null)
                .max(Integer::compareTo).orElse(null);
    }

    /**
     * Normalized Power: reamostra a potência segundo a segundo (forward-fill), calcula a média
     * móvel de 30 s, eleva cada média à 4ª potência, tira a média e a raiz 4ª.
     */
    private Integer normalizedPower(List<ActivityPoint> points, int duration) {
        if (duration < NORMALIZED_POWER_WINDOW_SEC) {
            return averagePower(points);
        }
        boolean hasPower = points.stream().anyMatch(point -> point.power() != null);
        if (!hasPower) {
            return null;
        }
        double[] perSecond = new double[duration];
        int index = 0;
        Integer current = null;
        for (int second = 0; second < duration; second++) {
            while (index + 1 < points.size() && points.get(index + 1).offsetSec() <= second) {
                index++;
            }
            Integer power = points.get(index).power();
            if (power != null) {
                current = power;
            }
            perSecond[second] = current == null ? 0.0 : current;
        }
        double windowSum = 0.0;
        double fourthPowerSum = 0.0;
        int windows = 0;
        for (int second = 0; second < duration; second++) {
            windowSum += perSecond[second];
            if (second >= NORMALIZED_POWER_WINDOW_SEC) {
                windowSum -= perSecond[second - NORMALIZED_POWER_WINDOW_SEC];
            }
            if (second >= NORMALIZED_POWER_WINDOW_SEC - 1) {
                double average = windowSum / NORMALIZED_POWER_WINDOW_SEC;
                fourthPowerSum += Math.pow(average, 4);
                windows++;
            }
        }
        if (windows == 0) {
            return averagePower(points);
        }
        return (int) Math.round(Math.pow(fourthPowerSum / windows, 0.25));
    }

    /**
     * NGP: ajusta cada intervalo pela inclinação (elevação/distância) e normaliza a velocidade
     * ajustada na mesma janela de 30 s usada no NP; o resultado é convertido de volta em pace.
     * Sem dados de elevação, o percurso é tratado como plano e o NGP é o pace médio.
     */
    private Integer normalizedGradedPace(List<ActivityPoint> points, int duration,
                                          Integer avgPace) {
        boolean hasElevation = points.stream().anyMatch(point -> point.elevationM() != null);
        if (!hasElevation) {
            return avgPace;
        }
        if (duration < 1) {
            return avgPace;
        }
        double[] perSecond = new double[duration];
        double lastAdjusted = 0.0;
        for (int i = 0; i < points.size() - 1; i++) {
            ActivityPoint from = points.get(i);
            ActivityPoint to = points.get(i + 1);
            long delta = to.offsetSec() - from.offsetSec();
            double distance = to.distanceM() - from.distanceM();
            if (delta <= 0 || distance <= 0.3) {
                continue;
            }
            double speed = distance / delta;
            double grade = 0.0;
            if (from.elevationM() != null && to.elevationM() != null) {
                grade = Math.max(-MAX_GRADE,
                        Math.min(MAX_GRADE, (to.elevationM() - from.elevationM()) / distance));
            }
            double adjusted = Math.max(0.1, speed * (1.0 + GRADE_FACTOR * grade));
            lastAdjusted = adjusted;
            long fromSecond = Math.max(0, from.offsetSec());
            long toSecond = Math.min(duration, to.offsetSec());
            for (long second = fromSecond; second < toSecond; second++) {
                perSecond[(int) second] = adjusted;
            }
        }
        boolean hasData = false;
        for (double value : perSecond) {
            if (value > 0) {
                hasData = true;
                break;
            }
        }
        if (!hasData) {
            return avgPace;
        }
        if (duration < NORMALIZED_POWER_WINDOW_SEC) {
            double sum = 0;
            int count = 0;
            for (double value : perSecond) {
                if (value > 0) {
                    sum += value;
                    count++;
                }
            }
            return count == 0 ? avgPace : (int) Math.round(1000.0 / (sum / count));
        }
        double windowSum = 0.0;
        double fourthPowerSum = 0.0;
        int windows = 0;
        double last = lastAdjusted > 0 ? lastAdjusted : 0.1;
        for (int second = 0; second < duration; second++) {
            if (perSecond[second] > 0) {
                last = perSecond[second];
            }
            perSecond[second] = last;
            windowSum += perSecond[second];
            if (second >= NORMALIZED_POWER_WINDOW_SEC) {
                windowSum -= perSecond[second - NORMALIZED_POWER_WINDOW_SEC];
            }
            if (second >= NORMALIZED_POWER_WINDOW_SEC - 1) {
                double average = windowSum / NORMALIZED_POWER_WINDOW_SEC;
                fourthPowerSum += Math.pow(average, 4);
                windows++;
            }
        }
        if (windows == 0) {
            return avgPace;
        }
        double normalizedSpeed = Math.pow(fourthPowerSum / windows, 0.25);
        return normalizedSpeed <= 0 ? avgPace : (int) Math.round(1000.0 / normalizedSpeed);
    }

    private PaceStats paceStats(List<ActivityPoint> points) {
        int max = Integer.MIN_VALUE;
        int min = Integer.MAX_VALUE;
        for (int i = 0; i < points.size() - 1; i++) {
            ActivityPoint from = points.get(i);
            ActivityPoint to = points.get(i + 1);
            long delta = to.offsetSec() - from.offsetSec();
            double distance = to.distanceM() - from.distanceM();
            if (delta < 1 || distance < 0.5) {
                continue;
            }
            int pace = (int) Math.round(1000.0 * delta / distance);
            // Descarta extremos absurdos (paradas/ruído de GPS) mantendo o pace plausível.
            if (pace < 30 || pace > 3600) {
                continue;
            }
            max = Math.max(max, pace);
            min = Math.min(min, pace);
        }
        if (max == Integer.MIN_VALUE) {
            return new PaceStats(null, null);
        }
        return new PaceStats(max, min);
    }

    private int elevationGain(List<ActivityPoint> points) {
        double gain = 0.0;
        Double previous = null;
        for (ActivityPoint point : points) {
            if (point.elevationM() == null) {
                continue;
            }
            if (previous != null && point.elevationM() > previous) {
                gain += point.elevationM() - previous;
            }
            previous = point.elevationM();
        }
        return (int) Math.round(gain);
    }

    private int elevationLoss(List<ActivityPoint> points) {
        double loss = 0.0;
        Double previous = null;
        for (ActivityPoint point : points) {
            if (point.elevationM() == null) {
                continue;
            }
            if (previous != null && point.elevationM() < previous) {
                loss += previous - point.elevationM();
            }
            previous = point.elevationM();
        }
        return (int) Math.round(loss);
    }

    /** max/min/avg de altitude (elevation=true) ou cadência (elevation=false). */
    private Integer intStat(List<ActivityPoint> points, boolean elevation, boolean max,
                            boolean min) {
        Double best = null;
        double sum = 0;
        int count = 0;
        for (ActivityPoint point : points) {
            Double value = elevation ? point.elevationM()
                    : point.cadence() == null ? null : point.cadence().doubleValue();
            if (value == null) {
                continue;
            }
            if (max) {
                best = best == null ? value : Math.max(best, value);
            } else if (min) {
                best = best == null ? value : Math.min(best, value);
            } else {
                sum += value;
                count++;
            }
        }
        if (max || min) {
            return best == null ? null : (int) Math.round(best);
        }
        return count == 0 ? null : (int) Math.round(sum / count);
    }

    /**
     * Desacoplamento entre as metades. Pw:Hr usa potência/FC; Pa:Hr usa velocidade/FC. O valor
     * é percentual: positivo indica que a FC subiu (ou a eficiência caiu) na segunda metade.
     */
    private Double decoupling(List<ActivityPoint> points, int duration, boolean powerBased) {
        if (duration <= 0) {
            return null;
        }
        long first = points.get(0).offsetSec();
        long midpoint = first + duration / 2;
        double power1 = 0;
        long powerTime1 = 0;
        double power2 = 0;
        long powerTime2 = 0;
        double hr1 = 0;
        long hrTime1 = 0;
        double hr2 = 0;
        long hrTime2 = 0;
        double distance1 = 0;
        long time1 = 0;
        double distance2 = 0;
        long time2 = 0;
        for (int i = 0; i < points.size() - 1; i++) {
            ActivityPoint from = points.get(i);
            ActivityPoint to = points.get(i + 1);
            long delta = to.offsetSec() - from.offsetSec();
            if (delta <= 0) {
                continue;
            }
            boolean firstHalf = from.offsetSec() < midpoint;
            double distance = to.distanceM() - from.distanceM();
            if (firstHalf) {
                time1 += delta;
                distance1 += distance;
            } else {
                time2 += delta;
                distance2 += distance;
            }
            if (from.power() != null) {
                if (firstHalf) {
                    power1 += from.power() * delta;
                    powerTime1 += delta;
                } else {
                    power2 += from.power() * delta;
                    powerTime2 += delta;
                }
            }
            if (from.hr() != null) {
                if (firstHalf) {
                    hr1 += from.hr() * delta;
                    hrTime1 += delta;
                } else {
                    hr2 += from.hr() * delta;
                    hrTime2 += delta;
                }
            }
        }
        if (powerBased) {
            if (powerTime1 <= 0 || powerTime2 <= 0 || hrTime1 <= 0 || hrTime2 <= 0) {
                return null;
            }
            double ratio1 = (power1 / powerTime1) / (hr1 / hrTime1);
            double ratio2 = (power2 / powerTime2) / (hr2 / hrTime2);
            return decouplingPercent(ratio1, ratio2);
        }
        if (time1 <= 0 || time2 <= 0 || hrTime1 <= 0 || hrTime2 <= 0) {
            return null;
        }
        double speed1 = distance1 / time1;
        double speed2 = distance2 / time2;
        double ratio1 = speed1 / (hr1 / hrTime1);
        double ratio2 = speed2 / (hr2 / hrTime2);
        return decouplingPercent(ratio1, ratio2);
    }

    private Double decouplingPercent(double firstRatio, double secondRatio) {
        if (firstRatio <= 0) {
            return null;
        }
        return TrainingStressCalculator.round((firstRatio - secondRatio) / firstRatio * 100.0, 2);
    }

    private Double ratio(Integer numerator, Integer denominator) {
        if (numerator == null || denominator == null || denominator <= 0) {
            return null;
        }
        return TrainingStressCalculator.round(numerator / (double) denominator, 2);
    }

    private int calories(Sport sport, Integer fileCalories, int movingSec, Double weightKg) {
        if (fileCalories != null && fileCalories > 0) {
            return fileCalories;
        }
        double met = switch (sport) {
            case RUN -> MET_RUN;
            case BIKE -> MET_BIKE;
            case SWIM -> MET_SWIM;
        };
        double weight = weightKg == null || weightKg <= 0 ? DEFAULT_WEIGHT_KG : weightKg;
        return (int) Math.round(met * weight * (movingSec / 3600.0));
    }

    private Double intensityFactor(Sport sport, SportThreshold threshold, Integer avgHr,
                                   Integer normalizedPower, Integer avgPower, Integer avgPace) {
        if (threshold != null) {
            Double power = TrainingStressCalculator.powerIntensity(normalizedPower, avgPower,
                    threshold.getFtpWatts());
            if (power != null) {
                return power;
            }
            Double heartRate = TrainingStressCalculator.heartRateIntensity(avgHr,
                    threshold.getLthr(), threshold.getMaxHr());
            if (heartRate != null) {
                return heartRate;
            }
        }
        if (avgPace == null || avgPace <= 0 || threshold == null) {
            return null;
        }
        if (sport == Sport.RUN) {
            return TrainingStressCalculator.paceIntensity(
                    threshold.getThresholdPaceSecPerKm(), avgPace);
        }
        if (sport == Sport.SWIM) {
            int actualPer100m = (int) Math.round(avgPace / 10.0);
            return TrainingStressCalculator.paceIntensity(threshold.getCssSecPer100m(),
                    actualPer100m);
        }
        return null;
    }

    private String tssType(Sport sport) {
        return switch (sport) {
            case RUN -> "rTSS";
            case SWIM -> "sTSS";
            case BIKE -> "TSS";
        };
    }

    private record PaceStats(Integer max, Integer min) {
    }
}
