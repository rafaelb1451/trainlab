package com.trainlab.integration;

import com.trainlab.workout.DurationType;
import com.trainlab.workout.StepRole;
import com.trainlab.workout.Target;
import com.trainlab.workout.TargetType;
import com.trainlab.workout.Workout;
import com.trainlab.workout.WorkoutBlock;
import com.trainlab.workout.WorkoutStep;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Testes da traducao do nosso treino para o texto do Intervals.icu.
 *
 * <p>E' o ponto mais fragil da integracao: se o texto nao estiver na gramatica deles, o
 * treino entra no calendario mas <b>nao vira passos estruturados</b> — e o relogio nao recebe
 * nada. Por isso cada formato de duracao e de alvo tem teste.</p>
 */
class IntervalsWorkoutTextTest {

    private static Target target(TargetType type, Integer zone, Integer min, Integer max) {
        return new Target(type, zone, min, max, null, null, null, null);
    }

    private static WorkoutStep step(int seconds, Target target) {
        WorkoutStep step = new WorkoutStep();
        step.setRole(StepRole.ACTIVE);
        step.setDurationType(DurationType.TIME);
        step.setDurationSec(seconds);
        step.setTarget(target);
        return step;
    }

    private static WorkoutStep distanceStep(int meters, Target target) {
        WorkoutStep step = new WorkoutStep();
        step.setRole(StepRole.ACTIVE);
        step.setDurationType(DurationType.DISTANCE);
        step.setDistanceM(meters);
        step.setTarget(target);
        return step;
    }

    private static WorkoutBlock block(String title, int repeats, WorkoutStep... steps) {
        WorkoutBlock block = new WorkoutBlock();
        block.setTitle(title);
        block.setRepeatCount(repeats);
        block.setSteps(new ArrayList<>(List.of(steps)));
        return block;
    }

    @Nested
    @DisplayName("duracao")
    class Duration {

        @Test
        @DisplayName("minutos inteiros, segundos e horas")
        void formats() {
            assertThat(IntervalsWorkoutText.formatSeconds(600)).isEqualTo("10m");
            assertThat(IntervalsWorkoutText.formatSeconds(45)).isEqualTo("45s");
            assertThat(IntervalsWorkoutText.formatSeconds(3600)).isEqualTo("1h");
            assertThat(IntervalsWorkoutText.formatSeconds(5400)).isEqualTo("1h30m");
            assertThat(IntervalsWorkoutText.formatSeconds(3660)).isEqualTo("1h1m");
        }

        @Test
        @DisplayName("passo por distancia vira km ou metros")
        void distance() {
            assertThat(IntervalsWorkoutText.duration(distanceStep(5000, null))).isEqualTo("5km");
            assertThat(IntervalsWorkoutText.duration(distanceStep(1500, null))).isEqualTo("1.5km");
            assertThat(IntervalsWorkoutText.duration(distanceStep(800, null))).isEqualTo("800m");
        }

        @Test
        @DisplayName("passo aberto recebe um piso de 5 min para o relogio nao travar")
        void openStep() {
            WorkoutStep open = new WorkoutStep();
            open.setDurationType(DurationType.OPEN);
            open.setTarget(target(TargetType.FREE, null, null, null));

            assertThat(IntervalsWorkoutText.duration(open)).isEqualTo("5m");
        }
    }

    @Nested
    @DisplayName("alvo")
    class Targets {

        @Test
        @DisplayName("percentual de FTP com faixa")
        void powerPercent() {
            assertThat(IntervalsWorkoutText.target(target(TargetType.POWER_PERCENT, null, 85, null)))
                    .isEqualTo("85% FTP");
            assertThat(IntervalsWorkoutText.target(target(TargetType.POWER_PERCENT, null, 88, 94)))
                    .isEqualTo("88-94% FTP");
        }

        @Test
        @DisplayName("zona numerica, com sufixo do tipo de alvo")
        void zones() {
            assertThat(IntervalsWorkoutText.target(target(TargetType.POWER_ZONE, 2, null, null)))
                    .isEqualTo("Z2");
            assertThat(IntervalsWorkoutText.target(target(TargetType.HR_ZONE, 3, null, null)))
                    .isEqualTo("Z3 HR");
            assertThat(IntervalsWorkoutText.target(target(TargetType.PACE_ZONE, 2, null, null)))
                    .isEqualTo("Z2 Pace");
        }

        @Test
        @DisplayName("pace e FC em percentual")
        void paceAndHrPercent() {
            assertThat(IntervalsWorkoutText.target(target(TargetType.PACE_PERCENT, null, 95, null)))
                    .isEqualTo("95% pace");
            assertThat(IntervalsWorkoutText.target(target(TargetType.HR_PERCENT, null, 80, 85)))
                    .isEqualTo("80-85% HR");
        }

        @Test
        @DisplayName("RPE e livre viram passo livre")
        void freeTargets() {
            assertThat(IntervalsWorkoutText.target(target(TargetType.RPE, null, 7, null)))
                    .isEqualTo("free");
            assertThat(IntervalsWorkoutText.target(target(TargetType.FREE, null, null, null)))
                    .isEqualTo("free");
            assertThat(IntervalsWorkoutText.target(null)).isEqualTo("free");
        }

        @Test
        @DisplayName("zona sem numero nao gera alvo invalido")
        void zoneWithoutNumber() {
            assertThat(IntervalsWorkoutText.target(target(TargetType.POWER_ZONE, null, null, null)))
                    .isEqualTo("free");
        }
    }

    @Nested
    @DisplayName("texto completo")
    class FullText {

        @Test
        @DisplayName("cabecalho juntа titulo e repeticoes")
        void headers() {
            assertThat(IntervalsWorkoutText.header(block("Principal", 3))).isEqualTo("Principal 3x");
            assertThat(IntervalsWorkoutText.header(block("Aquecimento", 1))).isEqualTo("Aquecimento");
            assertThat(IntervalsWorkoutText.header(block(null, 4))).isEqualTo("4x");
            assertThat(IntervalsWorkoutText.header(block("  ", 1))).isEmpty();
        }

        @Test
        @DisplayName("treino com aquecimento, serie repetida e desaquecimento")
        void fullWorkout() {
            Workout workout = new Workout();
            workout.setSport(com.trainlab.workout.Sport.BIKE);
            workout.setBlocks(new ArrayList<>(List.of(
                    block("Aquecimento", 1, step(600, target(TargetType.POWER_PERCENT, null, 60, null))),
                    block("Principal", 3,
                            step(300, target(TargetType.POWER_PERCENT, null, 90, null)),
                            step(180, target(TargetType.POWER_PERCENT, null, 55, null))),
                    block("Desaquecimento", 1, step(600, target(TargetType.POWER_PERCENT, null, 55, null)))
            )));

            String text = IntervalsWorkoutText.toText(workout);

            assertThat(text).isEqualTo("""
                    Aquecimento
                    - 10m 60% FTP

                    Principal 3x
                    - 5m 90% FTP
                    - 3m 55% FTP

                    Desaquecimento
                    - 10m 55% FTP""");
        }

        @Test
        @DisplayName("esporte vira disciplina do Intervals.icu")
        void sportTypes() {
            assertThat(IntervalsWorkoutText.sportType(com.trainlab.workout.Sport.BIKE)).isEqualTo("Ride");
            assertThat(IntervalsWorkoutText.sportType(com.trainlab.workout.Sport.RUN)).isEqualTo("Run");
            assertThat(IntervalsWorkoutText.sportType(com.trainlab.workout.Sport.SWIM)).isEqualTo("Swim");
        }
    }
}
