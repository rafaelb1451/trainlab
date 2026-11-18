package com.trainlab.workout;

import com.trainlab.athlete.Athlete;
import com.trainlab.athlete.AthleteService;
import com.trainlab.athlete.AthleteZone;
import com.trainlab.athlete.SportThreshold;
import com.trainlab.athlete.SportThresholdRepository;
import com.trainlab.athlete.ZoneGenerationService;
import com.trainlab.athlete.ZoneSet;
import com.trainlab.athlete.ZoneSetRepository;
import com.trainlab.common.ApiException;
import com.trainlab.common.FormatUtils;
import com.trainlab.plan.PlannedWorkoutRepository;
import com.trainlab.user.AppUser;
import com.trainlab.user.UserRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;

@Service
public class WorkoutService {

    private static final Set<String> ABSOLUTE_UNITS = Set.of("bpm", "w", "s_per_km", "s_per_100m");

    private final WorkoutRepository workoutRepository;
    private final PlannedWorkoutRepository plannedWorkoutRepository;
    private final AthleteService athleteService;
    private final ZoneSetRepository zoneSetRepository;
    private final SportThresholdRepository thresholdRepository;

    public WorkoutService(WorkoutRepository workoutRepository,
                          PlannedWorkoutRepository plannedWorkoutRepository,
                          AthleteService athleteService,
                          ZoneSetRepository zoneSetRepository,
                          SportThresholdRepository thresholdRepository) {
        this.workoutRepository = workoutRepository;
        this.plannedWorkoutRepository = plannedWorkoutRepository;
        this.athleteService = athleteService;
        this.zoneSetRepository = zoneSetRepository;
        this.thresholdRepository = thresholdRepository;
    }

