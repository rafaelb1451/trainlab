package com.trainlab.workout;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkoutRepository extends JpaRepository<Workout, UUID> {

    List<Workout> findByCoachIdOrderByUpdatedAtDesc(UUID coachId);

    /** Treinos individuais (v5) de um atleta. */
    List<Workout> findByAthleteIdOrderByUpdatedAtDesc(UUID athleteId);

    Optional<Workout> findByIdAndCoachId(UUID id, UUID coachId);

    boolean existsByCoachIdAndName(UUID coachId, String name);

    Optional<Workout> findByCoachIdAndName(UUID coachId, String name);

    /** Usado pelo seed para garantir idempotência do treino individual de demonstração. */
    Optional<Workout> findByCoachIdAndAthleteIdAndName(UUID coachId, UUID athleteId, String name);

    long countByCoachId(UUID coachId);

    @Query("""
            select distinct w from Workout w
            where w.id in (select p.workoutId from PlannedWorkout p where p.athleteId = :athleteId)
            order by w.updatedAt desc
            """)
    List<Workout> findAssignedToAthlete(@Param("athleteId") UUID athleteId);

    /**
     * Treinos que o atleta pode ver: os individuais dele (v5) mais os que foram atribuídos a ele
     * via planejamento. Não inclui a biblioteca compartilhada, preservando o comportamento
     * anterior da visão do atleta.
     */
    @Query("""
            select distinct w from Workout w
            where w.athleteId = :athleteId
               or w.id in (select p.workoutId from PlannedWorkout p where p.athleteId = :athleteId)
            order by w.updatedAt desc
            """)
    List<Workout> findVisibleToAthlete(@Param("athleteId") UUID athleteId);

    @Query("""
            select distinct w from Workout w
            where w.id in (select p.workoutId from PlannedWorkout p where p.athleteId = :athleteId)
              and w.id = :workoutId
            """)
    Optional<Workout> findAssignedToAthleteById(@Param("athleteId") UUID athleteId,
                                                @Param("workoutId") UUID workoutId);
}
