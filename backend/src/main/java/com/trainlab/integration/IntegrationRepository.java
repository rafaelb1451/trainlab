package com.trainlab.integration;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IntegrationRepository extends JpaRepository<IntegrationConnection, UUID> {

    List<IntegrationConnection> findByAthleteIdAndActiveTrue(UUID athleteId);

    Optional<IntegrationConnection> findByAthleteIdAndProvider(UUID athleteId, Provider provider);
}