    @Transactional(readOnly = true)
    public List<WorkoutDtos.WorkoutSummary> list(AppUser currentUser, Sport sport, String q, String tag) {
        requireUser(currentUser);
        List<Workout> workouts;
        if (currentUser.getRole() == UserRole.COACH) {
            workouts = workoutRepository.findByCoachIdOrderByUpdatedAtDesc(currentUser.getId());
        } else if (currentUser.getRole() == UserRole.ATHLETE) {
            UUID athleteId = athleteService.athleteIdOf(currentUser);
            workouts = athleteId == null ? List.of() : workoutRepository.findAssignedToAthlete(athleteId);
        } else {
            throw ApiException.forbidden("Acesso negado");
        }

        String query = q == null ? null : q.trim().toLowerCase(Locale.ROOT);
        String tagFilter = tag == null ? null : tag.trim().toLowerCase(Locale.ROOT);
        return workouts.stream()
                .filter(w -> sport == null || w.getSport() == sport)
                .filter(w -> query == null || query.isBlank()
                        || w.getName().toLowerCase(Locale.ROOT).contains(query)
                        || (w.getDescription() != null
                        && w.getDescription().toLowerCase(Locale.ROOT).contains(query)))
                .filter(w -> tagFilter == null || tagFilter.isBlank()
                        || w.getTags().stream().anyMatch(t -> t.toLowerCase(Locale.ROOT).equals(tagFilter)))
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkoutDtos.WorkoutDetail get(UUID id, AppUser currentUser) {
        Workout workout = findWorkout(id);
        assertCanRead(workout, currentUser);
        return toDetail(workout);
    }

    @Transactional
    public WorkoutDtos.WorkoutDetail create(AppUser currentUser, WorkoutDtos.WorkoutRequest request) {
        requireCoach(currentUser);
        Workout workout = new Workout();
        workout.setCoachId(currentUser.getId());
        applyScalars(workout, request);
        applyBlocks(workout, request.blocks());
        workout = workoutRepository.saveAndFlush(workout);
        return toDetail(workout);
    }

    @Transactional
    public WorkoutDtos.WorkoutDetail update(UUID id, AppUser currentUser, WorkoutDtos.WorkoutRequest request) {
        Workout workout = findWorkout(id);
        assertCoachOwner(workout, currentUser);
        applyScalars(workout, request);
        applyBlocks(workout, request.blocks());
        workout.setEstimatedDurationSec(workout.calculateEstimatedDurationSec());
        workout = workoutRepository.saveAndFlush(workout);
        return toDetail(workout);
    }

    @Transactional
    public void delete(UUID id, AppUser currentUser) {
        Workout workout = findWorkout(id);
        assertCoachOwner(workout, currentUser);
        plannedWorkoutRepository.deleteByWorkoutId(id);
        workoutRepository.delete(workout);
    }

    @Transactional
    public WorkoutDtos.WorkoutDetail duplicate(UUID id, AppUser currentUser) {
        Workout source = findWorkout(id);
        assertCoachOwner(source, currentUser);

        Workout copy = new Workout();
        copy.setCoachId(currentUser.getId());
        copy.setName(source.getName() + " (cópia)");
        copy.setSport(source.getSport());
        copy.setType(source.getType());
        copy.setDescription(source.getDescription());
        copy.setTags(new ArrayList<>(source.getTags()));
        copy.setDifficulty(source.getDifficulty());
        copy.setArchived(false);
        for (WorkoutBlock block : source.getBlocks()) {
            WorkoutBlock newBlock = new WorkoutBlock();
            newBlock.setPosition(block.getPosition());
            newBlock.setRepeatCount(block.getRepeatCount());
            newBlock.setTitle(block.getTitle());
            newBlock.setNotes(block.getNotes());
            for (WorkoutStep step : block.getSteps()) {
                newBlock.addStep(copyStep(step));
            }
            copy.addBlock(newBlock);
        }
        copy.setEstimatedDurationSec(copy.calculateEstimatedDurationSec());
        copy = workoutRepository.saveAndFlush(copy);
        return toDetail(copy);
    }

    @Transactional(readOnly = true)
    public List<String> tags(AppUser currentUser) {
        requireUser(currentUser);
        List<Workout> workouts;
        if (currentUser.getRole() == UserRole.COACH) {
            workouts = workoutRepository.findByCoachIdOrderByUpdatedAtDesc(currentUser.getId());
        } else {
            UUID athleteId = athleteService.athleteIdOf(currentUser);
            workouts = athleteId == null ? List.of() : workoutRepository.findAssignedToAthlete(athleteId);
        }
        TreeMap<String, String> unique = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (Workout workout : workouts) {
            for (String tag : workout.getTags()) {
                if (tag != null && !tag.isBlank()) {
                    unique.putIfAbsent(tag.trim(), tag.trim());
                }
            }
        }
        return new ArrayList<>(unique.values());
    }

    @Transactional(readOnly = true)
    public WorkoutDtos.WorkoutPreview preview(UUID id, UUID athleteId, AppUser currentUser) {
        Workout workout = findWorkout(id);
        assertCanRead(workout, currentUser);
        Athlete athlete = athleteService.resolveForPreview(currentUser, athleteId);
        if (athlete == null && currentUser.getRole() == UserRole.ATHLETE) {
            athlete = athleteService.resolveForPreview(currentUser, athleteService.athleteIdOf(currentUser));
        }

        Map<ZoneType, ZoneSet> zoneSets = new EnumMap<>(ZoneType.class);
        SportThreshold threshold = null;
        if (athlete != null) {
            for (ZoneSet zoneSet : zoneSetRepository.findByAthleteIdAndSport(athlete.getId(), workout.getSport())) {
                zoneSets.put(zoneSet.getZoneType(), zoneSet);
            }
            threshold = thresholdRepository.findByAthleteIdAndSport(athlete.getId(), workout.getSport()).orElse(null);
        }

        int totalDuration = 0;
        int totalDistance = 0;
        Map<ZoneType, TreeMap<Integer, Integer>> distribution = new EnumMap<>(ZoneType.class);
        List<WorkoutDtos.PreviewBlock> previewBlocks = new ArrayList<>();

        for (WorkoutBlock block : workout.getBlocks()) {
            int repeat = block.getRepeatCount() == null ? 1 : block.getRepeatCount();
            List<WorkoutDtos.PreviewStep> previewSteps = new ArrayList<>();
            for (WorkoutStep step : block.getSteps()) {
                Resolved resolved = resolveTarget(step.getTarget(), workout, zoneSets, threshold);
                previewSteps.add(new WorkoutDtos.PreviewStep(step.getRole(), step.getDurationType(),
                        step.getDurationSec(), step.getDistanceM(), resolved.target()));

                if (step.getDurationType() == DurationType.TIME && step.getDurationSec() != null) {
                    int seconds = step.getDurationSec() * repeat;
                    totalDuration += seconds;
                    if (resolved.zoneType() != null && resolved.zoneNumber() != null) {
                        distribution.computeIfAbsent(resolved.zoneType(), ignored -> new TreeMap<>())
                                .merge(resolved.zoneNumber(), seconds, Integer::sum);
                    }
                }
                if (step.getDistanceM() != null) {
                    totalDistance += step.getDistanceM() * repeat;
                }
            }
            previewBlocks.add(new WorkoutDtos.PreviewBlock(repeat, block.getTitle(), previewSteps));
        }

        Map<String, Map<String, Integer>> zoneDistribution = new java.util.LinkedHashMap<>();
        for (ZoneType type : List.of(ZoneType.HR, ZoneType.PACE, ZoneType.POWER)) {
            TreeMap<Integer, Integer> values = distribution.get(type);
            if (values != null && !values.isEmpty()) {
                Map<String, Integer> byZone = new java.util.LinkedHashMap<>();
                values.forEach((zone, seconds) -> byZone.put(String.valueOf(zone), seconds));
                zoneDistribution.put(type.name(), byZone);
            }
        }

        return new WorkoutDtos.WorkoutPreview(workout.getId(), athlete == null ? null : athlete.getId(),
                workout.getSport(), athlete == null ? null : athlete.getDisplayName(),
                new WorkoutDtos.PreviewTotals(totalDuration, totalDistance, zoneDistribution),
                previewBlocks);
    }

    public WorkoutDtos.WorkoutSummary toSummary(Workout workout) {
        return new WorkoutDtos.WorkoutSummary(workout.getId(), workout.getName(), workout.getSport(),
                workout.getType(), workout.getDifficulty(), new ArrayList<>(workout.getTags()),
                workout.getEstimatedDurationSec(), workout.countSteps(), workout.getUpdatedAt());
    }

    public WorkoutDtos.WorkoutDetail toDetail(Workout workout) {
        List<WorkoutDtos.BlockDto> blocks = workout.getBlocks().stream().map(block -> {
            List<WorkoutDtos.StepDto> steps = block.getSteps().stream().map(step -> new WorkoutDtos.StepDto(
                    step.getId(), step.getPosition(), step.getRole(), step.getDurationType(),
                    step.getDurationSec(), step.getDistanceM(), step.getNotes(), toTargetDto(step.getTarget())
            )).toList();
            return new WorkoutDtos.BlockDto(block.getId(), block.getPosition(), block.getRepeatCount(),
                    block.getTitle(), block.getNotes(), steps);
        }).toList();

        return new WorkoutDtos.WorkoutDetail(workout.getId(), workout.getName(), workout.getSport(),
                workout.getType(), workout.getDescription(), new ArrayList<>(workout.getTags()),
                workout.getDifficulty(), workout.getEstimatedDurationSec(), workout.countSteps(),
                workout.isArchived(), workout.getCreatedAt(), workout.getUpdatedAt(), blocks);
    }

    private WorkoutDtos.TargetDto toTargetDto(Target target) {
        if (target == null) {
            return new WorkoutDtos.TargetDto(TargetType.FREE, null, null, null, null, null, null, null);
        }
        return new WorkoutDtos.TargetDto(target.getType(), target.getZone(), target.getMinValue(),
                target.getMaxValue(), target.getDisplay(), target.getAbsoluteMin(), target.getAbsoluteMax(),
                target.getAbsoluteUnit());
    }

    private void applyScalars(Workout workout, WorkoutDtos.WorkoutRequest request) {
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.badRequest("O nome do treino é obrigatório");
        }
        if (request.sport() == null) {
            throw ApiException.badRequest("O esporte do treino é obrigatório");
        }
        if (request.type() == null) {
            throw ApiException.badRequest("O tipo do treino é obrigatório");
        }
        int difficulty = request.difficulty() == null ? 3 : request.difficulty();
        if (difficulty < 1 || difficulty > 5) {
            throw ApiException.badRequest("A dificuldade deve estar entre 1 e 5");
        }
        workout.setName(request.name().trim());
        workout.setSport(request.sport());
        workout.setType(request.type());
        workout.setDescription(request.description());
        workout.setDifficulty(difficulty);
        workout.setTags(normalizeTags(request.tags()));
    }

