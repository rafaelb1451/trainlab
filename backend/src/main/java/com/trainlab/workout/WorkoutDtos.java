package com.trainlab.workout;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class WorkoutDtos {

    private WorkoutDtos() {
    }

    public record WorkoutRequest(
            @NotBlank(message = "o nome do treino é obrigatório")
            @Size(max = 160, message = "o nome deve ter no máximo 160 caracteres")
            String name,

            @NotNull(message = "o esporte é obrigatório")
            Sport sport,

            @NotNull(message = "o tipo do treino é obrigatório")
            WorkoutType type,

            @Size(max = 3000, message = "a descrição deve ter no máximo 3000 caracteres")
            String description,

            List<@Size(max = 60, message = "cada tag deve ter no máximo 60 caracteres") String> tags,

            @Min(value = 1, message = "a dificuldade deve ser entre 1 e 5")
            @Max(value = 5, message = "a dificuldade deve ser entre 1 e 5")
            Integer difficulty,

            @Valid
            List<BlockRequest> blocks
    ) {
    }

    public record BlockRequest(
            @Min(value = 1, message = "a repetição deve ser no mínimo 1")
            Integer repeatCount,

            @Size(max = 160, message = "o título do bloco deve ter no máximo 160 caracteres")
            String title,

            @Size(max = 1000, message = "as notas do bloco devem ter no máximo 1000 caracteres")
            String notes,

            @Valid
            List<StepRequest> steps
    ) {
    }

    public record StepRequest(
            StepRole role,
            DurationType durationType,
            Integer durationSec,
            Integer distanceM,
            @Size(max = 1000, message = "as notas do step devem ter no máximo 1000 caracteres") String notes,
            @Valid
            TargetRequest target
    ) {
    }

    public record TargetRequest(
            TargetType type,
            Integer zone,
            Integer minValue,
            Integer maxValue,
            @Size(max = 200, message = "o display do alvo deve ter no máximo 200 caracteres") String display,
            Integer absoluteMin,
            Integer absoluteMax,
            String absoluteUnit
    ) {
    }

    public record TargetDto(
            TargetType type,
            Integer zone,
            Integer minValue,
            Integer maxValue,
            String display,
            Integer absoluteMin,
            Integer absoluteMax,
            String absoluteUnit
    ) {
    }

    public record StepDto(
            UUID id,
            Integer position,
            StepRole role,
            DurationType durationType,
            Integer durationSec,
            Integer distanceM,
            String notes,
            TargetDto target
    ) {
    }

    public record BlockDto(
            UUID id,
            Integer position,
            Integer repeatCount,
            String title,
            String notes,
            List<StepDto> steps
    ) {
    }

    public record WorkoutSummary(
            UUID id,
            String name,
            Sport sport,
            WorkoutType type,
            Integer difficulty,
            List<String> tags,
            Integer estimatedDurationSec,
            Integer stepCount,
            Instant updatedAt
    ) {
    }

    public record WorkoutDetail(
            UUID id,
            String name,
            Sport sport,
            WorkoutType type,
            String description,
            List<String> tags,
            Integer difficulty,
            Integer estimatedDurationSec,
            Integer stepCount,
            boolean archived,
            Instant createdAt,
            Instant updatedAt,
            List<BlockDto> blocks
    ) {
    }

    public record WorkoutPreview(
            UUID workoutId,
            UUID athleteId,
            Sport sport,
            String athleteName,
            PreviewTotals totals,
            List<PreviewBlock> blocks
    ) {
    }

    public record PreviewTotals(
            Integer durationSec,
            Integer distanceM,
            Map<String, Map<String, Integer>> zoneDistribution
    ) {
    }

    public record PreviewBlock(
            Integer repeatCount,
            String title,
            List<PreviewStep> steps
    ) {
    }

    public record PreviewStep(
            StepRole role,
            DurationType durationType,
            Integer durationSec,
            Integer distanceM,
            PreviewTarget target
    ) {
    }

    public record PreviewTarget(
            String type,
            Integer zone,
            String unit,
            Integer min,
            Integer max,
            String display,
            String zoneName
    ) {
    }
}
