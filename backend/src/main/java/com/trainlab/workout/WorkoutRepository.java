package com.trainlab.workout;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkoutRepository extends JpaRepository<Workout, UUID> {

    List<Workout> findByCoachIdOrderByUpdatedAtDesc(UUID coachId);

    Optional<Workout> findByIdAndCoachId(UUID id, UUID coachId);

    boolean existsByCoachIdAndName(UUID coachId, String name);

    long countByCoachId(UUID coachId);

    @Query("""
            select distinct w from Workout w
            where w.id in (select p.workoutId from PlannedWorkout p where p.athleteId = :athleteId)
            order by w.updatedAt desc
            """)
    List<Workout> findAssignedToAthlete(@Param("athleteId") UUID athleteId);

    @Query("""
            select distinct w from Workout w
            where w.id in (select p.workoutId from PlannedWorkout p where p.athleteId = :athleteId)
              and w.id = :workoutId
            """)
    Optional<Workout> findAssignedToAthleteById(@Param("athleteId") UUID athleteId,
                                                @Param("workoutId") UUID workoutId);
}
