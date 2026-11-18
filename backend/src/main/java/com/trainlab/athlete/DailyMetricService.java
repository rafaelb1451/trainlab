package com.trainlab.athlete;

import com.trainlab.common.ApiException;
import com.trainlab.user.AppUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class DailyMetricService {

    private static final int DEFAULT_WINDOW_DAYS = 30;

    private final DailyMetricRepository dailyMetricRepository;
    private final AthleteService athleteService;

    public DailyMetricService(DailyMetricRepository dailyMetricRepository, AthleteService athleteService) {
        this.dailyMetricRepository = dailyMetricRepository;
        this.athleteService = athleteService;
    }

    @Transactional(readOnly = true)
    public List<MetricDtos.DailyMetricDto> list(UUID athleteId, LocalDate from, LocalDate to,
                                                AppUser currentUser) {
        athleteService.requireReadable(athleteId, currentUser);
        LocalDate effectiveTo = to == null ? LocalDate.now() : to;
        LocalDate effectiveFrom = from == null ? effectiveTo.minusDays(DEFAULT_WINDOW_DAYS - 1L) : from;
        if (effectiveFrom.isAfter(effectiveTo)) {
            throw ApiException.badRequest("A data inicial (from) não pode ser posterior à data final (to)");
        }
        return dailyMetricRepository
                .findByAthleteIdAndDateBetweenOrderByDateDesc(athleteId, effectiveFrom, effectiveTo).stream()
                .map(MetricDtos.DailyMetricDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MetricDtos.DailyMetricDto> lastDays(UUID athleteId, int days) {
        LocalDate today = LocalDate.now();
        return dailyMetricRepository
                .findByAthleteIdAndDateBetweenOrderByDateDesc(athleteId, today.minusDays(days - 1L), today)
                .stream()
                .map(MetricDtos.DailyMetricDto::from)
                .toList();
    }

    @Transactional
    public MetricDtos.DailyMetricDto upsert(UUID athleteId, AppUser currentUser,
                                            MetricDtos.DailyMetricInput input) {
        athleteService.requireOwnedByCoach(athleteId, currentUser);
        if (input.date() == null) {
            throw ApiException.badRequest("A data da métrica é obrigatória");
        }

        DailyMetric metric = dailyMetricRepository.findByAthleteIdAndDate(athleteId, input.date())
                .orElseGet(() -> {
                    DailyMetric created = new DailyMetric();
                    created.setAthleteId(athleteId);
                    created.setDate(input.date());
                    return created;
                });
        apply(metric, input);
        return MetricDtos.DailyMetricDto.from(dailyMetricRepository.save(metric));
    }

    @Transactional
    public void delete(UUID athleteId, UUID metricId, AppUser currentUser) {
        athleteService.requireOwnedByCoach(athleteId, currentUser);
        DailyMetric metric = dailyMetricRepository.findById(metricId)
                .orElseThrow(() -> ApiException.notFound("Métrica não encontrada"));
        if (!athleteId.equals(metric.getAthleteId())) {
            throw ApiException.notFound("Métrica não encontrada para este atleta");
        }
        dailyMetricRepository.delete(metric);
    }

    private void apply(DailyMetric metric, MetricDtos.DailyMetricInput input) {
        metric.setSleepHours(input.sleepHours());
        metric.setDeepSleepHours(input.deepSleepHours());
        metric.setRemSleepHours(input.remSleepHours());
        metric.setLightSleepHours(input.lightSleepHours());
        metric.setAwakeHours(input.awakeHours());
        metric.setHrv(input.hrv());
        metric.setRestingHr(input.restingHr());
        metric.setBodyBatteryLow(input.bodyBatteryLow());
        metric.setBodyBatteryHigh(input.bodyBatteryHigh());
        metric.setStressLevel(input.stressLevel());
        metric.setMood(input.mood());
        metric.setRpe(input.rpe());
        metric.setWeightKg(input.weightKg());
        metric.setNotes(input.notes());
    }
}
