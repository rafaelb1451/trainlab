package com.trainlab.activity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ActivityRepository extends JpaRepository<Activity, UUID> {

    List<Activity> findByAthleteIdOrderByStartTimeDesc(UUID athleteId);

    List<Activity> findByAthleteIdAndStartTimeBetweenOrderByStartTimeDesc(
            UUID athleteId, Instant from, Instant to);

    boolean existsByAthleteIdAndFileName(UUID athleteId, String fileName);

    Optional<Activity> findFirstByAthleteIdAndFileNameOrderByCreatedAtAsc(UUID athleteId, String fileName);

    long countByAthleteId(UUID athleteId);

    @Modifying
    @Query("delete from Activity a where a.athleteId = :athleteId")
    void deleteByAthleteId(@Param("athleteId") UUID athleteId);
}