    private List<String> normalizeTags(List<String> tags) {
        if (tags == null) {
            return new ArrayList<>();
        }
        LinkedHashSet<String> unique = new LinkedHashSet<>();
        for (String tag : tags) {
            if (tag != null && !tag.isBlank()) {
                unique.add(tag.trim());
            }
        }
        return new ArrayList<>(unique);
    }

    private void applyBlocks(Workout workout, List<WorkoutDtos.BlockRequest> blocks) {
        workout.getBlocks().clear();
        if (blocks == null) {
            workout.setEstimatedDurationSec(0);
            return;
        }
        for (int blockIndex = 0; blockIndex < blocks.size(); blockIndex++) {
            WorkoutDtos.BlockRequest blockRequest = blocks.get(blockIndex);
            if (blockRequest == null) {
                throw ApiException.badRequest("Bloco inválido na posição " + blockIndex);
            }
            int repeat = blockRequest.repeatCount() == null ? 1 : blockRequest.repeatCount();
            if (repeat < 1) {
                throw ApiException.badRequest("A repetição do bloco " + (blockIndex + 1) + " deve ser no mínimo 1");
            }
            WorkoutBlock block = new WorkoutBlock();
            block.setPosition(blockIndex);
            block.setRepeatCount(repeat);
            block.setTitle(blockRequest.title());
            block.setNotes(blockRequest.notes());
            List<WorkoutDtos.StepRequest> steps = blockRequest.steps() == null ? List.of() : blockRequest.steps();
            for (int stepIndex = 0; stepIndex < steps.size(); stepIndex++) {
                WorkoutStep step = buildStep(steps.get(stepIndex), stepIndex, blockIndex);
                block.addStep(step);
            }
            workout.addBlock(block);
        }
        workout.setEstimatedDurationSec(workout.calculateEstimatedDurationSec());
    }

