package com.trainlab.activity;

import com.trainlab.common.ApiException;
import com.trainlab.workout.Sport;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Parser de GPX. GPX não tem distância acumulada nem laps: a distância é derivada das
 * coordenadas (Haversine) pela calculadora de métricas, e a FC/potência aparecem apenas quando
 * o arquivo traz extensões (Garmin {@code gpxtpx:hr}, {@code power}, etc.).
 */
@Component
public class GpxParser {

    public ParsedActivity parse(byte[] content, String fileName) {
        Document document = ActivityXmlSupport.parse(content, "GPX");
        Element root = document.getDocumentElement();
        String declaredType = firstType(root);
        Sport sport = sportOf(declaredType, fileName);

        List<Element> points = new ArrayList<>();
        for (Element trk : ActivityXmlSupport.children(root, "trk")) {
            for (Element trkseg : ActivityXmlSupport.children(trk, "trkseg")) {
                points.addAll(ActivityXmlSupport.children(trkseg, "trkpt"));
            }
        }
        if (points.isEmpty()) {
            // GPX de rota (rtept) é aceito como fallback; é comum em arquivos exportados à mão.
            NodeList routePoints = root.getElementsByTagNameNS("*", "rtept");
            for (int i = 0; i < routePoints.getLength(); i++) {
                if (routePoints.item(i) instanceof Element element) {
                    points.add(element);
                }
            }
        }
        if (points.isEmpty()) {
            throw ApiException.badRequest("Arquivo GPX sem pontos de trajeto (<trkpt>)");
        }

        List<RawPoint> rawPoints = new ArrayList<>();
        for (Element point : points) {
            ActivityXmlSupport.ParsedTime time =
                    ActivityXmlSupport.parseTime(ActivityXmlSupport.textOf(point, "time"));
            if (time == null) {
                continue;
            }
            Double elevation = ActivityXmlSupport.doubleValue(point, "ele");
            Double lat = doubleAttribute(point, "lat");
            Double lon = doubleAttribute(point, "lon");
            Integer hr = firstInt(point, "hr", "heartrate", "heartRate");
            Integer cadence = firstInt(point, "cad", "cadence");
            Integer power = firstInt(point, "power", "Power", "Watts", "watts");
            rawPoints.add(new RawPoint(time.instant(), time.offset(), hr, power, cadence,
                    elevation, lat, lon));
        }
        if (rawPoints.isEmpty()) {
            throw ApiException.badRequest("Arquivo GPX sem horários (<time>) nos pontos do trajeto");
        }

        rawPoints.sort((a, b) -> a.time().compareTo(b.time()));
        Instant startTime = rawPoints.get(0).time();
        ZoneOffset offset = rawPoints.get(0).offset() == null ? ZoneOffset.UTC : rawPoints.get(0).offset();
        List<ParsedActivity.ParsedSample> samples = new ArrayList<>(rawPoints.size());
        long previousOffset = Long.MIN_VALUE;
        for (RawPoint point : rawPoints) {
            long seconds = Duration.between(startTime, point.time()).getSeconds();
            if (seconds < 0 || seconds < previousOffset) {
                continue;
            }
            previousOffset = seconds;
            samples.add(new ParsedActivity.ParsedSample(seconds, null, point.hr(), null,
                    point.power(), point.cadence(), point.elevation(), point.lat(), point.lon()));
        }
        return new ParsedActivity(sport, startTime, offset, samples, List.of(), null);
    }

    private Sport sportOf(String declaredType, String fileName) {
        if (declaredType != null) {
            String value = declaredType.toLowerCase(Locale.ROOT);
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
        return ActivitySportSupport.infer(fileName);
    }

    private String firstType(Element root) {
        for (Element trk : ActivityXmlSupport.children(root, "trk")) {
            String type = ActivityXmlSupport.textOf(trk, "type");
            if (type != null) {
                return type;
            }
        }
        return null;
    }

    private Double doubleAttribute(Element element, String name) {
        String raw = element.getAttribute(name);
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Double.parseDouble(raw.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Integer firstInt(Element parent, String... localNames) {
        for (String localName : localNames) {
            Integer value = ActivityXmlSupport.intValue(
                    ActivityXmlSupport.firstDescendant(parent, localName));
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private record RawPoint(Instant time, ZoneOffset offset, Integer hr, Integer power,
                            Integer cadence, Double elevation, Double lat, Double lon) {
    }
}
