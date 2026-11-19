package com.trainlab.activity;

import com.trainlab.activity.ParsedActivity.ParsedSample;
import com.trainlab.athlete.SportThreshold;
import com.trainlab.workout.Sport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * Testes da calculadora de metricas de atividade.
 *
 * <p>Sao testes de unidade puros: nenhum contexto Spring, nenhum banco. O objetivo e'
 * travar as formulas que alimentam painel, calendario e a tela de analise — um erro aqui
 * contamina tudo sem dar sintoma.</p>
 */
class ActivityMetricsCalculatorTest {

    private final ActivityMetricsCalculator calculator = new ActivityMetricsCalculator();

    /** Ponto sintetico: so os campos que o teste precisa; o resto fica nulo. */
    private static ParsedSample sample(long offsetSec, double distanceM, Integer hr,
                                       Integer power, Double elevationM, Double speedMps) {
        return new ParsedSample(offsetSec, distanceM, hr, speedMps, power, null, elevationM,
                null, null);
    }

    /** Corrida de 30 min em 5 km, com um ponto a cada 60 s. */
    private static List<ParsedSample> steadyRun() {
        List<ParsedSample> samples = new ArrayList<>();
        for (int t = 0; t <= 1800; t += 60) {
            samples.add(sample(t, 5000.0 * t / 1800.0, 150, null, null, null));
        }
        return samples;
    }

    private static SportThreshold bikeThreshold(int ftp) {
        SportThreshold threshold = new SportThreshold();
        threshold.setSport(Sport.BIKE);
        threshold.setFtpWatts(ftp);
        return threshold;
    }

    @Test
    @DisplayName("arquivo vazio devolve metricas zeradas, sem inventar dados")
    void emptySamples() {
        ActivityMetrics metrics = calculator.calculate(Sport.RUN, List.of(), null, 70.0, null);

        assertThat(metrics.durationSec()).isZero();
        assertThat(metrics.distanceM()).isZero();
        assertThat(metrics.tss()).isNull();
        assertThat(metrics.intensityFactor()).isNull();
        assertThat(metrics.avgHr()).isNull();
    }

    @Nested
    @DisplayName("duracao, distancia e pace")
    class Basics {

        @Test
        @DisplayName("corrida de 30 min em 5 km: 1800 s, 5000 m e pace 6:00/km")
        void durationDistancePace() {
            ActivityMetrics metrics =
                    calculator.calculate(Sport.RUN, steadyRun(), null, 70.0, null);

            assertThat(metrics.durationSec()).isEqualTo(1800);
            assertThat(metrics.movingTimeSec()).isEqualTo(1800);
            assertThat(metrics.stoppedTimeSec()).isZero();
            assertThat(metrics.distanceM()).isEqualTo(5000);
            assertThat(metrics.avgPaceSecPerKm()).isEqualTo(360);
        }

        @Test
        @DisplayName("duracao e o intervalo entre o primeiro e o ultimo ponto")
        void durationIsLastMinusFirst() {
            ActivityMetrics metrics = calculator.calculate(Sport.RUN,
                    List.of(sample(100, 0, null, null, null, null),
                            sample(460, 1500, null, null, null, null)),
                    null, 70.0, null);

            assertThat(metrics.durationSec()).isEqualTo(360);
        }

        @Test
        @DisplayName("media de FC e ponderada pelo tempo de cada ponto")
        void heartRateIsTimeWeighted() {
            List<ParsedSample> samples = List.of(
                    sample(0, 0, 120, null, null, null),
                    sample(600, 2000, 160, null, null, null),
                    sample(1200, 4000, 140, null, null, null));

            ActivityMetrics metrics =
                    calculator.calculate(Sport.RUN, samples, null, 70.0, null);

            // 120*600 + 160*600 + (140 nao cobre intervalo) => 168000/1200 = 140
            assertThat(metrics.avgHr()).isEqualTo(140);
            assertThat(metrics.maxHr()).isEqualTo(160);
            assertThat(metrics.minHr()).isEqualTo(120);
        }
    }

    @Nested
    @DisplayName("tempo em movimento")
    class MovingTime {

        @Test
        @DisplayName("pausa maior que 30 s sai do tempo em movimento")
        void longPauseIsExcluded() {
            List<ParsedSample> samples = List.of(
                    sample(0, 0, null, null, null, null),
                    sample(60, 200, null, null, null, null),
                    sample(120, 400, null, null, null, null),
                    // 180 s parado
                    sample(300, 400, null, null, null, null),
                    sample(360, 600, null, null, null, null));

            ActivityMetrics metrics =
                    calculator.calculate(Sport.RUN, samples, null, 70.0, null);

            assertThat(metrics.durationSec()).isEqualTo(360);
            assertThat(metrics.movingTimeSec()).isEqualTo(180);
            assertThat(metrics.stoppedTimeSec()).isEqualTo(180);
        }

