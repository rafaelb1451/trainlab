package com.trainlab.activity;

import com.trainlab.activity.ParsedActivity.ParsedSample;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Normaliza os pontos de um arquivo para uma série canônica usada tanto pelo resumo quanto pela
 * análise: offsets crescentes, distância acumulada sempre presente e velocidade derivada quando
 * o arquivo não a traz. GPX (sem distância) é resolvido por Haversine.
 */
public final class ActivitySampleNormalizer {

    private static final double EARTH_RADIUS_M = 6_371_000.0;

    private ActivitySampleNormalizer() {
    }

    public static List<ActivityPoint> normalize(List<ParsedSample> samples) {
        if (samples == null || samples.isEmpty()) {
            return List.of();
        }
        List<ParsedSample> ordered = new ArrayList<>(samples);
        ordered.sort(Comparator.comparingLong(ParsedSample::offsetSec));

        List<ActivityPoint> result = new ArrayList<>(ordered.size());
        double cumulative = 0.0;
        ActivityPoint previous = null;
        for (ParsedSample sample : ordered) {
            long offset = sample.offsetSec();
            if (previous != null && offset < previous.offsetSec()) {
                continue;
            }
            long deltaSec = previous == null ? 0 : offset - previous.offsetSec();
            Double declared = sample.distanceM();
            if (declared != null && declared >= 0) {
                // Distâncias de arquivo são cumulativas; nunca deixamos a série andar para trás.
                cumulative = Math.max(cumulative, declared);
            } else if (previous != null && previous.lat() != null && previous.lon() != null
                    && sample.lat() != null && sample.lon() != null) {
                cumulative += haversine(previous.lat(), previous.lon(), sample.lat(), sample.lon());
            } else if (previous != null && sample.speedMps() != null && sample.speedMps() > 0
                    && deltaSec > 0) {
                cumulative += sample.speedMps() * deltaSec;
            }

            Double speed = sample.speedMps();
            if ((speed == null || speed <= 0) && previous != null && deltaSec > 0) {
                double deltaDistance = cumulative - previous.distanceM();
                speed = deltaDistance > 0 ? deltaDistance / deltaSec : 0.0;
            }

            ActivityPoint point = new ActivityPoint(offset, cumulative, sample.hr(), speed,
                    sample.power(), sample.cadence(), sample.elevationM(), sample.lat(), sample.lon());
            result.add(point);
            previous = point;
        }
        return result;
    }

    public static double haversine(double lat1, double lon1, double lat2, double lon2) {
        double latRad1 = Math.toRadians(lat1);
        double latRad2 = Math.toRadians(lat2);
        double deltaLat = Math.toRadians(lat2 - lat1);
        double deltaLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
                + Math.cos(latRad1) * Math.cos(latRad2)
                * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1.0, Math.sqrt(a)));
    }

    public record ActivityPoint(
            long offsetSec,
            double distanceM,
            Integer hr,
            Double speedMps,
            Integer power,
            Integer cadence,
            Double elevationM,
            Double lat,
            Double lon
    ) {
    }
}
