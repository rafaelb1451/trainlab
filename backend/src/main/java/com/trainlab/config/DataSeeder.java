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

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
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
        recalculateWorkoutEstimates();
        seedMetrics(marina, marinaMetrics());
        seedMetrics(carlos, carlosMetrics());
        seedCalendarSessions(coach, marina, carlos);
        seedIndividualWorkout(coach, marina);
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

    /**
     * Planejamento demo dos dois atletas com histórico de 8 semanas e 2 semanas futuras.
     * As datas são ancoradas na segunda-feira da semana corrente, e a chave
     * atleta+treino+data garante idempotência em reinícios.
     */
    private void seedCalendarSessions(AppUser coach, Athlete marina, Athlete carlos) {
        LocalDate today = LocalDate.now();
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        int removed = removeLegacySeedSessions(marina) + removeLegacySeedSessions(carlos);
        if (removed > 0) {
            log.info("Planejamento demo: {} sessão(ões) do seed antigo removida(s) para evitar duplicidade.", removed);
        }
        int created = 0;
        created += seedAthleteCalendar(coach, marina, monday, today, marinaCalendarPatterns());
        created += seedAthleteCalendar(coach, carlos, monday, today, carlosCalendarPatterns());
        log.info("Planejamento demo: {} novas sessões (histórico de 8 semanas + 2 semanas futuras)", created);
    }

    /**
     * A versão anterior do seed criava 5 sessões soltas a partir de "hoje". Ao migrar para o
     * calendário ancorado na semana, removemos essas linhas pelo texto de notas para não
     * duplicar treinos na mesma semana. Depois da primeira execução o método é no-op.
     */
    private int removeLegacySeedSessions(Athlete athlete) {
        List<String> legacyNotes = List.of(
                "Pedal longo de endurance em Z2.",
                "Progressivo em ritmo de tempo.",
                "Técnica de natação e séries de CSS.",
                "Séries de 400 m em pista.",
                "Corrida progressiva leve.");
        int removed = 0;
        for (PlannedWorkout planned : plannedWorkoutRepository
                .findByAthleteIdOrderByScheduledDateAsc(athlete.getId())) {
            if (planned.getNotes() != null && legacyNotes.contains(planned.getNotes())) {
                plannedWorkoutRepository.delete(planned);
                removed++;
            }
        }
        return removed;
    }

    private int seedAthleteCalendar(AppUser coach, Athlete athlete, LocalDate monday, LocalDate today,
                                    List<List<SessionTemplate>> patterns) {
        int created = 0;
        for (int weekOffset = -8; weekOffset <= 2; weekOffset++) {
            List<SessionTemplate> pattern = patterns.get(Math.floorMod(weekOffset, patterns.size()));
            LocalDate weekMonday = monday.plusWeeks(weekOffset);
            for (SessionTemplate template : pattern) {
                LocalDate date = weekMonday.plusDays(template.day().getValue() - 1L);
                Workout workout = workoutByName(coach, template.workoutName());
                if (workout == null) {
                    continue;
                }
                if (plannedWorkoutRepository.existsByAthleteIdAndWorkoutIdAndScheduledDate(
                        athlete.getId(), workout.getId(), date)) {
                    continue;
                }
                PlannedStatus status;
                if (date.isBefore(today)) {
                    boolean skipped = Math.floorMod(weekOffset * 7 + date.getDayOfMonth(), 17) == 0;
                    status = skipped ? PlannedStatus.SKIPPED : PlannedStatus.COMPLETED;
                } else {
                    status = PlannedStatus.PLANNED;
                }
                PlannedWorkout planned = new PlannedWorkout();
                planned.setAthleteId(athlete.getId());
                planned.setWorkoutId(workout.getId());
                planned.setScheduledDate(date);
                planned.setStatus(status);
                planned.setNotes("Sessão do plano de demonstração.");
                plannedWorkoutRepository.save(planned);
                created++;
            }
        }
        return created;
    }

    private List<List<SessionTemplate>> marinaCalendarPatterns() {
        return List.of(
                // 5 sessões: natação, corrida progressiva, bike endurance, bike VO2 e intervalado.
                List.of(
                        new SessionTemplate(DayOfWeek.MONDAY, "Natação técnica + CSS 1.300m"),
                        new SessionTemplate(DayOfWeek.TUESDAY, "Corrida progressiva 45min"),
                        new SessionTemplate(DayOfWeek.THURSDAY, "Bike endurance 90min"),
                        new SessionTemplate(DayOfWeek.SATURDAY, "Bike VO2 5x3min"),
                        new SessionTemplate(DayOfWeek.SUNDAY, "Intervalado 6x400m")),
                // 4 sessões: bloco de natação e corrida.
                List.of(
                        new SessionTemplate(DayOfWeek.MONDAY, "Natação técnica + CSS 1.300m"),
                        new SessionTemplate(DayOfWeek.WEDNESDAY, "Intervalado 6x400m"),
                        new SessionTemplate(DayOfWeek.FRIDAY, "Bike endurance 90min"),
                        new SessionTemplate(DayOfWeek.SUNDAY, "Natação técnica + CSS 1.300m")),
                // 5 sessões: semana de bike forte e natação.
                List.of(
                        new SessionTemplate(DayOfWeek.TUESDAY, "Corrida progressiva 45min"),
                        new SessionTemplate(DayOfWeek.WEDNESDAY, "Bike VO2 5x3min"),
                        new SessionTemplate(DayOfWeek.THURSDAY, "Natação técnica + CSS 1.300m"),
                        new SessionTemplate(DayOfWeek.SATURDAY, "Bike endurance 90min"),
                        new SessionTemplate(DayOfWeek.SUNDAY, "Corrida progressiva 45min")),
                // 3 sessões: semana de recuperação.
                List.of(
                        new SessionTemplate(DayOfWeek.MONDAY, "Natação técnica + CSS 1.300m"),
                        new SessionTemplate(DayOfWeek.THURSDAY, "Intervalado 6x400m"),
                        new SessionTemplate(DayOfWeek.SATURDAY, "Bike endurance 90min")));
    }

    private List<List<SessionTemplate>> carlosCalendarPatterns() {
        return List.of(
                List.of(
                        new SessionTemplate(DayOfWeek.TUESDAY, "Intervalado 6x400m"),
                        new SessionTemplate(DayOfWeek.THURSDAY, "Corrida progressiva 45min"),
                        new SessionTemplate(DayOfWeek.SATURDAY, "Corrida progressiva 45min"),
                        new SessionTemplate(DayOfWeek.SUNDAY, "Intervalado 6x400m")),
                List.of(
                        new SessionTemplate(DayOfWeek.TUESDAY, "Intervalado 6x400m"),
                        new SessionTemplate(DayOfWeek.THURSDAY, "Corrida progressiva 45min"),
                        new SessionTemplate(DayOfWeek.SUNDAY, "Intervalado 6x400m")),
                List.of(
                        new SessionTemplate(DayOfWeek.MONDAY, "Corrida progressiva 45min"),
                        new SessionTemplate(DayOfWeek.WEDNESDAY, "Intervalado 6x400m"),
                        new SessionTemplate(DayOfWeek.FRIDAY, "Corrida progressiva 45min"),
                        new SessionTemplate(DayOfWeek.SUNDAY, "Intervalado 6x400m")),
                List.of(
                        new SessionTemplate(DayOfWeek.TUESDAY, "Corrida progressiva 45min"),
                        new SessionTemplate(DayOfWeek.SATURDAY, "Intervalado 6x400m"),
                        new SessionTemplate(DayOfWeek.SUNDAY, "Corrida progressiva 45min")));
    }

    /**
     * v5 — treino individual de demonstração para a Marina (SPEC 11.1.6). É vinculado ao atleta,
     * portanto não entra na biblioteca compartilhada. Idempotente: o nome identifica o seed e
     * garante que reinícios não dupliquem o treino nem a sessão planejada.
     */
    private void seedIndividualWorkout(AppUser coach, Athlete marina) {
        String name = "Longão individual — 90min Z2";
        Workout workout = workoutRepository
                .findByCoachIdAndAthleteIdAndName(coach.getId(), marina.getId(), name)
                .orElseGet(() -> {
                    WorkoutDtos.WorkoutDetail created = workoutService.create(coach,
                            new WorkoutDtos.WorkoutRequest(
                                    name, Sport.RUN, WorkoutType.ENDURANCE,
                                    "Treino individual da Marina: 90 minutos contínuos em Z2, com "
                                            + "aquecimento e desaquecimento curtos. Alvos resolvidos nas "
                                            + "zonas de FC dela pela prévia individualizada.",
                                    List.of("individual", "longao", "z2"), 3,
                                    List.of(
                                            block(1, "Aquecimento", List.of(
                                                    time(StepRole.WARMUP, 600, zone(TargetType.HR_ZONE, 1),
                                                            "trote leve, cadência livre"))),
                                            block(1, "Longão contínuo Z2", List.of(
                                                    time(StepRole.ACTIVE, 4200, zone(TargetType.HR_ZONE, 2),
                                                            "conversa possível, ritmo constante"))),
                                            block(1, "Desaquecimento", List.of(
                                                    time(StepRole.COOLDOWN, 600, zone(TargetType.HR_ZONE, 1),
                                                            "soltar as pernas e normalizar a FC")))),
                                    marina.getId()));
                    log.info("Treino individual demo criado: {} ({})", name, marina.getDisplayName());
                    return workoutRepository.findById(created.id()).orElse(null);
                });
        if (workout == null) {
            return;
        }
        seedIndividualSession(marina, workout);
    }

    /**
     * Agenda o treino individual em um dia livre e futuro da Marina. Só cria se ainda não existir
     * sessão para este treino, para não duplicar em reinícios.
     */
    private void seedIndividualSession(Athlete athlete, Workout workout) {
        if (plannedWorkoutRepository.existsByAthleteIdAndWorkoutId(athlete.getId(), workout.getId())) {
            return;
        }
        LocalDate date = LocalDate.now().with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        for (int attempt = 0; attempt < 21; attempt++) {
            if (!plannedWorkoutRepository.existsByAthleteIdAndScheduledDate(athlete.getId(), date)) {
                break;
            }
            date = date.plusDays(1);
        }
        if (plannedWorkoutRepository.existsByAthleteIdAndScheduledDate(athlete.getId(), date)) {
            // Nenhum dia livre encontrado na janela: mantém apenas o treino individual.
            return;
        }
        PlannedWorkout planned = new PlannedWorkout();
        planned.setAthleteId(athlete.getId());
        planned.setWorkoutId(workout.getId());
        planned.setScheduledDate(date);
        planned.setStatus(PlannedStatus.PLANNED);
        planned.setNotes("Sessão do treino individual de demonstração.");
        plannedWorkoutRepository.save(planned);
        log.info("Sessão demo do treino individual agendada: {} em {}", workout.getName(), date);
    }

    private void recalculateWorkoutEstimates() {
        int updated = 0;
        for (Workout workout : workoutRepository.findAll()) {
            if (workout.getEstimatedTss() == null || workout.getEstimatedDistanceM() == null) {
                workout.recalculateEstimates();
                workoutRepository.save(workout);
                updated++;
            }
        }
        if (updated > 0) {
            log.info("Estimativas recalculadas para {} treino(s) sem TSS/distância.", updated);
        }
    }

    private Workout workoutByName(AppUser coach, String name) {
        return workoutRepository.findByCoachIdAndName(coach.getId(), name).orElse(null);
    }

    private record SessionTemplate(DayOfWeek day, String workoutName) {
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
                                                "soltar as pernas")))), null),
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
                                                "respiração controlada")))), null),
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
                                                "soltar as pernas")))), null),
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
                                                "respiração e alongamento leve")))), null),
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
                                                "nado regenerativo")))), null)
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
