package com.trainlab.athlete;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AthleteRepository extends JpaRepository<Athlete, UUID> {

    Optional<Athlete> findByUserId(UUID userId);

    List<Athlete> findByCoachIdOrderByDisplayNameAsc(UUID coachId);

    List<Athlete> findAllByCoachId(UUID coachId);

    boolean existsByUserId(UUID userId);

    long countByCoachId(UUID coachId);
}
