package com.trainlab.integration;

/**
 * Servicos externos que o TrainLab conversa.
 *
 * <p>O primeiro e' o Intervals.icu, usado como canal de entrega: ele tem o vinculo com a
 * Garmin e desce o treino planejado para o relogio. A Garmin direta entra aqui quando o
 * programa de desenvolvedores reabrir.</p>
 */
public enum Provider {
    INTERVALS_ICU("Intervals.icu")
    ;

    private final String label;

    Provider(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
