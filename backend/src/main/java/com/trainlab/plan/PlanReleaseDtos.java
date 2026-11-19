package com.trainlab.plan;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

/** Contrato da acao "liberar planilha" — o treinador fecha o periodo e o atleta e' avisado. */
public final class PlanReleaseDtos {

    private PlanReleaseDtos() {
    }

    public record ReleaseRequest(
            @NotNull(message = "o atleta e' obrigatorio")
            UUID athleteId,

            @NotNull(message = "a data inicial e' obrigatoria")
            LocalDate from,

            @NotNull(message = "a data final e' obrigatoria")
            LocalDate to
    ) {
    }

    public record ReleaseResponse(int released, String message) {
    }
}
