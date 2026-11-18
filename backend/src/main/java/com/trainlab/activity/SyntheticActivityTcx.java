package com.trainlab.activity;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Gera TCX sintéticos em memória para o seed da v6 (SPEC 12.3). O objetivo é exercitar o
 * pipeline real de importação — parser, métricas, samples, laps e vínculo — e não gravar
 * entidades "na mão". Os dados são determinísticos (sem {@code Random}) para o seed ser
 * reproduzível e a análise estável entre reinícios.
 */
public final class SyntheticActivityTcx {

    private static final DateTimeFormatter TIMESTAMP =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.ROOT);

    private SyntheticActivityTcx() {
    }

    public static byte[] marinaRun(LocalDateTime start) {
        Builder builder = new Builder("Running", start, true, 12.0, 8.0, 2000.0);
        builder.startLap();
        for (int t = 0; t <= 600; t += 5) {
            double progress = t / 600.0;
            builder.add(t, 2.3 + 0.7 * progress, hr(122 + 22 * progress + jitter(t, 3)),
                    null, 84 + (int) Math.round(4 * progress), 0.0);
        }
        for (int rep = 0; rep < 6; rep++) {
            builder.startLap();
            int base = 600 + rep * 190;
            for (int t = 0; t < 100; t += 5) {
                double speed = 4.05 + 0.15 * Math.sin((base + t) / 30.0);
                builder.add(base + t, speed, hr(158 + 12 * (t / 100.0) + jitter(base + t, 2)),
                        null, 92, Math.PI / 2);
            }
            for (int t = 100; t < 190; t += 5) {
                builder.add(base + t, 2.15 + 0.2 * Math.sin(t / 17.0),
                        hr(142 + 8 * Math.sin(t / 20.0)), null, 80, Math.PI / 2);
            }
        }
        builder.startLap();
        for (int t = 1740; t <= 2040; t += 5) {
            builder.add(t, 2.4 - 0.4 * (t - 1740) / 300.0,
                    hr(134 - 10 * (t - 1740) / 300.0), null, 82, 0.0);
        }
        return builder.toXml();
    }

    public static byte[] marinaBike(LocalDateTime start) {
        Builder builder = new Builder("Biking", start, true, 25.0, 20.0, 3000.0);
        for (int t = 0; t <= 4500; t += 10) {
            if (t > 0 && t < 4500 && t % 1500 == 0) {
                builder.startLap();
            }
            double speed = 8.4 + 0.6 * Math.sin(t / 300.0) + 0.25 * Math.sin(t / 47.0);
            int power = (int) Math.round(178 + 32 * Math.sin(t / 300.0) + 10 * Math.sin(t / 53.0));
            builder.add(t, speed, hr(132 + 12 * Math.sin(t / 420.0) + 3 * Math.sin(t / 70.0)),
                    power, 90 + (int) Math.round(4 * Math.sin(t / 180.0)), Math.PI / 3);
        }
        return builder.toXml();
    }

    public static byte[] marinaSwim(LocalDateTime start) {
        Builder builder = new Builder("Other", start, false, 0.0, 0.0, 1000.0);
        for (int t = 0; t <= 1920; t += 10) {
            if (t > 0 && t < 1920 && t % 480 == 0) {
                builder.startLap();
            }
            double speed = 0.70 + 0.05 * Math.sin(t / 240.0);
            builder.add(t, speed, hr(128 + 10 * Math.sin(t / 260.0) + 3 * Math.sin(t / 45.0)),
                    null, 30 + (int) Math.round(2 * Math.sin(t / 90.0)), 0.0);
        }
        return builder.toXml();
    }

    public static byte[] carlosInterval(LocalDateTime start) {
        Builder builder = new Builder("Running", start, true, 18.0, 7.0, 1800.0);
        builder.startLap();
        for (int t = 0; t <= 480; t += 5) {
            double progress = t / 480.0;
            builder.add(t, 2.4 + 0.45 * progress,
                    hr(138 + 18 * progress + jitter(t, 2)), null,
                    84 + (int) Math.round(4 * progress), 0.0);
        }
        for (int rep = 0; rep < 6; rep++) {
            builder.startLap();
            int base = 480 + rep * 165;
            for (int t = 0; t < 90; t += 5) {
                builder.add(base + t, 4.25 + 0.1 * Math.sin(t / 20.0),
                        hr(172 + 7 * (t / 90.0) + jitter(base + t, 2)), null, 94, Math.PI / 2);
            }
            for (int t = 90; t < 165; t += 5) {
                builder.add(base + t, 2.0 + 0.15 * Math.sin(t / 15.0), hr(150 - (t - 90) / 8.0),
                        null, 80, Math.PI / 2);
            }
        }
        builder.startLap();
        for (int t = 1470; t <= 1800; t += 5) {
            builder.add(t, 2.35 - 0.3 * (t - 1470) / 330.0,
                    hr(136 - 8 * (t - 1470) / 330.0), null, 82, 0.0);
        }
        return builder.toXml();
    }

    public static byte[] carlosProgressive(LocalDateTime start) {
        Builder builder = new Builder("Running", start, true, 20.0, 6.0, 2200.0);
        for (int t = 0; t <= 2700; t += 5) {
            if (t > 0 && t < 2700 && t % 900 == 0) {
                builder.startLap();
            }
            double progress = t / 2700.0;
            builder.add(t, 2.75 + 0.85 * progress + 0.06 * Math.sin(t / 120.0),
                    hr(138 + 38 * progress + 2 * Math.sin(t / 60.0)), null,
                    86 + (int) Math.round(6 * progress), 0.0);
        }
        return builder.toXml();
    }

    private static double jitter(int second, double amplitude) {
        return amplitude * Math.sin(second / 7.0);
    }

    private static int hr(double value) {
        return (int) Math.round(Math.max(60, Math.min(215, value)));
    }

    private static final class Builder {

        private final String sportAttribute;
        private final ZonedDateTime start;
        private final boolean gps;
        private final double elevationBase;
        private final double elevationAmplitude;
        private final double elevationWavelengthM;
        private final List<Sample> samples = new ArrayList<>();
        private final List<Integer> lapStarts = new ArrayList<>();
        private double distanceM;
        private double lat = -27.5949;
        private double lon = -48.5482;

        private Builder(String sportAttribute, LocalDateTime start, boolean gps, double elevationBase,
                        double elevationAmplitude, double elevationWavelengthM) {
            this.sportAttribute = sportAttribute;
            this.start = start.atZone(ZoneId.systemDefault());
            this.gps = gps;
            this.elevationBase = elevationBase;
            this.elevationAmplitude = elevationAmplitude;
            this.elevationWavelengthM = elevationWavelengthM;
        }

        private void startLap() {
            if (!samples.isEmpty()
                    && (lapStarts.isEmpty() || lapStarts.get(lapStarts.size() - 1) < samples.size())) {
                lapStarts.add(samples.size());
            }
        }

        private void add(int offsetSec, double speedMps, int hr, Integer power, int cadence,
                         double headingRadians) {
            int previousOffset = samples.isEmpty() ? 0 : samples.get(samples.size() - 1).offsetSec();
            if (!samples.isEmpty() && offsetSec > previousOffset) {
                double delta = speedMps * (offsetSec - previousOffset);
                distanceM += delta;
                double heading = headingRadians + 0.35 * Math.sin(distanceM / 700.0);
                double north = delta * Math.cos(heading);
                double east = delta * Math.sin(heading);
                lat += north / 111_320.0;
                lon += east / (111_320.0 * Math.cos(Math.toRadians(lat)));
            }
            double elevation = elevationAmplitude == 0 ? elevationBase
                    : elevationBase + elevationAmplitude
                    * Math.sin(distanceM / elevationWavelengthM * 2 * Math.PI);
            samples.add(new Sample(offsetSec, distanceM, hr, power, cadence, elevation,
                    gps ? lat : null, gps ? lon : null, speedMps));
        }

        private byte[] toXml() {
            if (lapStarts.isEmpty() || lapStarts.get(0) != 0) {
                lapStarts.add(0, 0);
            }
            List<int[]> lapRanges = new ArrayList<>();
            for (int i = 0; i < lapStarts.size(); i++) {
                int from = lapStarts.get(i);
                int to = i + 1 < lapStarts.size() ? lapStarts.get(i + 1) - 1 : samples.size() - 1;
                if (to >= from) {
                    lapRanges.add(new int[]{from, to});
                }
            }
            StringBuilder xml = new StringBuilder(64_000);
            xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
            xml.append("<TrainingCenterDatabase xmlns=\"http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2\"")
                    .append(" xmlns:ns3=\"http://www.garmin.com/xmlschemas/ActivityExtension/v2\">\n");
            xml.append("  <Activities><Activity Sport=\"").append(sportAttribute).append("\">\n");
            xml.append("    <Id>").append(start.format(TIMESTAMP)).append("</Id>\n");
            for (int[] range : lapRanges) {
                appendLap(xml, range[0], range[1]);
            }
            xml.append("  </Activity></Activities>\n");
            xml.append("</TrainingCenterDatabase>\n");
            return xml.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        }

        private void appendLap(StringBuilder xml, int from, int to) {
            Sample first = samples.get(from);
            Sample last = samples.get(to);
            int totalTime = last.offsetSec() - first.offsetSec();
            double lapDistance = last.distanceM() - first.distanceM();
            double hrSum = 0;
            int hrCount = 0;
            int maxHr = 0;
            double powerSum = 0;
            int powerCount = 0;
            double speedSum = 0;
            for (int i = from; i <= to; i++) {
                Sample sample = samples.get(i);
                hrSum += sample.hr();
                hrCount++;
                maxHr = Math.max(maxHr, sample.hr());
                speedSum += sample.speedMps();
                if (sample.power() != null) {
                    powerSum += sample.power();
                    powerCount++;
                }
            }
            xml.append("    <Lap StartTime=\"")
                    .append(start.plusSeconds(first.offsetSec()).format(TIMESTAMP)).append("\">\n");
            xml.append("      <TotalTimeSeconds>").append(totalTime).append("</TotalTimeSeconds>\n");
            xml.append("      <DistanceMeters>").append(format(lapDistance)).append("</DistanceMeters>\n");
            xml.append("      <MaximumSpeed>").append(format(last.speedMps())).append("</MaximumSpeed>\n");
            xml.append("      <Calories>0</Calories>\n");
            xml.append("      <AverageHeartRateBpm><Value>")
                    .append(hrCount == 0 ? 0 : Math.round(hrSum / hrCount))
                    .append("</Value></AverageHeartRateBpm>\n");
            xml.append("      <MaximumHeartRateBpm><Value>").append(maxHr)
                    .append("</Value></MaximumHeartRateBpm>\n");
            xml.append("      <Intensity>Active</Intensity>\n");
            xml.append("      <TriggerMethod>Manual</TriggerMethod>\n");
            xml.append("      <Track>\n");
            for (int i = from; i <= to; i++) {
                appendTrackpoint(xml, samples.get(i));
            }
            xml.append("      </Track>\n");
            xml.append("      <Extensions><ns3:LX><ns3:AvgSpeed>")
                    .append(format(speedSum / Math.max(1, to - from + 1)))
                    .append("</ns3:AvgSpeed>");
            if (powerCount > 0) {
                xml.append("<ns3:AvgWatts>").append(Math.round(powerSum / powerCount))
                        .append("</ns3:AvgWatts>");
            }
            xml.append("</ns3:LX></Extensions>\n");
            xml.append("    </Lap>\n");
        }

        private void appendTrackpoint(StringBuilder xml, Sample sample) {
            ZonedDateTime time = start.plusSeconds(sample.offsetSec());
            xml.append("        <Trackpoint><Time>").append(time.format(TIMESTAMP)).append("</Time>");
            if (sample.lat() != null && sample.lon() != null) {
                xml.append("<Position><LatitudeDegrees>").append(format(sample.lat()))
                        .append("</LatitudeDegrees><LongitudeDegrees>").append(format(sample.lon()))
                        .append("</LongitudeDegrees></Position>");
            }
            xml.append("<AltitudeMeters>").append(format(sample.elevationM()))
                    .append("</AltitudeMeters>");
            xml.append("<DistanceMeters>").append(format(sample.distanceM()))
                    .append("</DistanceMeters>");
            xml.append("<HeartRateBpm><Value>").append(sample.hr()).append("</Value></HeartRateBpm>");
            xml.append("<Cadence>").append(sample.cadence()).append("</Cadence>");
            xml.append("<Extensions><ns3:TPX><ns3:Speed>").append(format(sample.speedMps()))
                    .append("</ns3:Speed>");
            if (sample.power() != null) {
                xml.append("<ns3:Watts>").append(sample.power()).append("</ns3:Watts>");
            }
            xml.append("</ns3:TPX></Extensions>");
            xml.append("</Trackpoint>\n");
        }

        private String format(double value) {
            return String.format(Locale.ROOT, "%.6f", value);
        }

        private record Sample(int offsetSec, double distanceM, int hr, Integer power, int cadence,
                              double elevationM, Double lat, Double lon, double speedMps) {
        }
    }
}