    private WorkoutStep buildStep(WorkoutDtos.StepRequest request, int stepIndex, int blockIndex) {
        if (request == null) {
            throw ApiException.badRequest("Step inválido no bloco " + (blockIndex + 1));
        }
        if (request.role() == null) {
            throw ApiException.badRequest("O papel do step é obrigatório (bloco " + (blockIndex + 1)
                    + ", step " + (stepIndex + 1) + ")");
        }
        if (request.durationType() == null) {
            throw ApiException.badRequest("O tipo de duração do step é obrigatório (bloco " + (blockIndex + 1)
                    + ", step " + (stepIndex + 1) + ")");
        }
        if (request.durationType() == DurationType.TIME
                && (request.durationSec() == null || request.durationSec() <= 0)) {
            throw ApiException.badRequest("Step de tempo precisa de durationSec maior que zero");
        }
        if (request.durationType() == DurationType.DISTANCE
                && (request.distanceM() == null || request.distanceM() <= 0)) {
            throw ApiException.badRequest("Step de distância precisa de distanceM maior que zero");
        }

        WorkoutStep step = new WorkoutStep();
        step.setPosition(stepIndex);
        step.setRole(request.role());
        step.setDurationType(request.durationType());
        step.setDurationSec(request.durationType() == DurationType.TIME ? request.durationSec() : null);
        step.setDistanceM(request.durationType() == DurationType.DISTANCE ? request.distanceM() : null);
        step.setNotes(request.notes());
        step.setTarget(buildTarget(request.target()));
        return step;
    }

