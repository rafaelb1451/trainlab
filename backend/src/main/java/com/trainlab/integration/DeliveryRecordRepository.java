package com.trainlab.integration;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DeliveryRecordRepository extends JpaRepository<DeliveryRecord, UUID> {

    Optional<DeliveryRecord> findFirstByPlannedWorkoutIdAndProviderOrderByDeliveredAtDesc(
            UUID plannedWorkoutId, Provider provider);
}
