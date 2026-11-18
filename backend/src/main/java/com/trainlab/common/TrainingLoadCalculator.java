package com.trainlab.common;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

/**
 * Cálculo único de carga de treino exponencial (CTL/ATL/TSB) usado pelo calendário (SPEC 9.1)
 * e pelo painel de análises (SPEC 10.1). A série começa em {@code start} com 0 e acumula o TSS
 * de cada dia, incluindo os dias anteriores ao período exibido quando o chamador pede o histórico.
 */
@Component
public class TrainingLoadCalculator {

    /** Histórico considerado no cálculo exponencial de CTL/ATL antes de {@code from}. */
    public static final int LOAD_HISTORY_DAYS = 90;
    public static final int CTL_TIME_CONSTANT_DAYS = 42;
    public static final int ATL_TIME_CONSTANT_DAYS = 7;

    /**
     * Ponto de carga de um dia. CTL e ATL ficam em precisão dupla; os valores publicados na API
     * são arredondados e o TSB é calculado sobre os arredondados (igual ao calendário da v3).
     */
    public record LoadPoint(double ctl, double atl) {

        public int ctlRounded() {
            return (int) Math.round(ctl);
        }

        public int atlRounded() {
            return (int) Math.round(atl);
        }

        public int tsbRounded() {
            return ctlRounded() - atlRounded();
        }
    }

    /**
     * Série diária de CTL/ATL de {@code start} a {@code end} (inclusive). Dias sem TSS no mapa
     * valem 0 e continuam amortecendo a carga, como no TrainingPeaks.
     */
    public Map<LocalDate, LoadPoint> series(LocalDate start, LocalDate end, Map<LocalDate, Double> tssByDate) {
        Map<LocalDate, LoadPoint> series = new HashMap<>();
        double ctl = 0.0;
        double atl = 0.0;
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            double tss = tssByDate == null ? 0.0 : tssByDate.getOrDefault(date, 0.0);
            ctl += (tss - ctl) / CTL_TIME_CONSTANT_DAYS;
            atl += (tss - atl) / ATL_TIME_CONSTANT_DAYS;
            series.put(date, new LoadPoint(ctl, atl));
        }
        return series;
    }
}
