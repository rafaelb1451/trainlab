package com.trainlab.athlete;

import com.trainlab.common.ApiException;
import com.trainlab.workout.Sport;
import com.trainlab.workout.ZoneType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class ZoneGenerationService {

    private static final int[][] HR_ZONES = {
            {1, 50, 68}, {2, 69, 83}, {3, 84, 94}, {4, 95, 105}, {5, 106, 120}
    };
    private static final String[] HR_NAMES = {
            "Recuperação", "Endurance", "Tempo", "Limiar", "VO2máx"
    };

    private static final int[][] POWER_ZONES = {
            {1, 0, 55}, {2, 56, 75}, {3, 76, 90}, {4, 91, 105},
            {5, 106, 120}, {6, 121, 150}, {7, 151, 200}
    };
    private static final String[] POWER_NAMES = {
            "Ativação", "Endurance", "Tempo", "Limiar", "VO2máx", "Anaeróbico", "Neuromuscular"
    };

    private static final int[][] RUN_PACE_ZONES = {
            {1, 60, 75}, {2, 78, 88}, {3, 89, 95}, {4, 96, 103}, {5, 104, 118}
    };
    private static final String[] RUN_PACE_NAMES = {
            "Recuperação", "Endurance", "Tempo", "Limiar", "Intervalado"
    };

    private static final int[][] SWIM_PACE_ZONES = {
            {1, 80, 90}, {2, 91, 97}, {3, 98, 104}, {4, 105, 112}, {5, 113, 130}
    };
    private static final String[] SWIM_PACE_NAMES = {
            "Recuperação", "Aeróbio", "Limiar", "VO2", "Velocidade"
    };

    private final ZoneSetRepository zoneSetRepository;

    public ZoneGenerationService(ZoneSetRepository zoneSetRepository) {
        this.zoneSetRepository = zoneSetRepository;
    }

    @Transactional
    public void regenerate(UUID athleteId, Sport sport, SportThreshold threshold) {
        Map<ZoneType, List<AthleteZone>> desired = new EnumMap<>(ZoneType.class);
        desired.put(ZoneType.HR, generateHr(threshold));
        desired.put(ZoneType.POWER, generatePower(sport, threshold));
        desired.put(ZoneType.PACE, generatePace(sport, threshold));

        for (Map.Entry<ZoneType, List<AthleteZone>> entry : desired.entrySet()) {
            ZoneType type = entry.getKey();
            List<AthleteZone> rows = entry.getValue();
            Optional<ZoneSet> existing = zoneSetRepository
                    .findByAthleteIdAndSportAndZoneType(athleteId, sport, type);
            if (rows.isEmpty()) {
                existing.ifPresent(zoneSetRepository::delete);
                continue;
            }
            ZoneSet zoneSet = existing.orElseGet(() -> {
                ZoneSet created = new ZoneSet();
                created.setAthleteId(athleteId);
                created.setSport(sport);
                created.setZoneType(type);
                return created;
            });
            zoneSet.getZones().clear();
            for (AthleteZone row : rows) {
                zoneSet.addZone(row);
            }
            zoneSetRepository.save(zoneSet);
        }
    }

    @Transactional
    public List<AthleteZone> replace(UUID athleteId, Sport sport, ZoneType type, List<AthleteDtos.ZoneInput> inputs) {
        if (inputs == null || inputs.isEmpty()) {
            throw ApiException.badRequest("Envie ao menos uma zona para salvar");
        }
        for (AthleteDtos.ZoneInput input : inputs) {
            if (input == null || input.zoneNumber() == null || input.minValue() == null
                    || input.maxValue() == null || input.name() == null || input.name().isBlank()) {
                throw ApiException.badRequest("Cada zona precisa de número, nome, valor mínimo e valor máximo");
            }
            if (input.minValue() > input.maxValue()) {
                throw ApiException.badRequest("O valor mínimo da zona " + input.zoneNumber()
                        + " não pode ser maior que o valor máximo");
            }
        }
        long distinctNumbers = inputs.stream().map(AthleteDtos.ZoneInput::zoneNumber).distinct().count();
        if (distinctNumbers != inputs.size()) {
            throw ApiException.badRequest("Não repita o mesmo número de zona na lista");
        }
        ZoneSet zoneSet = zoneSetRepository.findByAthleteIdAndSportAndZoneType(athleteId, sport, type)
                .orElseGet(() -> {
                    ZoneSet created = new ZoneSet();
                    created.setAthleteId(athleteId);
                    created.setSport(sport);
                    created.setZoneType(type);
                    return created;
                });
        zoneSet.getZones().clear();
        inputs.stream()
                .sorted((a, b) -> Integer.compare(a.zoneNumber(), b.zoneNumber()))
                .forEach(input -> {
                    AthleteZone row = new AthleteZone();
                    row.setZoneNumber(input.zoneNumber());
                    row.setName(input.name().trim());
                    row.setMinValue(input.minValue());
                    row.setMaxValue(input.maxValue());
                    row.setUnit(input.unit() == null || input.unit().isBlank()
                            ? defaultUnit(sport, type) : input.unit().trim());
                    zoneSet.addZone(row);
                });
        zoneSetRepository.save(zoneSet);
        return new ArrayList<>(zoneSet.getZones());
    }

    public static String defaultUnit(Sport sport, ZoneType type) {
        return switch (type) {
            case HR -> "bpm";
            case POWER -> "w";
            case PACE -> sport == Sport.SWIM ? "s_per_100m" : "s_per_km";
        };
    }

    private List<AthleteZone> generateHr(SportThreshold threshold) {
        Integer lthr = threshold.getLthr();
        if (lthr == null && threshold.getMaxHr() != null) {
            lthr = (int) Math.round(threshold.getMaxHr() * 0.85);
        }
        if (lthr == null || lthr <= 0) {
            return List.of();
        }
        List<AthleteZone> rows = new ArrayList<>();
        for (int i = 0; i < HR_ZONES.length; i++) {
            int[] zone = HR_ZONES[i];
            int min = (int) Math.round(lthr * zone[1] / 100.0);
            int max = (int) Math.round(lthr * zone[2] / 100.0);
            rows.add(zone(zone[0], HR_NAMES[i], min, Math.max(min, max), "bpm"));
        }
        return rows;
    }

    private List<AthleteZone> generatePower(Sport sport, SportThreshold threshold) {
        if (sport != Sport.BIKE || threshold.getFtpWatts() == null || threshold.getFtpWatts() <= 0) {
            return List.of();
        }
        List<AthleteZone> rows = new ArrayList<>();
        for (int i = 0; i < POWER_ZONES.length; i++) {
            int[] zone = POWER_ZONES[i];
            int min = (int) Math.round(threshold.getFtpWatts() * zone[1] / 100.0);
            int max = (int) Math.round(threshold.getFtpWatts() * zone[2] / 100.0);
            rows.add(zone(zone[0], POWER_NAMES[i], min, Math.max(min, max), "w"));
        }
        return rows;
    }

    private List<AthleteZone> generatePace(Sport sport, SportThreshold threshold) {
        if (sport == Sport.RUN && threshold.getThresholdPaceSecPerKm() != null
                && threshold.getThresholdPaceSecPerKm() > 0) {
            return paceZones(RUN_PACE_ZONES, RUN_PACE_NAMES, threshold.getThresholdPaceSecPerKm(), "s_per_km");
        }
        if (sport == Sport.SWIM && threshold.getCssSecPer100m() != null && threshold.getCssSecPer100m() > 0) {
            return paceZones(SWIM_PACE_ZONES, SWIM_PACE_NAMES, threshold.getCssSecPer100m(), "s_per_100m");
        }
        return List.of();
    }

    /**
     * Converte faixas de % da velocidade de limiar em pace (segundos por unidade).
     * Pace mais rápido = limiar * 100 / maior percentual; pace mais lento = limiar * 100 / menor percentual.
     */
    private List<AthleteZone> paceZones(int[][] zones, String[] names, int thresholdPace, String unit) {
        List<AthleteZone> rows = new ArrayList<>();
        for (int i = 0; i < zones.length; i++) {
            int[] zone = zones[i];
            int fast = (int) Math.round(thresholdPace * 100.0 / zone[2]);
            int slow = (int) Math.round(thresholdPace * 100.0 / zone[1]);
            rows.add(zone(zone[0], names[i], Math.min(fast, slow), Math.max(fast, slow), unit));
        }
        return rows;
    }

    private AthleteZone zone(int number, String name, int min, int max, String unit) {
        AthleteZone row = new AthleteZone();
        row.setZoneNumber(number);
        row.setName(name);
        row.setMinValue(min);
        row.setMaxValue(max);
        row.setUnit(unit);
        return row;
    }
}
