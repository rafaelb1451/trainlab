package com.trainlab.athlete;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class MetricDtos {

    private MetricDtos() {
    }

    public record DailyMetricInput(
            @NotNull(message = "a data da métrica é obrigatória")
            LocalDate date,

            @DecimalMin(value = "0.0", message = "as horas de sono devem ser no mínimo 0")
            @DecimalMax(value = "24.0", message = "as horas de sono devem ser no máximo 24")
            Double sleepHours,

            @DecimalMin(value = "0.0", message = "as horas de sono profundo devem ser no mínimo 0")
            @DecimalMax(value = "24.0", message = "as horas de sono profundo devem ser no máximo 24")
            Double deepSleepHours,

            @DecimalMin(value = "0.0", message = "as horas de sono REM devem ser no mínimo 0")
            @DecimalMax(value = "24.0", message = "as horas de sono REM devem ser no máximo 24")
            Double remSleepHours,

            @DecimalMin(value = "0.0", message = "as horas de sono leve devem ser no mínimo 0")
            @DecimalMax(value = "24.0", message = "as horas de sono leve devem ser no máximo 24")
            Double lightSleepHours,

            @DecimalMin(value = "0.0", message = "as horas acordado devem ser no mínimo 0")
            @DecimalMax(value = "24.0", message = "as horas acordado devem ser no máximo 24")
            Double awakeHours,

            @Min(value = 0, message = "a VFC deve ser no mínimo 0 ms")
            @Max(value = 400, message = "a VFC deve ser no máximo 400 ms")
            Integer hrv,

            @Min(value = 20, message = "a FC de repouso deve ser no mínimo 20 bpm")
            @Max(value = 250, message = "a FC de repouso deve ser no máximo 250 bpm")
            Integer restingHr,

            @Min(value = 0, message = "o Body Battery mínimo deve ser no mínimo 0")
            @Max(value = 100, message = "o Body Battery mínimo deve ser no máximo 100")
            Integer bodyBatteryLow,

            @Min(value = 0, message = "o Body Battery máximo deve ser no mínimo 0")
            @Max(value = 100, message = "o Body Battery máximo deve ser no máximo 100")
            Integer bodyBatteryHigh,

            @Min(value = 0, message = "o nível de estresse deve ser no mínimo 0")
            @Max(value = 100, message = "o nível de estresse deve ser no máximo 100")
            Integer stressLevel,

            @Min(value = 1, message = "o humor deve ser entre 1 e 5")
            @Max(value = 5, message = "o humor deve ser entre 1 e 5")
            Integer mood,

            @Min(value = 1, message = "o RPE deve ser entre 1 e 10")
            @Max(value = 10, message = "o RPE deve ser entre 1 e 10")
            Integer rpe,

            @DecimalMin(value = "20.0", message = "o peso deve ser no mínimo 20 kg")
            @DecimalMax(value = "300.0", message = "o peso deve ser no máximo 300 kg")
            Double weightKg,

            @Size(max = 2000, message = "as observações devem ter no máximo 2000 caracteres")
            String notes
    ) {
    }

    public record DailyMetricDto(
            UUID id,
            UUID athleteId,
            LocalDate date,
            Double sleepHours,
            Double deepSleepHours,
            Double remSleepHours,
            Double lightSleepHours,
            Double awakeHours,
            Integer hrv,
            Integer restingHr,
            Integer bodyBatteryLow,
            Integer bodyBatteryHigh,
            Integer stressLevel,
            Integer mood,
            Integer rpe,
            Double weightKg,
            String notes,
            Instant createdAt,
            Instant updatedAt
    ) {
        public static DailyMetricDto from(DailyMetric metric) {
            if (metric == null) {
                return null;
            }
            return new DailyMetricDto(metric.getId(), metric.getAthleteId(), metric.getDate(),
                    metric.getSleepHours(), metric.getDeepSleepHours(), metric.getRemSleepHours(),
                    metric.getLightSleepHours(), metric.getAwakeHours(), metric.getHrv(),
                    metric.getRestingHr(), metric.getBodyBatteryLow(), metric.getBodyBatteryHigh(),
                    metric.getStressLevel(), metric.getMood(), metric.getRpe(), metric.getWeightKg(),
                    metric.getNotes(), metric.getCreatedAt(), metric.getUpdatedAt());
        }
    }
}