        @Test
        @DisplayName("pausa de ate 30 s continua contando como movimento")
        void shortPauseIsKept() {
            List<ParsedSample> samples = List.of(
                    sample(0, 0, null, null, null, null),
                    sample(60, 200, null, null, null, null),
                    // 30 s parado
                    sample(90, 200, null, null, null, null),
                    sample(150, 400, null, null, null, null));

            ActivityMetrics metrics =
                    calculator.calculate(Sport.RUN, samples, null, 70.0, null);

            assertThat(metrics.movingTimeSec()).isEqualTo(150);
            assertThat(metrics.stoppedTimeSec()).isZero();
        }

        @Test
        @DisplayName("arquivo sem deslocamento (rolo) nao zera o tempo em movimento")
        void noMovementFallsBackToDuration() {
            List<ParsedSample> samples = List.of(
                    sample(0, 0, 140, 200, null, 0.0),
                    sample(120, 0, 145, 200, null, 0.0),
                    sample(240, 0, 150, 200, null, 0.0));

            ActivityMetrics metrics =
                    calculator.calculate(Sport.BIKE, samples, null, 70.0, null);

            assertThat(metrics.movingTimeSec()).isEqualTo(240);
            assertThat(metrics.stoppedTimeSec()).isZero();
        }
    }

    @Nested
    @DisplayName("potencia normalizada e variabilidade")
    class Power {

        private List<ParsedSample> constantRide(int watts, int seconds) {
            List<ParsedSample> samples = new ArrayList<>();
            for (int t = 0; t <= seconds; t++) {
                samples.add(sample(t, 8.0 * t, null, watts, null, 8.0));
            }
            return samples;
        }

        @Test
        @DisplayName("potencia constante: NP igual a media e VI 1,00")
        void constantPowerHasUnitVariability() {
            ActivityMetrics metrics =
                    calculator.calculate(Sport.BIKE, constantRide(250, 600), null, 70.0,
                            bikeThreshold(250));

            assertThat(metrics.avgPower()).isEqualTo(250);
            assertThat(metrics.normalizedPower()).isEqualTo(250);
            assertThat(metrics.variabilityIndex()).isEqualTo(1.0);
        }

        @Test
        @DisplayName("potencia em degraus: NP fica acima da media")
        void variablePowerRaisesNormalizedPower() {
            List<ParsedSample> samples = new ArrayList<>();
            for (int t = 0; t <= 600; t++) {
                int watts = t < 300 ? 100 : 400;
                samples.add(sample(t, 8.0 * t, null, watts, null, 8.0));
            }

            ActivityMetrics metrics =
                    calculator.calculate(Sport.BIKE, samples, null, 70.0, bikeThreshold(250));

            assertThat(metrics.avgPower()).isEqualTo(250);
            assertThat(metrics.normalizedPower()).isGreaterThan(250).isLessThan(400);
            assertThat(metrics.variabilityIndex()).isGreaterThan(1.0);
        }

        @Test
        @DisplayName("esforco menor que 30 s usa a media como NP")
        void shortEffortFallsBackToAverage() {
            List<ParsedSample> samples = new ArrayList<>();
            for (int t = 0; t <= 20; t++) {
                samples.add(sample(t, 10.0 * t, null, 300, null, 10.0));
            }

            ActivityMetrics metrics =
                    calculator.calculate(Sport.BIKE, samples, null, 70.0, bikeThreshold(300));

            assertThat(metrics.normalizedPower()).isEqualTo(300);
        }
    }

    @Nested
    @DisplayName("intensidade e carga")
    class Intensity {

        @Test
        @DisplayName("potencia: IF = NP/FTP e TSS = horas x IF^2 x 100")
        void powerBasedIntensityAndTss() {
            List<ParsedSample> samples = new ArrayList<>();
            for (int t = 0; t <= 3600; t++) {
                samples.add(sample(t, 10.0 * t, null, 200, null, 10.0));
            }

            ActivityMetrics metrics =
                    calculator.calculate(Sport.BIKE, samples, null, 70.0, bikeThreshold(250));

            // 200/250 = 0,8 -> TSS = 1 h x 0,64 x 100 = 64
            assertThat(metrics.intensityFactor()).isCloseTo(0.8, within(0.001));
            assertThat(metrics.tss()).isEqualTo(64);
            assertThat(metrics.tssType()).isEqualTo("TSS");
        }

        @Test
        @DisplayName("sem potencia, usa FC/limiar")
        void heartRateFallback() {
            SportThreshold threshold = new SportThreshold();
            threshold.setSport(Sport.RUN);
            threshold.setLthr(165);

            ActivityMetrics metrics =
                    calculator.calculate(Sport.RUN, steadyRun(), null, 70.0, threshold);

            // 150/165 = 0,909 -> TSS = 0,5 h x 0,826 x 100 = 41
            assertThat(metrics.intensityFactor()).isCloseTo(0.909, within(0.002));
            assertThat(metrics.tss()).isEqualTo(41);
            assertThat(metrics.tssType()).isEqualTo("rTSS");
        }