    private Target buildTarget(WorkoutDtos.TargetRequest request) {
        if (request == null) {
            return new Target(TargetType.FREE, null, null, null, null, null, null, null);
        }
        TargetType type = request.type() == null ? TargetType.FREE : request.type();
        if (type == TargetType.HR_ZONE || type == TargetType.PACE_ZONE || type == TargetType.POWER_ZONE) {
            if (request.zone() == null || request.zone() < 1) {
                throw ApiException.badRequest("Alvos de zona precisam de um número de zona válido");
            }
        }
        if (type == TargetType.HR_PERCENT || type == TargetType.PACE_PERCENT
                || type == TargetType.POWER_PERCENT) {
            if (request.minValue() == null || request.maxValue() == null
                    || request.minValue() <= 0 || request.maxValue() <= 0) {
                throw ApiException.badRequest("Alvos percentuais precisam de minValue e maxValue positivos");
            }
        }
        if (type == TargetType.RPE) {
            if (request.minValue() == null || request.maxValue() == null
                    || request.minValue() < 1 || request.maxValue() > 10) {
                throw ApiException.badRequest("Alvos de RPE precisam de minValue e maxValue entre 1 e 10");
            }
        }
        if (request.absoluteMin() != null || request.absoluteMax() != null) {
            if (request.absoluteUnit() == null || !ABSOLUTE_UNITS.contains(request.absoluteUnit())) {
                throw ApiException.badRequest("Informe absoluteUnit válido: bpm, w, s_per_km ou s_per_100m");
            }
        }
        return new Target(type, request.zone(), request.minValue(), request.maxValue(), request.display(),
                request.absoluteMin(), request.absoluteMax(), request.absoluteUnit());
    }

    private WorkoutStep copyStep(WorkoutStep source) {
        WorkoutStep copy = new WorkoutStep();
        copy.setPosition(source.getPosition());
        copy.setRole(source.getRole());
        copy.setDurationType(source.getDurationType());
        copy.setDurationSec(source.getDurationSec());
        copy.setDistanceM(source.getDistanceM());
        copy.setNotes(source.getNotes());
        Target t = source.getTarget();
        if (t != null) {
            copy.setTarget(new Target(t.getType(), t.getZone(), t.getMinValue(), t.getMaxValue(),
                    t.getDisplay(), t.getAbsoluteMin(), t.getAbsoluteMax(), t.getAbsoluteUnit()));
        }
        return copy;
    }

    private Resolved resolveTarget(Target target, Workout workout, Map<ZoneType, ZoneSet> zoneSets,
                                   SportThreshold threshold) {
        if (target == null || target.getType() == null) {
            return new Resolved(new WorkoutDtos.PreviewTarget("FREE", null, null, null, null, "Livre", null),
                    null, null);
        }
        TargetType type = target.getType();
        return switch (type) {
            case FREE -> new Resolved(new WorkoutDtos.PreviewTarget("FREE", null, null, null, null, "Livre", null),
                    null, null);
            case RPE -> resolveRpe(target);
            case HR_ZONE, PACE_ZONE, POWER_ZONE -> resolveZoneTarget(target, workout, zoneSets);
            case HR_PERCENT, PACE_PERCENT, POWER_PERCENT -> resolvePercentTarget(target, workout, zoneSets, threshold);
        };
    }

    private Resolved resolveZoneTarget(Target target, Workout workout, Map<ZoneType, ZoneSet> zoneSets) {
        ZoneType zoneType = zoneTypeOf(target.getType());
        Integer zoneNumber = target.getZone();
        ZoneSet set = zoneSets.get(zoneType);
        AthleteZone row = findZone(set, zoneNumber);
        String defaultUnit = ZoneGenerationService.defaultUnit(workout.getSport(), zoneType);
        String unit = row != null ? row.getUnit() : defaultUnit;
        String zoneName = row != null ? row.getName() : null;

        WorkoutDtos.PreviewTarget previewTarget;
        if (row == null) {
            previewTarget = new WorkoutDtos.PreviewTarget(target.getType().name(), zoneNumber, defaultUnit,
                    null, null, "Zona não configurada", null);
        } else {
            String display = zoneNumber == null ? displayFor(unit, row.getMinValue(), row.getMaxValue())
                    : "Z" + zoneNumber + " · " + displayFor(unit, row.getMinValue(), row.getMaxValue());
            previewTarget = new WorkoutDtos.PreviewTarget(target.getType().name(), zoneNumber, unit,
                    row.getMinValue(), row.getMaxValue(), display, zoneName);
        }
        return new Resolved(withAbsolute(previewTarget, target), zoneType, zoneNumber);
    }

