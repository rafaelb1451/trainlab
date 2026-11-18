package com.trainlab.activity;

import com.trainlab.common.ApiException;
import com.trainlab.workout.Sport;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Parser binário mínimo de FIT (records + laps + esporte da sessão). Não implementa o protocolo
 * inteiro: lê as mensagens de definição/dados, decodifica os tipos numéricos do padrão FIT e
 * extrai apenas os campos que interessam à análise (timestamp, posição, altitude, FC, cadência,
 * distância, velocidade e potência).
 *
 * <p>Se o arquivo não for um FIT válido ou não tiver mensagens {@code record}, a importação
 * responde 415 com a orientação de exportar em TCX/GPX — nunca inventamos sucesso.</p>
 */
@Component
public class FitParser {

    private static final long FIT_EPOCH_OFFSET_SECONDS = 631_065_600L;
    private static final int GLOBAL_SESSION = 18;
    private static final int GLOBAL_LAP = 19;
    private static final int GLOBAL_RECORD = 20;

    public ParsedActivity parse(byte[] content, String fileName) {
        try {
            return parseInternal(content, fileName);
        } catch (FitFormatException ex) {
            throw ApiException.unsupportedMediaType(
                    "Arquivo .fit não pôde ser lido (" + ex.getMessage()
                            + "). Exporte a atividade em TCX ou GPX e importe novamente.");
        }
    }

    private ParsedActivity parseInternal(byte[] data, String fileName) {
        if (data == null || data.length < 14) {
            throw new FitFormatException("arquivo muito curto");
        }
        int headerSize = data[0] & 0xFF;
        if (headerSize < 12 || headerSize > data.length
                || data[8] != '.' || data[9] != 'F' || data[10] != 'I' || data[11] != 'T') {
            throw new FitFormatException("cabeçalho .FIT inválido");
        }
        long dataSize = readUnsigned(data, 4, 4, false);
        if (dataSize <= 0) {
            throw new FitFormatException("sem dados");
        }
        int start = headerSize;
        int end = (int) Math.min(data.length, start + dataSize);

        Map<Integer, Definition> definitions = new HashMap<>();
        List<RawRecord> records = new ArrayList<>();
        List<RawLap> laps = new ArrayList<>();
        Sport sessionSport = null;
        long lastTimestamp = 0;
        boolean hasLastTimestamp = false;

        int position = start;
        while (position < end) {
            int header = data[position++] & 0xFF;
            boolean compressed = (header & 0x80) != 0;
            boolean isDefinition = !compressed && (header & 0x40) != 0;
            if (isDefinition) {
                Definition parsed = readDefinition(data, position, header);
                position = parsed.endPosition();
                definitions.put(parsed.localType(), parsed);
                continue;
            }

            int localType = compressed ? (header >> 5) & 0x03 : header & 0x0F;
            Definition definition = definitions.get(localType);
            if (definition == null) {
                throw new FitFormatException("mensagem local " + localType + " sem definição");
            }
            Decoded decoded = readDataMessage(data, position, definition);
            position = decoded.endPosition();

            Map<Integer, Long> values = decoded.values();
            Long timestamp = values.get(253);
            if (timestamp != null) {
                lastTimestamp = timestamp;
                hasLastTimestamp = true;
            } else if (compressed && hasLastTimestamp) {
                int offset = header & 0x1F;
                long base = lastTimestamp & ~0x1FL;
                if (offset < (lastTimestamp & 0x1FL)) {
                    base += 32;
                }
                timestamp = base + offset;
                lastTimestamp = timestamp;
            }

            int global = definition.globalNumber();
            if (global == GLOBAL_RECORD && timestamp != null) {
                records.add(toRecord(values, timestamp));
            } else if (global == GLOBAL_SESSION) {
                Long sport = values.get(5);
                if (sport != null) {
                    sessionSport = sportOf(sport.intValue());
                }
            } else if (global == GLOBAL_LAP) {
                Long lapStart = values.get(2);
                Long timerTime = values.get(8);
                Long distance = values.get(9);
                Long calories = values.get(11);
                laps.add(new RawLap(lapStart, timerTime, distance, calories));
            }
        }

        if (records.isEmpty()) {
            throw new FitFormatException("nenhum record com timestamp");
        }
        records.sort(Comparator.comparingLong(RawRecord::timestamp));
        Instant startTime = Instant.ofEpochSecond(FIT_EPOCH_OFFSET_SECONDS + records.get(0).timestamp());

        List<ParsedActivity.ParsedSample> samples = new ArrayList<>(records.size());
        long previousOffset = Long.MIN_VALUE;
        for (RawRecord record : records) {
            long offset = record.timestamp() - records.get(0).timestamp();
            if (offset < 0 || offset < previousOffset) {
                continue;
            }
            previousOffset = offset;
            samples.add(new ParsedActivity.ParsedSample(offset, record.distanceM(), record.hr(),
                    record.speedMps(), record.power(), record.cadence(), record.elevationM(),
                    record.lat(), record.lon()));
        }

        long maxOffset = samples.get(samples.size() - 1).offsetSec();
        List<ParsedActivity.ParsedLap> parsedLaps = new ArrayList<>();
        int index = 0;
        for (RawLap lap : laps) {
            if (lap.startTime() == null || lap.timerTime() == null) {
                continue;
            }
            long lapStart = lap.startTime() - records.get(0).timestamp();
            long duration = Math.round(lap.timerTime() / 1000.0);
            long lapEnd = lapStart + Math.max(0, duration);
            if (lapStart < 0 || lapStart > maxOffset || lapEnd <= lapStart) {
                continue;
            }
            parsedLaps.add(new ParsedActivity.ParsedLap(index++, lapStart,
                    Math.min(lapEnd, maxOffset),
                    lap.distance() == null ? null : lap.distance() / 100.0,
                    null, null, null,
                    lap.calories() == null ? null : lap.calories().intValue(), null));
        }

        Sport sport = sessionSport == null ? ActivitySportSupport.infer(fileName) : sessionSport;
        return new ParsedActivity(sport, startTime, java.time.ZoneOffset.UTC, samples, parsedLaps, null);
    }

