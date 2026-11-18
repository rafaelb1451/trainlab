package com.trainlab.athlete;

import com.trainlab.workout.Sport;
import com.trainlab.workout.ZoneType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class AthleteDtos {

    private AthleteDtos() {
    }

    public record AthleteRequest(
            @NotBlank(message = "o nome do atleta é obrigatório")
            @Size(max = 120, message = "o nome deve ter no máximo 120 caracteres")
            String displayName,

            @NotBlank(message = "o email é obrigatório")
            @Email(message = "informe um email válido")
            @Size(max = 180, message = "o email deve ter no máximo 180 caracteres")
            String email,

            @NotBlank(message = "a senha inicial é obrigatória")
            @Size(min = 8, max = 72, message = "a senha deve ter entre 8 e 72 caracteres")
            String password,

            LocalDate birthDate,
            Sex sex,

            @Min(value = 80, message = "a altura deve ser no mínimo 80 cm")
            @Max(value = 250, message = "a altura deve ser no máximo 250 cm")
            Integer heightCm,

            @DecimalMin(value = "20.0", message = "o peso deve ser no mínimo 20 kg")
            @DecimalMax(value = "300.0", message = "o peso deve ser no máximo 300 kg")
            Double weightKg,

            @Size(max = 2000, message = "as observações devem ter no máximo 2000 caracteres")
            String notes
    ) {
    }

    public record AthleteUpdateRequest(
            @NotBlank(message = "o nome do atleta é obrigatório")
            @Size(max = 120, message = "o nome deve ter no máximo 120 caracteres")
            String displayName,

            LocalDate birthDate,
            Sex sex,

            @Min(value = 80, message = "a altura deve ser no mínimo 80 cm")
            @Max(value = 250, message = "a altura deve ser no máximo 250 cm")
            Integer heightCm,

            @DecimalMin(value = "20.0", message = "o peso deve ser no mínimo 20 kg")
            @DecimalMax(value = "300.0", message = "o peso deve ser no máximo 300 kg")
            Double weightKg,

            @Size(max = 2000, message = "as observações devem ter no máximo 2000 caracteres")
            String notes
    ) {
    }

    public record AthleteSummary(
            UUID id,
            String displayName,
            String email,
            Sex sex,
            LocalDate birthDate,
            List<Sport> sports,
            Map<String, String> thresholdSummary
    ) {
    }

    public record AthleteDetail(
            UUID id,
            String displayName,
            String email,
            Sex sex,
            LocalDate birthDate,
            Integer heightCm,
            Double weightKg,
            String notes,
            List<Sport> sports,
            Map<String, String> thresholdSummary,
            UUID coachId,
            List<ThresholdDto> thresholds
    ) {
    }

    public record ThresholdDto(
            UUID id,
            Sport sport,
            Integer maxHr,
            Integer restingHr,
            Integer lthr,
            Integer ftpWatts,
            Integer thresholdPaceSecPerKm,
            Integer cssSecPer100m,
            Instant updatedAt
    ) {
    }

    public record ThresholdRequest(
            @Min(value = 60, message = "a FC máxima deve ser no mínimo 60 bpm")
            @Max(value = 260, message = "a FC máxima deve ser no máximo 260 bpm")
            Integer maxHr,

            @Min(value = 30, message = "a FC de repouso deve ser no mínimo 30 bpm")
            @Max(value = 150, message = "a FC de repouso deve ser no máximo 150 bpm")
            Integer restingHr,

            @Min(value = 60, message = "o LTHR deve ser no mínimo 60 bpm")
            @Max(value = 260, message = "o LTHR deve ser no máximo 260 bpm")
            Integer lthr,

            @Min(value = 30, message = "o FTP deve ser no mínimo 30 W")
            @Max(value = 2500, message = "o FTP deve ser no máximo 2500 W")
            Integer ftpWatts,

            @Min(value = 120, message = "o pace de limiar deve ser no mínimo 120 s/km")
            @Max(value = 1200, message = "o pace de limiar deve ser no máximo 1200 s/km")
            Integer thresholdPaceSecPerKm,

            @Min(value = 50, message = "o CSS deve ser no mínimo 50 s/100m")
            @Max(value = 600, message = "o CSS deve ser no máximo 600 s/100m")
            Integer cssSecPer100m
    ) {
    }

    public record ZoneDto(
            UUID id,
            Sport sport,
            ZoneType type,
            Integer zoneNumber,
            String name,
            Integer minValue,
            Integer maxValue,
            String unit
    ) {
    }

    public record ZoneInput(
            @NotNull(message = "o número da zona é obrigatório")
            @Min(value = 1, message = "a zona deve ser no mínimo 1")
            @Max(value = 20, message = "a zona deve ser no máximo 20")
            Integer zoneNumber,

            @NotBlank(message = "o nome da zona é obrigatório")
            @Size(max = 80, message = "o nome da zona deve ter no máximo 80 caracteres")
            String name,

            @NotNull(message = "o valor mínimo da zona é obrigatório")
            Integer minValue,

            @NotNull(message = "o valor máximo da zona é obrigatório")
            Integer maxValue,

            @NotBlank(message = "a unidade da zona é obrigatória")
            @Size(max = 20, message = "a unidade deve ter no máximo 20 caracteres")
            String unit
    ) {
    }
}
