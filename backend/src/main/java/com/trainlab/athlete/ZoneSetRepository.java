package com.trainlab.athlete;

import com.trainlab.workout.Sport;
import com.trainlab.workout.ZoneType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ZoneSetRepository extends JpaRepository<ZoneSet, UUID> {

    @EntityGraph(attributePaths = "zones")
    List<ZoneSet> findByAthleteId(UUID athleteId);

    @EntityGraph(attributePaths = "zones")
    Optional<ZoneSet> findByAthleteIdAndSportAndZoneType(UUID athleteId, Sport sport, ZoneType zoneType);

    @EntityGraph(attributePaths = "zones")
    List<ZoneSet> findByAthleteIdAndSport(UUID athleteId, Sport sport);

    @EntityGraph(attributePaths = "zones")
    List<ZoneSet> findByAthleteIdAndSportIn(UUID athleteId, Collection<Sport> sports);

    void deleteByAthleteIdAndSportAndZoneType(UUID athleteId, Sport sport, ZoneType zoneType);

    void deleteByAthleteIdAndSport(UUID athleteId, Sport sport);

    void deleteByAthleteId(UUID athleteId);
}
