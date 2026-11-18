package com.trainlab.athlete;

import com.trainlab.workout.Sport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SportThresholdRepository extends JpaRepository<SportThreshold, UUID> {

    List<SportThreshold> findByAthleteIdOrderBySportAsc(UUID athleteId);

    Optional<SportThreshold> findByAthleteIdAndSport(UUID athleteId, Sport sport);

    void deleteByAthleteIdAndSport(UUID athleteId, Sport sport);

    void deleteByAthleteId(UUID athleteId);
}