    private Resolved resolvePercentTarget(Target target, Workout workout, Map<ZoneType, ZoneSet> zoneSets,
                                          SportThreshold threshold) {
        ZoneType zoneType = zoneTypeOf(target.getType());
        int minPercent = target.getMinValue() == null ? 100 : target.getMinValue();
        int maxPercent = target.getMaxValue() == null ? 100 : target.getMaxValue();
        String suffix = switch (target.getType()) {
            case HR_PERCENT -> "LTHR";
            case POWER_PERCENT -> "FTP";
            case PACE_PERCENT -> workout.getSport() == Sport.SWIM ? "CSS" : "pace";
            default -> "";
        };
        Integer resolvedMin = null;
        Integer resolvedMax = null;
        String unit = ZoneGenerationService.defaultUnit(workout.getSport(), zoneType);

        if (target.getType() == TargetType.HR_PERCENT) {
            Integer lthr = threshold == null ? null : threshold.getLthr();
            if (lthr == null && threshold != null && threshold.getMaxHr() != null) {
                lthr = (int) Math.round(threshold.getMaxHr() * 0.85);
            }
            if (lthr != null) {
                resolvedMin = (int) Math.round(lthr * minPercent / 100.0);
                resolvedMax = (int) Math.round(lthr * maxPercent / 100.0);
            }
            unit = "bpm";
        } else if (target.getType() == TargetType.POWER_PERCENT) {
            Integer ftp = threshold == null ? null : threshold.getFtpWatts();
            if (ftp != null) {
                resolvedMin = (int) Math.round(ftp * minPercent / 100.0);
                resolvedMax = (int) Math.round(ftp * maxPercent / 100.0);
            }
            unit = "w";
        } else {
            Integer thresholdPace = threshold == null ? null
                    : (workout.getSport() == Sport.SWIM ? threshold.getCssSecPer100m()
                    : threshold.getThresholdPaceSecPerKm());
            if (thresholdPace != null) {
                resolvedMin = (int) Math.round(thresholdPace * 100.0 / maxPercent);
                resolvedMax = (int) Math.round(thresholdPace * 100.0 / minPercent);
            }
            unit = workout.getSport() == Sport.SWIM ? "s_per_100m" : "s_per_km";
        }

        if (resolvedMin == null || resolvedMax == null) {
            WorkoutDtos.PreviewTarget unavailable = new WorkoutDtos.PreviewTarget(target.getType().name(),
                    null, unit, null, null, "Limiar não configurado", null);
            return new Resolved(withAbsolute(unavailable, target), zoneType, null);
        }

        int min = Math.min(resolvedMin, resolvedMax);
        int max = Math.max(resolvedMin, resolvedMax);
        Integer matchedZone = findZoneNumber(zoneSets.get(zoneType), min, max);
        AthleteZone matchedRow = findZone(zoneSets.get(zoneType), matchedZone);
        String zoneName = matchedRow == null ? null : matchedRow.getName();
        String pctLabel = minPercent == maxPercent
                ? minPercent + "% " + suffix
                : minPercent + "–" + maxPercent + "% " + suffix;
        String display = displayFor(unit, min, max) + " (" + pctLabel + ")";
        WorkoutDtos.PreviewTarget previewTarget = new WorkoutDtos.PreviewTarget(target.getType().name(),
                matchedZone, unit, min, max, display, zoneName);
        return new Resolved(withAbsolute(previewTarget, target), zoneType, matchedZone);
    }

    private Resolved resolveRpe(Target target) {
        Integer min = target.getMinValue();
        Integer max = target.getMaxValue();
        if (min == null && max == null) {
            return new Resolved(new WorkoutDtos.PreviewTarget("RPE", null, null, null, null, "RPE", null),
                    null, null);
        }
        if (min == null) {
            min = max;
        }
        if (max == null) {
            max = min;
        }
        String label = rpeLabel(max);
        String display = min.equals(max) ? "RPE " + min + " (" + label + ")"
                : "RPE " + min + "–" + max + " (" + label + ")";
        WorkoutDtos.PreviewTarget previewTarget = new WorkoutDtos.PreviewTarget("RPE", null, null,
                min, max, display, null);
        return new Resolved(withAbsolute(previewTarget, target), null, null);
    }

