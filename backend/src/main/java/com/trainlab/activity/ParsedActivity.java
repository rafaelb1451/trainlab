package com.trainlab.activity;

import com.trainlab.workout.Sport;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

/**
 * Resultado neutro de um parser de arquivo de atividade, antes do cálculo de métricas e da
 * persistência. Os offsets são em segundos desde o primeiro ponto, o que simplifica o
 * processamento e mantém os parsers independentes de fuso.
 *
 * <p>{@code offset} guarda o fuso do timestamp original. Ele é usado para descobrir a data
 * local da atividade no vínculo com a sessão planejada ("mesma data, fuso do startTime").</p>
 */
public record ParsedActivity(
        Sport sport,
        Instant startTime,
        ZoneOffset offset,
        List<ParsedSample> samples,
        List<ParsedLap> laps,
        Integer calories
) {

    public ParsedActivity {
        samples = samples == null ? List.of() : List.copyOf(samples);
        laps = laps == null ? List.of() : List.copyOf(laps);
    }

    /**
     * Ponto bruto extraído do arquivo. Campos ausentes ficam nulos — a calculadora preenche
     * distância por geolocalização e velocidade, e não inventa FC/potência que não existam.
     */
    public record ParsedSample(
            long offsetSec,
            Double distanceM,
            Integer hr,
            Double speedMps,
            Integer power,
            Integer cadence,
            Double elevationM,
            Double lat,
            Double lon
    ) {
    }

    /**
     * Volta delimitada por dois offsets (inclusive). As métricas médias são recalculadas a
     * partir dos samples; os campos do arquivo servem apenas de fallback.
     */
    public record ParsedLap(
            int lapIndex,
            long startSec,
            long endSec,
            Double distanceM,
            Integer avgHr,
            Integer maxHr,
            Integer avgPower,
            Integer calories,
            String trigger
    ) {
    }
}