    private Definition readDefinition(byte[] data, int position, int header) {
        if (position + 5 > data.length) {
            throw new FitFormatException("definição truncada");
        }
        boolean developerFields = (header & 0x20) != 0;
        int localType = header & 0x0F;
        position++; // reserved
        boolean bigEndian = (data[position++] & 0xFF) == 1;
        int globalNumber = (int) readUnsigned(data, position, 2, bigEndian);
        position += 2;
        int fieldCount = data[position++] & 0xFF;
        List<FieldDef> fields = new ArrayList<>(fieldCount);
        int offset = 0;
        for (int i = 0; i < fieldCount; i++) {
            if (position + 3 > data.length) {
                throw new FitFormatException("campo de definição truncado");
            }
            int number = data[position++] & 0xFF;
            int size = data[position++] & 0xFF;
            int baseType = data[position++] & 0xFF;
            fields.add(new FieldDef(number, size, baseType, offset));
            offset += size;
        }
        if (developerFields) {
            if (position >= data.length) {
                throw new FitFormatException("developer fields truncados");
            }
            int developerCount = data[position++] & 0xFF;
            position += developerCount * 3;
        }
        return new Definition(localType, globalNumber, bigEndian, fields, position);
    }

    private Decoded readDataMessage(byte[] data, int position, Definition definition) {
        Map<Integer, Long> values = new LinkedHashMap<>();
        for (FieldDef field : definition.fields()) {
            int fieldStart = position + field.offset();
            if (fieldStart < 0 || fieldStart + field.size() > data.length) {
                throw new FitFormatException("mensagem de dados truncada");
            }
            Long value = readFieldValue(data, fieldStart, field, definition.bigEndian());
            values.put(field.number(), value);
        }
        return new Decoded(values, position + definition.payloadSize());
    }