    private WorkoutDtos.PreviewTarget withAbsolute(WorkoutDtos.PreviewTarget base, Target target) {
        if (target.getAbsoluteMin() == null && target.getAbsoluteMax() == null) {
            return base;
        }
        Integer min = target.getAbsoluteMin() != null ? target.getAbsoluteMin() : base.min();
        Integer max = target.getAbsoluteMax() != null ? target.getAbsoluteMax() : base.max();
        String unit = target.getAbsoluteUnit() != null ? target.getAbsoluteUnit() : base.unit();
        String prefix = "";
        if (base.zone() != null && base.type() != null && base.type().endsWith("_ZONE")) {
            prefix = "Z" + base.zone() + " · ";
        }
        String display = prefix + displayFor(unit, min, max);
        return new WorkoutDtos.PreviewTarget(base.type(), base.zone(), unit, min, max, display, base.zoneName());
    }

    private String displayFor(String unit, Integer min, Integer max) {
        if (unit == null) {
            return FormatUtils.rangeLabel(min, max);
        }
        return switch (unit) {
            case "s_per_km" -> FormatUtils.formatPaceRange(min, max) + " /km";
            case "s_per_100m" -> FormatUtils.formatPaceRange(min, max) + " /100m";
            case "bpm" -> FormatUtils.rangeLabel(min, max) + " bpm";
            case "w" -> FormatUtils.rangeLabel(min, max) + " W";
            default -> FormatUtils.rangeLabel(min, max) + " " + unit;
        };
    }

    private String rpeLabel(int value) {
        if (value <= 2) {
            return "muito leve";
        }
        if (value <= 4) {
            return "leve";
        }
        if (value <= 6) {
            return "moderado";
        }
        if (value <= 8) {
            return "difícil";
        }
        return "máximo";
    }

    private ZoneType zoneTypeOf(TargetType type) {
        return switch (type) {
            case HR_ZONE, HR_PERCENT -> ZoneType.HR;
            case PACE_ZONE, PACE_PERCENT -> ZoneType.PACE;
            case POWER_ZONE, POWER_PERCENT -> ZoneType.POWER;
            default -> null;
        };
    }

    private AthleteZone findZone(ZoneSet set, Integer zoneNumber) {
        if (set == null || zoneNumber == null) {
            return null;
        }
        return set.getZones().stream()
                .filter(zone -> zoneNumber.equals(zone.getZoneNumber()))
                .findFirst()
                .orElse(null);
    }

    private Integer findZoneNumber(ZoneSet set, int min, int max) {
        if (set == null) {
            return null;
        }
        int midpoint = (min + max) / 2;
        return set.getZones().stream()
                .filter(zone -> midpoint >= Math.min(zone.getMinValue(), zone.getMaxValue())
                        && midpoint <= Math.max(zone.getMinValue(), zone.getMaxValue()))
                .map(AthleteZone::getZoneNumber)
                .findFirst()
                .orElse(null);
    }

    private Workout findWorkout(UUID id) {
        return workoutRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Treino não encontrado"));
    }

    private void assertCanRead(Workout workout, AppUser currentUser) {
        requireUser(currentUser);
        if (currentUser.getRole() == UserRole.COACH) {
            if (!currentUser.getId().equals(workout.getCoachId())) {
                throw ApiException.forbidden("Você não tem acesso a este treino");
            }
            return;
        }
        if (currentUser.getRole() == UserRole.ATHLETE) {
            UUID athleteId = athleteService.athleteIdOf(currentUser);
            if (athleteId == null || !plannedWorkoutRepository.existsByAthleteIdAndWorkoutId(athleteId,
                    workout.getId())) {
                throw ApiException.forbidden("Este treino não está atribuído a você");
            }
            return;
        }
        throw ApiException.forbidden("Acesso negado");
    }

    private void assertCoachOwner(Workout workout, AppUser currentUser) {
        requireCoach(currentUser);
        if (!currentUser.getId().equals(workout.getCoachId())) {
            throw ApiException.forbidden("Você só pode alterar treinos que você criou");
        }
    }

    private void requireUser(AppUser user) {
        if (user == null) {
            throw ApiException.unauthorized("Autenticação necessária");
        }
    }

    private void requireCoach(AppUser user) {
        requireUser(user);
        if (user.getRole() != UserRole.COACH) {
            throw ApiException.forbidden("Apenas o treinador pode executar esta ação");
        }
    }

    private record Resolved(WorkoutDtos.PreviewTarget target, ZoneType zoneType, Integer zoneNumber) {
    }
}
