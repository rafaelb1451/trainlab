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

    List<PlannedWorkout> findByAthleteIdAndScheduledDateGreaterThanEqualOrderByScheduledDateAsc(
            UUID athleteId, LocalDate from);

    List<PlannedWorkout> findByAthleteIdInAndScheduledDateBetweenOrderByScheduledDateAsc(
            Collection<UUID> athleteIds, LocalDate from, LocalDate to);

    List<PlannedWorkout> findByAthleteIdInAndScheduledDateGreaterThanEqualOrderByScheduledDateAsc(
            Collection<UUID> athleteIds, LocalDate from);

    boolean existsByAthleteIdAndWorkoutIdAndScheduledDate(UUID athleteId, UUID workoutId, LocalDate scheduledDate);

    boolean existsByAthleteIdAndScheduledDate(UUID athleteId, LocalDate scheduledDate);

    boolean existsByAthleteIdAndWorkoutId(UUID athleteId, UUID workoutId);

    long countByAthleteIdAndWorkoutId(UUID athleteId, UUID workoutId);

    @Modifying
    @Query("delete from PlannedWorkout p where p.workoutId = :workoutId")
    void deleteByWorkoutId(@Param("workoutId") UUID workoutId);

    @Modifying
    @Query("delete from PlannedWorkout p where p.athleteId = :athleteId")
    void deleteByAthleteId(@Param("athleteId") UUID athleteId);
}
