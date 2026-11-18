package com.trainlab.athlete;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DailyMetricRepository extends JpaRepository<DailyMetric, UUID> {

    List<DailyMetric> findByAthleteIdAndDateBetweenOrderByDateDesc(UUID athleteId, LocalDate from, LocalDate to);

    List<DailyMetric> findByAthleteIdOrderByDateDesc(UUID athleteId);

    Optional<DailyMetric> findByAthleteIdAndDate(UUID athleteId, LocalDate date);

    Optional<DailyMetric> findTopByAthleteIdOrderByDateDesc(UUID athleteId);

    boolean existsByAthleteIdAndDate(UUID athleteId, LocalDate date);

    void deleteByAthleteId(UUID athleteId);
}
