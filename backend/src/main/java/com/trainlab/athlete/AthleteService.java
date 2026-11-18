package com.trainlab.athlete;

import com.trainlab.common.ApiException;
import com.trainlab.common.FormatUtils;
import com.trainlab.plan.PlannedWorkoutRepository;
import com.trainlab.user.AppUser;
import com.trainlab.user.UserRepository;
import com.trainlab.user.UserRole;
import com.trainlab.workout.Sport;
import com.trainlab.workout.ZoneType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class AthleteService {

    private final AthleteRepository athleteRepository;
    private final SportThresholdRepository thresholdRepository;
    private final ZoneSetRepository zoneSetRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ZoneGenerationService zoneGenerationService;
    private final PlannedWorkoutRepository plannedWorkoutRepository;
    private final DailyMetricRepository dailyMetricRepository;

    public AthleteService(AthleteRepository athleteRepository,
                          SportThresholdRepository thresholdRepository,
                          ZoneSetRepository zoneSetRepository,
                          UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          ZoneGenerationService zoneGenerationService,
                          PlannedWorkoutRepository plannedWorkoutRepository,
                          DailyMetricRepository dailyMetricRepository) {
        this.athleteRepository = athleteRepository;
        this.thresholdRepository = thresholdRepository;
        this.zoneSetRepository = zoneSetRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.zoneGenerationService = zoneGenerationService;
        this.plannedWorkoutRepository = plannedWorkoutRepository;
        this.dailyMetricRepository = dailyMetricRepository;
    }

    @Transactional(readOnly = true)
    public List<AthleteDtos.AthleteSummary> list(AppUser currentUser) {
        requireUser(currentUser);
        List<Athlete> athletes;
        if (currentUser.getRole() == UserRole.COACH) {
            athletes = athleteRepository.findByCoachIdOrderByDisplayNameAsc(currentUser.getId());
        } else if (currentUser.getRole() == UserRole.ATHLETE) {
            athletes = athleteRepository.findByUserId(currentUser.getId()).map(List::of).orElseGet(List::of);
        } else {
            athletes = List.of();
        }
        return athletes.stream().map(this::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public AthleteDtos.AthleteDetail get(UUID id, AppUser currentUser) {
        return toDetail(requireReadable(id, currentUser));
    }

    @Transactional
    public AthleteDtos.AthleteDetail create(AppUser currentUser, AthleteDtos.AthleteRequest request) {
        requireCoach(currentUser);
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("Já existe um usuário cadastrado com este email");
        }

        AppUser user = new AppUser();
        user.setName(request.displayName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(UserRole.ATHLETE);
        user = userRepository.save(user);

        Athlete athlete = new Athlete();
        athlete.setUserId(user.getId());
        athlete.setCoachId(currentUser.getId());
        athlete.setDisplayName(request.displayName().trim());
        athlete.setBirthDate(request.birthDate());
        athlete.setSex(request.sex());
        athlete.setHeightCm(request.heightCm());
        athlete.setWeightKg(request.weightKg());
        athlete.setNotes(request.notes());
        athlete.setGoal(trimToNull(request.goal()));
        athlete.setEventDate(request.eventDate());
        athlete.setWeeklyHoursAvailable(request.weeklyHoursAvailable());
        athlete = athleteRepository.save(athlete);

        return toDetail(athlete);
    }

    @Transactional
    public AthleteDtos.AthleteDetail update(UUID id, AppUser currentUser,
                                            AthleteDtos.AthleteUpdateRequest request) {
        Athlete athlete = requireReadable(id, currentUser);
        athlete.setDisplayName(request.displayName().trim());
        athlete.setBirthDate(request.birthDate());
        athlete.setSex(request.sex());
        athlete.setHeightCm(request.heightCm());
        athlete.setWeightKg(request.weightKg());
        athlete.setNotes(request.notes());
        athlete.setGoal(trimToNull(request.goal()));
        athlete.setEventDate(request.eventDate());
        athlete.setWeeklyHoursAvailable(request.weeklyHoursAvailable());
        athlete = athleteRepository.save(athlete);
        return toDetail(athlete);
    }

    @Transactional
    public void delete(UUID id, AppUser currentUser) {
        Athlete athlete = requireOwnedByCoach(id, currentUser);
        plannedWorkoutRepository.deleteByAthleteId(athlete.getId());
        dailyMetricRepository.deleteByAthleteId(athlete.getId());
        zoneSetRepository.deleteByAthleteId(athlete.getId());
        thresholdRepository.deleteByAthleteId(athlete.getId());
        athleteRepository.delete(athlete);
        userRepository.deleteById(athlete.getUserId());
    }

    @Transactional(readOnly = true)
    public List<AthleteDtos.ThresholdDto> getThresholds(UUID athleteId, AppUser currentUser) {
        requireReadable(athleteId, currentUser);
        return sortedThresholds(athleteId).stream().map(this::toThresholdDto).toList();
    }

    @Transactional
    public AthleteDtos.ThresholdDto putThreshold(UUID athleteId, Sport sport, AppUser currentUser,
                                                 AthleteDtos.ThresholdRequest request) {
        Athlete athlete = requireOwnedByCoach(athleteId, currentUser);
        SportThreshold threshold = thresholdRepository.findByAthleteIdAndSport(athleteId, sport)
                .orElseGet(() -> {
                    SportThreshold created = new SportThreshold();
                    created.setAthleteId(athleteId);
                    created.setSport(sport);
                    return created;
                });
        threshold.setMaxHr(request.maxHr());
        threshold.setRestingHr(request.restingHr());
        threshold.setLthr(request.lthr());
        threshold.setFtpWatts(request.ftpWatts());
        threshold.setThresholdPaceSecPerKm(request.thresholdPaceSecPerKm());
        threshold.setCssSecPer100m(request.cssSecPer100m());
        threshold = thresholdRepository.save(threshold);

        zoneGenerationService.regenerate(athlete.getId(), sport, threshold);
        return toThresholdDto(threshold);
    }

    @Transactional(readOnly = true)
    public List<AthleteDtos.ZoneDto> getZones(UUID athleteId, AppUser currentUser) {
        requireReadable(athleteId, currentUser);
        return flattenZones(zoneSetRepository.findByAthleteId(athleteId));
    }

    @Transactional
    public List<AthleteDtos.ZoneDto> putZones(UUID athleteId, Sport sport, ZoneType type, AppUser currentUser,
                                              List<AthleteDtos.ZoneInput> inputs) {
        requireOwnedByCoach(athleteId, currentUser);
        zoneGenerationService.replace(athleteId, sport, type, inputs);
        return zoneSetRepository.findByAthleteIdAndSportAndZoneType(athleteId, sport, type)
                .map(zoneSet -> zoneSet.getZones().stream()
                        .sorted(Comparator.comparingInt(AthleteZone::getZoneNumber))
                        .map(zone -> toZoneDto(zone, sport, type))
                        .toList())
                .orElseGet(List::of);
    }

    @Transactional(readOnly = true)
    public Athlete requireReadable(UUID athleteId, AppUser currentUser) {
        requireUser(currentUser);
        Athlete athlete = athleteRepository.findById(athleteId)
                .orElseThrow(() -> ApiException.notFound("Atleta não encontrado"));
        if (currentUser.getRole() == UserRole.COACH) {
            if (!currentUser.getId().equals(athlete.getCoachId())) {
                throw ApiException.forbidden("Você não tem acesso a este atleta");
            }
        } else if (currentUser.getRole() == UserRole.ATHLETE) {
            if (!currentUser.getId().equals(athlete.getUserId())) {
                throw ApiException.forbidden("Você só pode acessar o seu próprio perfil");
            }
        } else {
            throw ApiException.forbidden("Acesso negado");
        }
        return athlete;
    }

    @Transactional(readOnly = true)
    public Athlete requireOwnedByCoach(UUID athleteId, AppUser currentUser) {
        requireCoach(currentUser);
        Athlete athlete = athleteRepository.findById(athleteId)
                .orElseThrow(() -> ApiException.notFound("Atleta não encontrado"));
        if (!currentUser.getId().equals(athlete.getCoachId())) {
            throw ApiException.forbidden("Você só pode acessar atletas que você cadastrou");
        }
        return athlete;
    }

    @Transactional(readOnly = true)
    public Athlete resolveForPreview(AppUser currentUser, UUID athleteId) {
        if (athleteId == null) {
            return null;
        }
        return requireReadable(athleteId, currentUser);
    }

    public List<AthleteDtos.ZoneDto> flattenZones(List<ZoneSet> zoneSets) {
        List<ZoneSet> sortedSets = new ArrayList<>(zoneSets);
        sortedSets.sort(Comparator
                .comparingInt((ZoneSet z) -> z.getSport().ordinal())
                .thenComparingInt(z -> z.getZoneType().ordinal()));
        List<AthleteDtos.ZoneDto> result = new ArrayList<>();
        for (ZoneSet set : sortedSets) {
            set.getZones().stream()
                    .sorted(Comparator.comparingInt(AthleteZone::getZoneNumber))
                    .forEach(zone -> result.add(toZoneDto(zone, set.getSport(), set.getZoneType())));
        }
        return result;
    }

    public AthleteDtos.AthleteSummary toSummary(Athlete athlete) {
        List<SportThreshold> thresholds = sortedThresholds(athlete.getId());
        List<Sport> sports = thresholds.stream().map(SportThreshold::getSport).toList();
        return new AthleteDtos.AthleteSummary(athlete.getId(), athlete.getDisplayName(),
                emailOf(athlete), athlete.getSex(), athlete.getBirthDate(), athlete.getGoal(),
                athlete.getEventDate(), athlete.getWeeklyHoursAvailable(), sports,
                thresholdSummary(thresholds));
    }

    public AthleteDtos.AthleteDetail toDetail(Athlete athlete) {
        List<SportThreshold> thresholds = sortedThresholds(athlete.getId());
        List<Sport> sports = thresholds.stream().map(SportThreshold::getSport).toList();
        List<AthleteDtos.ThresholdDto> dtos = thresholds.stream().map(this::toThresholdDto).toList();
        return new AthleteDtos.AthleteDetail(athlete.getId(), athlete.getDisplayName(), emailOf(athlete),
                athlete.getSex(), athlete.getBirthDate(), athlete.getHeightCm(), athlete.getWeightKg(),
                athlete.getNotes(), athlete.getGoal(), athlete.getEventDate(), athlete.getWeeklyHoursAvailable(),
                sports, thresholdSummary(thresholds), athlete.getCoachId(), dtos);
    }

    public AthleteDtos.ZoneDto toZoneDto(AthleteZone zone, Sport sport, ZoneType type) {
        return new AthleteDtos.ZoneDto(zone.getId(), sport, type, zone.getZoneNumber(), zone.getName(),
                zone.getMinValue(), zone.getMaxValue(), zone.getUnit());
    }

    public AthleteDtos.ThresholdDto toThresholdDto(SportThreshold threshold) {
        return new AthleteDtos.ThresholdDto(threshold.getId(), threshold.getSport(), threshold.getMaxHr(),
                threshold.getRestingHr(), threshold.getLthr(), threshold.getFtpWatts(),
                threshold.getThresholdPaceSecPerKm(), threshold.getCssSecPer100m(), threshold.getUpdatedAt());
    }

    public String emailOf(Athlete athlete) {
        return userRepository.findById(athlete.getUserId()).map(AppUser::getEmail).orElse(null);
    }

    public UUID athleteIdOf(AppUser user) {
        return athleteRepository.findByUserId(user.getId()).map(Athlete::getId).orElse(null);
    }

    private List<SportThreshold> sortedThresholds(UUID athleteId) {
        return thresholdRepository.findByAthleteIdOrderBySportAsc(athleteId).stream()
                .sorted(Comparator.comparingInt(t -> t.getSport().ordinal()))
                .toList();
    }

    private Map<String, String> thresholdSummary(List<SportThreshold> thresholds) {
        Map<String, String> summary = new LinkedHashMap<>();
        for (SportThreshold threshold : thresholds) {
            String text = switch (threshold.getSport()) {
                case RUN -> joinParts(
                        threshold.getLthr() == null ? null : "LTHR " + threshold.getLthr() + " bpm",
                        threshold.getThresholdPaceSecPerKm() == null ? null
                                : "Pace " + FormatUtils.formatPace(threshold.getThresholdPaceSecPerKm()) + "/km");
                case BIKE -> joinParts(
                        threshold.getFtpWatts() == null ? null : "FTP " + threshold.getFtpWatts() + " W",
                        threshold.getLthr() == null ? null : "LTHR " + threshold.getLthr() + " bpm");
                case SWIM -> joinParts(
                        threshold.getCssSecPer100m() == null ? null
                                : "CSS " + FormatUtils.formatPace(threshold.getCssSecPer100m()) + "/100m",
                        threshold.getLthr() == null ? null : "LTHR " + threshold.getLthr() + " bpm");
            };
            summary.put(threshold.getSport().name(), text);
        }
        return summary;
    }

    private String joinParts(String... parts) {
        List<String> values = new ArrayList<>();
        for (String part : parts) {
            if (part != null && !part.isBlank()) {
                values.add(part);
            }
        }
        return String.join(" · ", values);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
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
}
