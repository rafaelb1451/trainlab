package com.trainlab.plan;

import com.trainlab.workout.WorkoutDtos;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public final class PlanDtos {

    private PlanDtos() {
    }

    public record PlannedWorkoutRequest(
            @NotNull(message = "o atleta é obrigatório")
            UUID athleteId,

            @NotNull(message = "o treino é obrigatório")
            UUID workoutId,

            @NotNull(message = "a data agendada é obrigatória")
            LocalDate scheduledDate,

            PlannedStatus status,

            @Size(max = 1000, message = "as notas devem ter no máximo 1000 caracteres")
            String notes
    ) {
    }

    public record PlannedWorkoutPatchRequest(
            LocalDate scheduledDate,
            PlannedStatus status,

            @Size(max = 1000, message = "as notas devem ter no máximo 1000 caracteres")
            String notes
    ) {
    }

    public record PlannedWorkoutDto(
            UUID id,
            UUID athleteId,
            String athleteName,
            UUID workoutId,
            LocalDate scheduledDate,
            PlannedStatus status,
            String notes,
            WorkoutDtos.WorkoutSummary workout
    ) {
    }
}
