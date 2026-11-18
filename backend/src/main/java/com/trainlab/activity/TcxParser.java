package com.trainlab.activity;

import com.trainlab.common.ApiException;
import com.trainlab.workout.Sport;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

/**
 * Parser de TCX (Training Center Database). Lê a primeira {@code Activity} com trackpoints e
 * tolera namespaces/prefixos variados, inclusive {@code ns3:Watts} dentro de {@code Extensions}.
 *
 * <p>Além de Time/Distance/HR/Cadence/Position, procura {@code Watts} e {@code Speed} em
 * qualquer extensão do trackpoint. Os laps são delimitados pelos trackpoints de cada
 * {@code Lap}; as médias são recalculadas depois, no cálculo de métricas.</p>
 */
@Component
public class TcxParser {

    public ParsedActivity parse(byte[] content, String fileName) {
        Document document = ActivityXmlSupport.parse(content, "TCX");
        Element root = document.getDocumentElement();

        Element activity = "Activity".equals(ActivityXmlSupport.localName(root))
                ? root : firstActivity(root);
        if (activity == null) {
            throw ApiException.badRequest("Arquivo TCX sem elemento <Activity>");
        }

        String sportAttribute = activity.getAttribute("Sport");
        Sport sport = ActivitySportSupport.fromTcx(sportAttribute, fileName);

        List<RawPoint> points = new ArrayList<>();
        List<LapBuffer> lapBuffers = new ArrayList<>();
        int lapIndex = 0;

        for (Element lap : ActivityXmlSupport.children(activity, "Lap")) {
            LapBuffer buffer = lapBuffer(lap, lapIndex++);
            List<RawPoint> lapPoints = readTrackpoints(lap);
            if (!lapPoints.isEmpty()) {
                buffer.points.addAll(lapPoints);
                points.addAll(lapPoints);
            }
            if (!buffer.points.isEmpty()) {
                lapBuffers.add(buffer);
            }
        }

        // Alguns exportadores colocam <Track> direto na Activity, sem <Lap>.
        if (points.isEmpty()) {
            List<RawPoint> direct = readTrackpoints(activity);
            if (!direct.isEmpty()) {
                points.addAll(direct);
                LapBuffer buffer = new LapBuffer(0);
                buffer.points.addAll(direct);
                lapBuffers.add(buffer);
            }
        }

        if (points.isEmpty()) {
            throw ApiException.badRequest("Arquivo TCX sem trackpoints (Time/Position) para importar");
        }

        points.sort((a, b) -> a.time().compareTo(b.time()));
        Instant startTime = points.get(0).time();
        ZoneOffset offset = points.get(0).offset() == null ? ZoneOffset.UTC : points.get(0).offset();
        List<ParsedActivity.ParsedSample> samples = toSamples(points, startTime);
        List<ParsedActivity.ParsedLap> laps = toLaps(lapBuffers, startTime);

        int calories = lapBuffers.stream()
                .map(buffer -> buffer.calories == null ? 0 : buffer.calories)
                .mapToInt(Integer::intValue)
                .sum();
        return new ParsedActivity(sport, startTime, offset, samples, laps,
                calories > 0 ? calories : null);
    }

    private Element firstActivity(Element root) {
        Element activities = ActivityXmlSupport.firstChild(root, "Activities");
        Element scope = activities == null ? root : activities;
        List<Element> found = ActivityXmlSupport.children(scope, "Activity");
        if (!found.isEmpty()) {
            return found.get(0);
        }
        return ActivityXmlSupport.firstDescendant(root, "Activity");
    }

    private LapBuffer lapBuffer(Element lap, int index) {
        LapBuffer buffer = new LapBuffer(index);
        buffer.distanceM = ActivityXmlSupport.doubleValue(lap, "DistanceMeters");
        buffer.calories = ActivityXmlSupport.intValue(lap, "Calories");
        Element avgHr = ActivityXmlSupport.firstChild(lap, "AverageHeartRateBpm");
        buffer.avgHr = ActivityXmlSupport.intValue(avgHr, "Value");
        Element maxHr = ActivityXmlSupport.firstChild(lap, "MaximumHeartRateBpm");
        buffer.maxHr = ActivityXmlSupport.intValue(maxHr, "Value");
        buffer.avgPower = ActivityXmlSupport.intValue(
                ActivityXmlSupport.firstDescendant(lap, "AvgWatts"));
        buffer.trigger = ActivityXmlSupport.textOf(lap, "TriggerMethod");
        return buffer;
    }

