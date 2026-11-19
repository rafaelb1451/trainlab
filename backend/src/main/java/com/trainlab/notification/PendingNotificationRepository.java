package com.trainlab.notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PendingNotificationRepository extends JpaRepository<PendingNotification, UUID> {

    List<PendingNotification> findByProcessedAtIsNullOrderByUpdatedAtAsc();

    Optional<PendingNotification> findByAthleteIdAndWorkoutIdAndProcessedAtIsNull(
            UUID athleteId, UUID workoutId);
}
