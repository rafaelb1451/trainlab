package com.trainlab.config;

import com.trainlab.athlete.Athlete;
import com.trainlab.athlete.AthleteRepository;
import com.trainlab.athlete.DailyMetric;
import com.trainlab.athlete.DailyMetricRepository;
import com.trainlab.athlete.Sex;
import com.trainlab.athlete.SportThreshold;
import com.trainlab.athlete.SportThresholdRepository;
import com.trainlab.athlete.ZoneGenerationService;
import com.trainlab.plan.PlannedStatus;
import com.trainlab.plan.PlannedWorkout;
import com.trainlab.plan.PlannedWorkoutRepository;
import com.trainlab.user.AppUser;
import com.trainlab.user.UserRepository;
import com.trainlab.user.UserRole;
import com.trainlab.workout.DurationType;
import com.trainlab.workout.StepRole;
import com.trainlab.workout.Sport;
import com.trainlab.workout.TargetType;
import com.trainlab.workout.Workout;
import com.trainlab.workout.WorkoutDtos;
import com.trainlab.workout.WorkoutRepository;
import com.trainlab.workout.WorkoutService;
import com.trainlab.workout.WorkoutType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final AthleteRepository athleteRepository;
    private final SportThresholdRepository thresholdRepository;
    private final ZoneGenerationService zoneGenerationService;
    private final WorkoutRepository workoutRepository;
    private final WorkoutService workoutService;
    private final PlannedWorkoutRepository plannedWorkoutRepository;
    private final DailyMetricRepository dailyMetricRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.enabled:true}")
    private boolean seedEnabled;

    public DataSeeder(UserRepository userRepository,
                      AthleteRepository athleteRepository,
                      SportThresholdRepository thresholdRepository,
                      ZoneGenerationService zoneGenerationService,
                      WorkoutRepository workoutRepository,
                      WorkoutService workoutService,
                      PlannedWorkoutRepository plannedWorkoutRepository,
                      DailyMetricRepository dailyMetricRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.athleteRepository = athleteRepository;
        this.thresholdRepository = thresholdRepository;
        this.zoneGenerationService = zoneGenerationService;
        this.workoutRepository = workoutRepository;
        this.workoutService = workoutService;
        this.plannedWorkoutRepository = plannedWorkoutRepository;
        this.dailyMetricRepository = dailyMetricRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled) {
            log.info("Seed desabilitado (app.seed.enabled=false)");
            return;
        }

        AppUser coach = ensureUser("Rafael Treinador", "coach@trainlab.app", "coach1234", UserRole.COACH);

        Athlete marina = ensureAthlete(coach, "Marina Alves", "marina@trainlab.app", LocalDate.of(1993, 4, 18),
                Sex.F, 168, 58.0, "Triatleta com foco em longa distância.",
                "Ironman 70.3 Florianópolis", LocalDate.of(2026, 12, 6), 12.0);
        Athlete carlos = ensureAthlete(coach, "Carlos Mendes", "carlos@trainlab.app", LocalDate.of(1988, 9, 2),
                Sex.M, 178, 74.0, "Corredor de rua, objetivo: meia maratona sub 1h30.",
                "5k Hoka", LocalDate.of(2026, 12, 5), 6.0);
        Athlete ana = ensureAthlete(coach, "Ana Beatriz", "ana@trainlab.app", LocalDate.of(1995, 1, 27),
                Sex.F, 172, 63.0, "Ciclista de estrada e gran fondo.",
                "Prova de estrada 80km", LocalDate.of(2027, 1, 17), 10.0);
        Athlete paula = ensureAthlete(coach, "Paula Rocha", "paula@trainlab.app", LocalDate.of(1990, 11, 9),
                Sex.F, 165, 60.0, "Nadadora master, foco em águas abertas.",
                "Travessia 3km", LocalDate.of(2027, 2, 7), 8.0);

        seedThreshold(marina, Sport.RUN, 192, 46, 172, null, 282, null);
        seedThreshold(marina, Sport.BIKE, 188, 46, 166, 235, null, null);
        seedThreshold(marina, Sport.SWIM, 185, 50, 162, null, null, 105);

        seedThreshold(carlos, Sport.RUN, 184, 52, 168, null, 300, null);
        seedThreshold(ana, Sport.BIKE, 180, 55, 160, 195, null, null);
        seedThreshold(paula, Sport.SWIM, 178, 56, 158, null, null, 118);

        seedWorkouts(coach);
        seedMetrics(marina, marinaMetrics());
        seedMetrics(carlos, carlosMetrics());
        seedPlannedSessions(coach, marina, carlos);
        log.info("Seed TrainLab concluído. Coach: coach@trainlab.app / coach1234 | Atletas: senha atleta1234");
    }

    private AppUser ensureUser(String name, String email, String rawPassword, UserRole role) {
        String normalized = email.toLowerCase(Locale.ROOT);
        return userRepository.findByEmailIgnoreCase(normalized).orElseGet(() -> {
            AppUser user = new AppUser();
            user.setName(name);
            user.setEmail(normalized);
            user.setPasswordHash(passwordEncoder.encode(rawPassword));
            user.setRole(role);
            AppUser saved = userRepository.save(user);
            log.info("Usuário demo criado: {}", normalized);
            return saved;
        });
    }

    private Athlete ensureAthlete(AppUser coach, String displayName, String email, LocalDate birthDate,
                                  Sex sex, int heightCm, double weightKg, String notes,
                                  String goal, LocalDate eventDate, double weeklyHoursAvailable) {
        AppUser user = ensureUser(displayName, email, "atleta1234", UserRole.ATHLETE);
        Athlete athlete = athleteRepository.findByUserId(user.getId()).orElseGet(() -> {
            Athlete created = new Athlete();
            created.setUserId(user.getId());
            created.setCoachId(coach.getId());
            created.setDisplayName(displayName);
            created.setBirthDate(birthDate);
            created.setSex(sex);
            created.setHeightCm(heightCm);
            created.setWeightKg(weightKg);
            created.setNotes(notes);
            created.setGoal(goal);
            created.setEventDate(eventDate);
            created.setWeeklyHoursAvailable(weeklyHoursAvailable);
            Athlete saved = athleteRepository.save(created);
            log.info("Atleta demo criado: {}", email);
            return saved;
        });
        boolean changed = false;
        if (athlete.getCoachId() == null) {
            athlete.setCoachId(coach.getId());
            changed = true;
        }
        if (athlete.getGoal() == null) {
            athlete.setGoal(goal);
            changed = true;
        }
        if (athlete.getEventDate() == null) {
            athlete.setEventDate(eventDate);
            changed = true;
        }
        if (athlete.getWeeklyHoursAvailable() == null) {
            athlete.setWeeklyHoursAvailable(weeklyHoursAvailable);
            changed = true;
        }
        return changed ? athleteRepository.save(athlete) : athlete;
    }

    private void seedThreshold(Athlete athlete, Sport sport, Integer maxHr, Integer restingHr, Integer lthr,
                               Integer ftpWatts, Integer thresholdPaceSecPerKm, Integer cssSecPer100m) {
        if (thresholdRepository.findByAthleteIdAndSport(athlete.getId(), sport).isPresent()) {
            return;
        }
        SportThreshold threshold = new SportThreshold();
        threshold.setAthleteId(athlete.getId());
        threshold.setSport(sport);
        threshold.setMaxHr(maxHr);
        threshold.setRestingHr(restingHr);
        threshold.setLthr(lthr);
        threshold.setFtpWatts(ftpWatts);
        threshold.setThresholdPaceSecPerKm(thresholdPaceSecPerKm);
        threshold.setCssSecPer100m(cssSecPer100m);
        threshold = thresholdRepository.save(threshold);
        zoneGenerationService.regenerate(athlete.getId(), sport, threshold);
    }

    private void seedMetrics(Athlete athlete, List<MetricSeed> seeds) {
        LocalDate today = LocalDate.now();
        for (int index = 0; index < seeds.size(); index++) {
            LocalDate date = today.minusDays(seeds.size() - 1L - index);
            if (dailyMetricRepository.existsByAthleteIdAndDate(athlete.getId(), date)) {
                continue;
            }
            MetricSeed seed = seeds.get(index);
            DailyMetric metric = new DailyMetric();
            metric.setAthleteId(athlete.getId());
            metric.setDate(date);
            metric.setSleepHours(seed.sleepHours());
            metric.setDeepSleepHours(seed.deepSleepHours());
            metric.setRemSleepHours(seed.remSleepHours());
            metric.setLightSleepHours(seed.lightSleepHours());
            metric.setAwakeHours(seed.awakeHours());
            metric.setHrv(seed.hrv());
            metric.setRestingHr(seed.restingHr());
            metric.setBodyBatteryLow(seed.bodyBatteryLow());
            metric.setBodyBatteryHigh(seed.bodyBatteryHigh());
            metric.setStressLevel(seed.stressLevel());
            metric.setMood(seed.mood());
            metric.setRpe(seed.rpe());
            metric.setWeightKg(seed.weightKg());
            metric.setNotes("Registro de demonstração (sono, VFC e recuperação).");
            dailyMetricRepository.save(metric);
            log.info("Métrica demo criada: {} {}", athlete.getDisplayName(), date);
        }
    }

    private List<MetricSeed> marinaMetrics() {
        return List.of(
                new MetricSeed(7.2, 1.3, 1.6, 4.0, 0.3, 68, 49, 35, 78, 32, 3, 6, 58.0),
                new MetricSeed(6.8, 1.1, 1.5, 3.9, 0.3, 72, 48, 40, 82, 28, 4, 5, 57.9),
                new MetricSeed(8.1, 1.6, 1.9, 4.3, 0.3, 81, 46, 45, 88, 24, 4, 4, 58.1),
                new MetricSeed(7.5, 1.4, 1.7, 4.1, 0.3, 76, 47, 42, 85, 26, 5, 3, 58.0),
                new MetricSeed(6.5, 1.0, 1.4, 3.8, 0.3, 62, 50, 30, 72, 35, 3, 7, 58.2),
                new MetricSeed(8.4, 1.7, 2.0, 4.4, 0.3, 88, 45, 50, 92, 20, 5, 4, 57.8),
                new MetricSeed(7.0, 1.2, 1.6, 4.0, 0.2, 70, 48, 38, 80, 30, 4, 5, 58.0));
    }

    private List<MetricSeed> carlosMetrics() {
        return List.of(
                new MetricSeed(7.0, 1.2, 1.5, 4.0, 0.3, 64, 52, 33, 76, 34, 3, 6, 74.0),
                new MetricSeed(6.4, 1.0, 1.3, 3.8, 0.3, 58, 53, 30, 70, 38, 2, 7, 74.2),
                new MetricSeed(7.8, 1.5, 1.8, 4.2, 0.3, 77, 50, 44, 86, 26, 4, 4, 73.8),
                new MetricSeed(7.2, 1.3, 1.6, 4.0, 0.3, 69, 51, 38, 80, 30, 4, 5, 74.0),
                new MetricSeed(6.6, 1.1, 1.4, 3.8, 0.3, 60, 54, 31, 72, 39, 2, 8, 74.1),
                new MetricSeed(8.3, 1.7, 2.0, 4.3, 0.3, 85, 49, 48, 90, 22, 5, 3, 73.7),
                new MetricSeed(7.4, 1.4, 1.7, 4.1, 0.2, 73, 50, 40, 82, 28, 4, 6, 74.0));
    }

    private void seedPlannedSessions(AppUser coach, Athlete marina, Athlete carlos) {
        LocalDate today = LocalDate.now();
        Workout bikeEndurance = workoutByName(coach, "Bike endurance 90min");
        Workout progressiveRun = workoutByName(coach, "Corrida progressiva 45min");
        Workout intervalRun = workoutByName(coach, "Intervalado 6x400m");
        Workout swimSkill = workoutByName(coach, "Natação técnica + CSS 1.300m");

        seedPlannedSession(marina, bikeEndurance, today.plusDays(2), "Pedal longo de endurance em Z2.");
        seedPlannedSession(marina, progressiveRun, today.plusDays(4), "Progressivo em ritmo de tempo.");
        seedPlannedSession(marina, swimSkill, today.plusDays(6), "Técnica de natação e séries de CSS.");
        seedPlannedSession(carlos, intervalRun, today.plusDays(1), "Séries de 400 m em pista.");
        seedPlannedSession(carlos, progressiveRun, today.plusDays(3), "Corrida progressiva leve.");
    }

    private Workout workoutByName(AppUser coach, String name) {
        return workoutRepository.findByCoachIdAndName(coach.getId(), name).orElse(null);
    }

    private void seedPlannedSession(Athlete athlete, Workout workout, LocalDate date, String notes) {
        if (workout == null) {
            return;
        }
        if (plannedWorkoutRepository.existsByAthleteIdAndWorkoutIdAndScheduledDate(
                athlete.getId(), workout.getId(), date)) {
            return;
        }
        PlannedWorkout planned = new PlannedWorkout();
        planned.setAthleteId(athlete.getId());
        planned.setWorkoutId(workout.getId());
        planned.setScheduledDate(date);
        planned.setStatus(PlannedStatus.PLANNED);
        planned.setNotes(notes);
        plannedWorkoutRepository.save(planned);
        log.info("Sessão demo planejada: {} em {} ({})", athlete.getDisplayName(), date, workout.getName());
    }

    private record MetricSeed(double sleepHours, double deepSleepHours, double remSleepHours,
                              double lightSleepHours, double awakeHours, int hrv, int restingHr,
                              int bodyBatteryLow, int bodyBatteryHigh, int stressLevel, int mood,
                              int rpe, double weightKg) {
    }

    private void seedWorkouts(AppUser coach) {
        for (WorkoutDtos.WorkoutRequest request : demoWorkouts()) {
            if (!workoutRepository.existsByCoachIdAndName(coach.getId(), request.name())) {
                workoutService.create(coach, request);
                log.info("Treino demo criado: {}", request.name());
            }
        }
    }

    private List<WorkoutDtos.WorkoutRequest> demoWorkouts() {
        return List.of(
                new WorkoutDtos.WorkoutRequest(
                        "Corrida progressiva 45min", Sport.RUN, WorkoutType.ENDURANCE,
                        "Aquecimento leve, blocos progressivos em ritmo de tempo e desaquecimento. "
                                + "Trabalho de consistência aeróbica para o triatleta.",
                        List.of("endurance", "progressivo", "corrida"), 2,
                        List.of(
                                block(1, "Aquecimento", List.of(
                                        time(StepRole.WARMUP, 600, zone(TargetType.HR_ZONE, 1),
                                                "conversa fácil, cadência livre"))),
                                block(5, "Progressivo", List.of(
                                        time(StepRole.ACTIVE, 300, zone(TargetType.PACE_ZONE, 3),
                                                "ritmo de tempo controlado"),
                                        time(StepRole.RECOVERY, 60, zone(TargetType.HR_ZONE, 1),
                                                "trote leve para baixar a FC"))),
                                block(1, "Desaquecimento", List.of(
                                        time(StepRole.COOLDOWN, 300, zone(TargetType.HR_ZONE, 1),
                                                "soltar as pernas"))))),
                new WorkoutDtos.WorkoutRequest(
                        "Intervalado 6x400m", Sport.RUN, WorkoutType.INTERVAL,
                        "Séries curtas em pista com recuperação curta. Foco em economia de corrida e VO2máx.",
                        List.of("intervalado", "pista", "vo2"), 4,
                        List.of(
                                block(1, "Aquecimento", List.of(
                                        time(StepRole.WARMUP, 720, zone(TargetType.HR_ZONE, 2),
                                                "progressivo até endurance"))),
                                block(6, "Séries de 400m", List.of(
                                        distance(StepRole.ACTIVE, 400, zone(TargetType.PACE_ZONE, 5),
                                                "forte e constante"),
                                        distance(StepRole.RECOVERY, 200, free(),
                                                "caminhada ou trote muito leve"))),
                                block(1, "Desaquecimento", List.of(
                                        time(StepRole.COOLDOWN, 600, zone(TargetType.HR_ZONE, 1),
                                                "respiração controlada"))))),
                new WorkoutDtos.WorkoutRequest(
                        "Bike endurance 90min", Sport.BIKE, WorkoutType.ENDURANCE,
                        "Dois blocos de endurance com pedal contínuo e cadência alta. Base aeróbica para gran fondo.",
                        List.of("endurance", "bike", "base"), 2,
                        List.of(
                                block(1, "Aquecimento", List.of(
                                        time(StepRole.WARMUP, 900, zone(TargetType.HR_ZONE, 1),
                                                "giro leve, cadência 85-95 rpm"))),
                                block(2, "Endurance contínuo", List.of(
                                        time(StepRole.ACTIVE, 1800, zone(TargetType.POWER_ZONE, 2),
                                                "conversa possível, cadência 90 rpm"),
                                        time(StepRole.RECOVERY, 300, zone(TargetType.POWER_ZONE, 1),
                                                "giro solto"))),
                                block(1, "Desaquecimento", List.of(
                                        time(StepRole.COOLDOWN, 300, zone(TargetType.HR_ZONE, 1),
                                                "soltar as pernas"))))),
                new WorkoutDtos.WorkoutRequest(
                        "Bike VO2 5x3min", Sport.BIKE, WorkoutType.INTERVAL,
                        "Cinco repetições de três minutos acima do limiar com recuperação igual. "
                                + "Sessão exigente, manter hidratação.",
                        List.of("vo2", "intervalado", "bike"), 5,
                        List.of(
                                block(1, "Aquecimento", List.of(
                                        time(StepRole.WARMUP, 900, zone(TargetType.HR_ZONE, 2),
                                                "incluir 3 acelerações de 10s"))),
                                block(5, "VO2máx", List.of(
                                        time(StepRole.ACTIVE, 180, zone(TargetType.POWER_ZONE, 5),
                                                "não começar forte demais"),
                                        time(StepRole.RECOVERY, 180, zone(TargetType.POWER_ZONE, 1),
                                                "giro leve"))),
                                block(1, "Desaquecimento", List.of(
                                        time(StepRole.COOLDOWN, 600, zone(TargetType.HR_ZONE, 1),
                                                "respiração e alongamento leve"))))),
                new WorkoutDtos.WorkoutRequest(
                        "Natação técnica + CSS 1.300m", Sport.SWIM, WorkoutType.SKILL,
                        "Blocos de técnica alternados com séries no ritmo crítico (CSS). Foco em deslize e respiração.",
                        List.of("natação", "técnica", "css"), 3,
                        List.of(
                                block(1, "Aquecimento", List.of(
                                        distance(StepRole.WARMUP, 300, zone(TargetType.HR_ZONE, 2),
                                                "nado livre tranquilo"))),
                                block(4, "Séries de CSS", List.of(
                                        distance(StepRole.ACTIVE, 100, zone(TargetType.PACE_ZONE, 3),
                                                "ritmo de limiar, respiração bilateral"),
                                        distance(StepRole.RECOVERY, 50, free(),
                                                "nado solto"))),
                                block(4, "Técnica", List.of(
                                        distance(StepRole.ACTIVE, 50, rpe(3, 5),
                                                "foco em respiração e deslize"))),
                                block(1, "Desaquecimento", List.of(
                                        distance(StepRole.COOLDOWN, 200, zone(TargetType.PACE_ZONE, 1),
                                                "nado regenerativo")))))
        );
    }

    private WorkoutDtos.BlockRequest block(int repeat, String title, List<WorkoutDtos.StepRequest> steps) {
        return new WorkoutDtos.BlockRequest(repeat, title, null, steps);
    }

    private WorkoutDtos.StepRequest time(StepRole role, int seconds, WorkoutDtos.TargetRequest target,
                                         String notes) {
        return new WorkoutDtos.StepRequest(role, DurationType.TIME, seconds, null, notes, target);
    }

    private WorkoutDtos.StepRequest distance(StepRole role, int meters, WorkoutDtos.TargetRequest target,
                                             String notes) {
        return new WorkoutDtos.StepRequest(role, DurationType.DISTANCE, null, meters, notes, target);
    }

    private WorkoutDtos.TargetRequest zone(TargetType type, int zone) {
        return new WorkoutDtos.TargetRequest(type, zone, null, null, null, null, null, null);
    }

    private WorkoutDtos.TargetRequest rpe(int min, int max) {
        return new WorkoutDtos.TargetRequest(TargetType.RPE, null, min, max, null, null, null, null);
    }

    private WorkoutDtos.TargetRequest free() {
        return new WorkoutDtos.TargetRequest(TargetType.FREE, null, null, null, null, null, null, null);
    }
}