        @Test
        @DisplayName("sem potencia nem FC, usa pace/limiar")
        void paceFallback() {
            SportThreshold threshold = new SportThreshold();
            threshold.setSport(Sport.RUN);
            threshold.setThresholdPaceSecPerKm(300);

            List<ParsedSample> samples = new ArrayList<>();
            for (int t = 0; t <= 1800; t += 60) {
                samples.add(sample(t, 5000.0 * t / 1800.0, null, null, null, null));
            }

            ActivityMetrics metrics =
                    calculator.calculate(Sport.RUN, samples, null, 70.0, threshold);

            // pace de limiar 300 s/km, realizado 360 s/km -> 0,833
            assertThat(metrics.intensityFactor()).isCloseTo(0.833, within(0.002));
        }

        @Test
        @DisplayName("natação converte pace s/km para s/100 m antes do IF")
        void swimUsesCssPer100m() {
            SportThreshold threshold = new SportThreshold();
            threshold.setSport(Sport.SWIM);
            threshold.setCssSecPer100m(105);

            // 1500 m em 1800 s -> pace 1200 s/km -> 120 s/100 m
            List<ParsedSample> samples = new ArrayList<>();
            for (int t = 0; t <= 1800; t += 60) {
                samples.add(sample(t, 1500.0 * t / 1800.0, null, null, null, null));
            }

            ActivityMetrics metrics =
                    calculator.calculate(Sport.SWIM, samples, null, 70.0, threshold);

            assertThat(metrics.avgPaceSecPerKm()).isEqualTo(1200);
            assertThat(metrics.intensityFactor()).isCloseTo(105 / 120.0, within(0.002));
            assertThat(metrics.tssType()).isEqualTo("sTSS");
        }

        @Test
        @DisplayName("sem limiar nenhum, nao inventa IF nem TSS")
        void noThresholdMeansNoIntensity() {
            ActivityMetrics metrics =
                    calculator.calculate(Sport.RUN, steadyRun(), null, 70.0, null);

            assertThat(metrics.intensityFactor()).isNull();
            assertThat(metrics.tss()).isNull();
        }
    }

    @Nested
    @DisplayName("elevacao, calorias e desacoplamento")
    class Extras {

        @Test
        @DisplayName("ganho e perda de elevacao somam apenas o que sobe e o que desce")
        void elevationGainAndLoss() {
            List<ParsedSample> samples = List.of(
                    sample(0, 0, null, null, 100.0, null),
                    sample(60, 1000, null, null, 130.0, null),
                    sample(120, 2000, null, null, 120.0, null),
                    sample(180, 3000, null, null, 150.0, null));

            ActivityMetrics metrics =
                    calculator.calculate(Sport.RUN, samples, null, 70.0, null);

            assertThat(metrics.elevationGainM()).isEqualTo(60); // 30 + 30
            assertThat(metrics.elevationLossM()).isEqualTo(10);
            assertThat(metrics.altitudeMaxM()).isEqualTo(150);
            assertThat(metrics.altitudeMinM()).isEqualTo(100);
        }

        @Test
        @DisplayName("sem calorias no arquivo, estima por MET do esporte")
        void caloriesFallback() {
            ActivityMetrics metrics =
                    calculator.calculate(Sport.RUN, steadyRun(), null, 70.0, null);

            // run 9,8 MET x 70 kg x 0,5 h = 343
            assertThat(metrics.calories()).isEqualTo(343);
        }

        @Test
        @DisplayName("calorias do arquivo tem prioridade sobre a estimativa")
        void fileCaloriesWin() {
            ActivityMetrics metrics =
                    calculator.calculate(Sport.RUN, steadyRun(), 320, 70.0, null);

            assertThat(metrics.calories()).isEqualTo(320);
        }

        @Test
        @DisplayName("Pw:Hr mede a queda de eficiencia entre as metades")
        void powerHeartRateDecoupling() {
            List<ParsedSample> samples = new ArrayList<>();
            for (int t = 0; t <= 600; t += 30) {
                int hr = t < 300 ? 140 : 150;
                samples.add(sample(t, 10.0 * t, hr, 200, null, 10.0));
            }

            ActivityMetrics metrics =
                    calculator.calculate(Sport.BIKE, samples, null, 70.0, bikeThreshold(250));

            // ratio1 = 200/140 = 1,4286 ; ratio2 = 200/150 = 1,3333 -> 6,67%
            assertThat(metrics.pwHr()).isCloseTo(6.67, within(0.1));
        }
    }
}
