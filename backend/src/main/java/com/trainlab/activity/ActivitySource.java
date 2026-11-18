package com.trainlab.activity;

/**
 * Origem do arquivo de uma atividade executada (SPEC 12.1).
 *
 * <p>{@code MANUAL} existe para atividades criadas fora do fluxo de importação; a v6 só grava
 * atividades pelos parsers TCX/GPX/FIT, mas o valor é mantido no contrato para evolução.</p>
 */
public enum ActivitySource {
    MANUAL,
    TCX,
    GPX,
    FIT
}
