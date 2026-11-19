package com.trainlab.integration;

import com.trainlab.workout.DurationType;
import com.trainlab.workout.Sport;
import com.trainlab.workout.Target;
import com.trainlab.workout.TargetType;
import com.trainlab.workout.Workout;
import com.trainlab.workout.WorkoutBlock;
import com.trainlab.workout.WorkoutStep;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Traduz o nosso {@link Workout} para o texto nativo do Intervals.icu.
 *
 * <p>O Intervals.icu so' cria passos estruturados (que descem para o relogio) quando consegue
 * interpretar o texto do campo {@code description}. Por isso o formato aqui e' conservador:
 * uma linha por passo, comecando com {@code "- "}, duracao e alvo percentual/por zona —
 * exatamente o subconjunto documentado no builder deles:</p>
 *
 * <pre>
 * Aquecimento
 * - 10m 60%
 *
 * Principal 3x
 * - 5m 90% FTP
 * - 3m 55% FTP
 *
 * Desaquecimento
 * - 10m 55% FTP
 * </pre>
 *
 * <p>Decisao de projeto: alvos sao enviados em <b>percentual</b> ou por <b>zona</b>, nunca em
 * watts/bpm absolutos. Assim o Intervals.icu resolve com o FTP/limiar do proprio atleta e o
 * treino continua correto se o limiar mudar depois.</p>
 */
public final class IntervalsWorkoutText {

    private IntervalsWorkoutText() {
    }

    public static String toText(Workout workout) {
        List<String> lines = new ArrayList<>();
        for (WorkoutBlock block : workout.getBlocks()) {
            String header = header(block);
            if (!header.isBlank()) {
                if (!lines.isEmpty()) {
                    lines.add("");
                }
                lines.add(header);
            }
            for (WorkoutStep step : block.getSteps()) {
                lines.add(stepLine(step));
            }
        }
        return String.join("\n", lines).trim();
    }

    /** Cabecalho da secao: titulo do bloco e, quando houver, o multiplicador de repeticoes. */
    static String header(WorkoutBlock block) {
        String title = block.getTitle() == null ? "" : block.getTitle().trim();
        int repeats = block.getRepeatCount() == null ? 1 : block.getRepeatCount();
        if (repeats > 1) {
            return (title.isEmpty() ? "" : title + " ") + repeats + "x";
        }
        return title;
    }

    static String stepLine(WorkoutStep step) {
        return "- " + duration(step) + " " + target(step.getTarget());
    }

    /** Duracao em segundos ou distancia: "45m", "30s", "5km", "800m". */
    static String duration(WorkoutStep step) {
        DurationType type = step.getDurationType() == null ? DurationType.TIME : step.getDurationType();

        if (type == DurationType.DISTANCE) {
            Integer meters = step.getDistanceM();
            if (meters == null || meters <= 0) {
                return "1km";
            }
            if (meters >= 1000) {
                double km = meters / 1000.0;
                return km == Math.floor(km)
                        ? String.format(Locale.ROOT, "%.0fkm", km)
                        : String.format(Locale.ROOT, "%.1fkm", km);
            }
            return meters + "m";
        }

        Integer seconds = step.getDurationSec();
        if (type == DurationType.OPEN || seconds == null || seconds <= 0) {
            // Sem duracao definida o relogio nao teria quando virar o passo: usa 5 min como
            // piso e o atleta ajusta no aparelho se precisar.
            return "5m";
        }
        return formatSeconds(seconds);
    }

    static String formatSeconds(int totalSeconds) {
        int hours = totalSeconds / 3600;
        int minutes = (totalSeconds % 3600) / 60;
        int seconds = totalSeconds % 60;

        StringBuilder out = new StringBuilder();
        if (hours > 0) {
            out.append(hours).append("h");
        }
        if (minutes > 0) {
            out.append(minutes).append("m");
        }
        if (seconds > 0 || out.isEmpty()) {
            out.append(seconds).append("s");
        }
        return out.toString();
    }

    /**
     * Alvo do passo no vocabulario do Intervals.icu:
     * {@code 85%}, {@code 85-95%}, {@code 85% FTP}, {@code Z2}, {@code Z3 HR}, {@code Z2 Pace}, {@code free}.
     */
    static String target(Target target) {
        if (target == null || target.getType() == null || target.getType() == TargetType.FREE) {
            return "free";
        }
        TargetType type = target.getType();

        if (type == TargetType.RPE) {
            // RPE nao existe como alvo do relogio; vai como "livre" para o passo existir.
            return "free";
        }
        if (type == TargetType.POWER_ZONE || type == TargetType.HR_ZONE
                || type == TargetType.PACE_ZONE) {
            if (target.getZone() == null) {
                return "free";
            }
            return "Z" + target.getZone() + zoneSuffix(type);
        }
        String percent = percentRange(target.getMinValue(), target.getMaxValue());
        if (percent == null) {
            return "free";
        }
        return percent + percentSuffix(type);
    }

    private static String zoneSuffix(TargetType type) {
        return switch (type) {
            case HR_ZONE -> " HR";
            case PACE_ZONE -> " Pace";
            default -> "";
        };
    }

    private static String percentSuffix(TargetType type) {
        return switch (type) {
            case POWER_PERCENT -> " FTP";
            case PACE_PERCENT -> " pace";
            case HR_PERCENT -> " HR";
            default -> "";
        };
    }

    private static String percentRange(Integer min, Integer max) {
        if (min == null || min <= 0) {
            return null;
        }
        if (max != null && max > min) {
            return min + "-" + max + "%";
        }
        return min + "%";
    }

    /** Esporte no vocabulario de disciplinas do Intervals.icu. */
    public static String sportType(Sport sport) {
        return switch (sport) {
            case BIKE -> "Ride";
            case RUN -> "Run";
            case SWIM -> "Swim";
        };
    }
}
