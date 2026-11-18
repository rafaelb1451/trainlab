package com.trainlab.plan;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface PlannedWorkoutRepository extends JpaRepository<PlannedWorkout, UUID> {

    List<PlannedWorkout> findByAthleteIdOrderByScheduledDateAsc(UUID athleteId);

    List<PlannedWorkout> findByAthleteIdInOrderByScheduledDateAsc(Collection<UUID> athleteIds);

    List<PlannedWorkout> findByAthleteIdAndScheduledDateBetweenOrderByScheduledDateAsc(
            UUID athleteId, LocalDate from, LocalDate to);

    boolean existsByAthleteIdAndWorkoutId(UUID athleteId, UUID workoutId);

    long countByAthleteIdAndWorkoutId(UUID athleteId, UUID workoutId);

    @Modifying
    @Query("delete from PlannedWorkout p where p.workoutId = :workoutId")
    void deleteByWorkoutId(@Param("workoutId") UUID workoutId);

    @Modifying
    @Query("delete from PlannedWorkout p where p.athleteId = :athleteId")
    void deleteByAthleteId(@Param("athleteId") UUID athleteId);
}