    private List<RawPoint> readTrackpoints(Element parent) {
        List<RawPoint> points = new ArrayList<>();
        List<Element> tracks = ActivityXmlSupport.children(parent, "Track");
        if (tracks.isEmpty()) {
            tracks = ActivityXmlSupport.children(parent, "Trackpoint").isEmpty()
                    ? List.of() : List.of(parent);
        }
        for (Element track : tracks) {
            for (Element trackpoint : ActivityXmlSupport.children(track, "Trackpoint")) {
                RawPoint point = readTrackpoint(trackpoint);
                if (point != null) {
                    points.add(point);
                }
            }
        }
        // Trackpoint direto no pai (arquivo atípico).
        if (points.isEmpty()) {
            for (Element trackpoint : ActivityXmlSupport.children(parent, "Trackpoint")) {
                RawPoint point = readTrackpoint(trackpoint);
                if (point != null) {
                    points.add(point);
                }
            }
        }
        return points;
    }

    private RawPoint readTrackpoint(Element trackpoint) {
        ActivityXmlSupport.ParsedTime time =
                ActivityXmlSupport.parseTime(ActivityXmlSupport.textOf(trackpoint, "Time"));
        if (time == null) {
            return null;
        }
        Double lat = null;
        Double lon = null;
        Element position = ActivityXmlSupport.firstChild(trackpoint, "Position");
        if (position != null) {
            lat = ActivityXmlSupport.doubleValue(position, "LatitudeDegrees");
            lon = ActivityXmlSupport.doubleValue(position, "LongitudeDegrees");
        }
        Integer hr = null;
        Element heartRate = ActivityXmlSupport.firstChild(trackpoint, "HeartRateBpm");
        if (heartRate != null) {
            hr = ActivityXmlSupport.intValue(heartRate, "Value");
        }
        Integer cadence = ActivityXmlSupport.intValue(trackpoint, "Cadence");
        if (cadence == null) {
            cadence = ActivityXmlSupport.intValue(
                    ActivityXmlSupport.firstDescendant(trackpoint, "RunCadence"));
        }
        Integer power = ActivityXmlSupport.intValue(
                ActivityXmlSupport.firstDescendant(trackpoint, "Watts"));
        Double speed = ActivityXmlSupport.doubleValue(
                ActivityXmlSupport.firstDescendant(trackpoint, "Speed"));
        return new RawPoint(time.instant(), time.offset(),
                ActivityXmlSupport.doubleValue(trackpoint, "DistanceMeters"),
                hr, speed, power, cadence,
                ActivityXmlSupport.doubleValue(trackpoint, "AltitudeMeters"),
                lat, lon);
    }

    private List<ParsedActivity.ParsedSample> toSamples(List<RawPoint> points, Instant startTime) {
        List<ParsedActivity.ParsedSample> samples = new ArrayList<>(points.size());
        long previousOffset = Long.MIN_VALUE;
        for (RawPoint point : points) {
            long offset = Duration.between(startTime, point.time()).getSeconds();
            if (offset < 0) {
                continue;
            }
            if (offset < previousOffset) {
                continue;
            }
            previousOffset = offset;
            samples.add(new ParsedActivity.ParsedSample(offset, point.distanceM(), point.hr(),
                    point.speedMps(), point.power(), point.cadence(), point.elevationM(),
                    point.lat(), point.lon()));
        }
        return samples;
    }

    private List<ParsedActivity.ParsedLap> toLaps(List<LapBuffer> buffers, Instant startTime) {
        List<ParsedActivity.ParsedLap> laps = new ArrayList<>();
        for (LapBuffer buffer : buffers) {
            if (buffer.points.isEmpty()) {
                continue;
            }
            long startSec = Duration.between(startTime, buffer.points.get(0).time()).getSeconds();
            long endSec = Duration.between(startTime,
                    buffer.points.get(buffer.points.size() - 1).time()).getSeconds();
            if (endSec < startSec) {
                continue;
            }
            laps.add(new ParsedActivity.ParsedLap(buffer.index, startSec, endSec,
                    buffer.distanceM, buffer.avgHr, buffer.maxHr, buffer.avgPower,
                    buffer.calories, buffer.trigger));
        }
        return laps;
    }

    private record RawPoint(Instant time, ZoneOffset offset, Double distanceM, Integer hr,
                            Double speedMps, Integer power, Integer cadence, Double elevationM,
                            Double lat, Double lon) {
    }

    private static final class LapBuffer {
        private final int index;
        private final List<RawPoint> points = new ArrayList<>();
        private Double distanceM;
        private Integer avgHr;
        private Integer maxHr;
        private Integer avgPower;
        private Integer calories;
        private String trigger;

        private LapBuffer(int index) {
            this.index = index;
        }
    }
}
