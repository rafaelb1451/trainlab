package com.trainlab.activity;

import com.trainlab.workout.Sport;

import java.util.Locale;

/** Inferência do esporte a partir do arquivo, usada quando o formato não traz um esporte claro. */
final class ActivitySportSupport {

    private ActivitySportSupport() {
    }

    /**
     * TCX só tem Running/Biking/Other. Para "Other" (natação e força, por exemplo) tentamos
     * identificar pelo nome do arquivo; sem pista, assume corrida, o caso mais comum.
     */
    static Sport fromTcx(String sportAttribute, String fileName) {
        if (sportAttribute != null) {
            String value = sportAttribute.trim().toLowerCase(Locale.ROOT);
            if (value.contains("run")) {
                return Sport.RUN;
            }
            if (value.contains("bik") || value.contains("cycl")) {
                return Sport.BIKE;
            }
            if (value.contains("swim")) {
                return Sport.SWIM;
            }
        }
        return infer(fileName);
    }

    static Sport infer(String hint) {
        if (hint == null) {
            return Sport.RUN;
        }
        String value = hint.toLowerCase(Locale.ROOT);
        if (value.contains("swim") || value.contains("nata") || value.contains("pool")
                || value.contains("aquat")) {
            return Sport.SWIM;
        }
        if (value.contains("bike") || value.contains("bicicleta") || value.contains("cycl")
                || value.contains("pedal") || value.contains("ride")) {
            return Sport.BIKE;
        }
        return Sport.RUN;
    }
}