    private Long readFieldValue(byte[] data, int offset, FieldDef field, boolean bigEndian) {
        int base = field.baseType() & 0x1F;
        if (base == 0x07 || base == 0x08 || base == 0x09 || field.size() > 8) {
            return null; // string/float/array: não usados pelas métricas
        }
        boolean signed = base == 0x01 || base == 0x03 || base == 0x05 || base == 0x0E;
        boolean zeroInvalid = base == 0x0A || base == 0x0B || base == 0x0C || base == 0x10;
        long raw = readUnsigned(data, offset, field.size(), bigEndian);
        if (signed) {
            int bits = field.size() * 8;
            if (bits < 64 && (raw & (1L << (bits - 1))) != 0) {
                raw |= -1L << bits;
            }
        }
        if (zeroInvalid) {
            return raw == 0 ? null : raw;
        }
        long invalid = field.size() >= 8 ? -1L : (1L << (field.size() * 8)) - 1;
        if (signed) {
            invalid = field.size() >= 8 ? Long.MAX_VALUE
                    : (1L << (field.size() * 8 - 1)) - 1;
        }
        return raw == invalid ? null : raw;
    }

    private RawRecord toRecord(Map<Integer, Long> values, long timestamp) {
        Double lat = null;
        Double lon = null;
        Long rawLat = values.get(0);
        Long rawLon = values.get(1);
        if (rawLat != null && rawLon != null) {
            lat = rawLat * (180.0 / 2_147_483_648.0);
            lon = rawLon * (180.0 / 2_147_483_648.0);
        }
        Double altitude = null;
        Long altitudeRaw = values.get(78) != null ? values.get(78) : values.get(2);
        if (altitudeRaw != null && altitudeRaw != Long.MAX_VALUE) {
            altitude = altitudeRaw / 5.0 - 500.0;
        }
        Double distance = values.get(5) == null ? null : values.get(5) / 100.0;
        Double speed = values.get(73) != null ? values.get(73) / 1000.0
                : values.get(6) == null ? null : values.get(6) / 1000.0;
        Integer hr = intOrNull(values.get(3));
        Integer cadence = intOrNull(values.get(4));
        Integer power = intOrNull(values.get(7));
        return new RawRecord(timestamp, distance, hr, speed, power, cadence, altitude, lat, lon);
    }

    private Integer intOrNull(Long value) {
        return value == null ? null : value.intValue();
    }

    private Sport sportOf(int value) {
        return switch (value) {
            case 1 -> Sport.RUN;
            case 2 -> Sport.BIKE;
            case 5 -> Sport.SWIM;
            default -> null;
        };
    }

    private static long readUnsigned(byte[] data, int offset, int size, boolean bigEndian) {
        long value = 0;
        for (int i = 0; i < size; i++) {
            int index = bigEndian ? offset + size - 1 - i : offset + i;
            value |= ((long) (data[index] & 0xFF)) << (8 * i);
        }
        return value;
    }

    private record FieldDef(int number, int size, int baseType, int offset) {
    }

    private record Definition(int localType, int globalNumber, boolean bigEndian,
                              List<FieldDef> fields, int endPosition) {
        int payloadSize() {
            int size = 0;
            for (FieldDef field : fields) {
                size = Math.max(size, field.offset() + field.size());
            }
            return size;
        }
    }

    private record Decoded(Map<Integer, Long> values, int endPosition) {
    }

    private record RawRecord(long timestamp, Double distanceM, Integer hr, Double speedMps,
                             Integer power, Integer cadence, Double elevationM, Double lat,
                             Double lon) {
    }

    private record RawLap(Long startTime, Long timerTime, Long distance, Long calories) {
    }

    private static final class FitFormatException extends RuntimeException {
        private FitFormatException(String message) {
            super(message);
        }
    }
}
