package com.trainlab.integration;

import java.time.Instant;
import java.util.UUID;

public final class IntegrationDtos {

    private IntegrationDtos() {
    }

    public record ConnectionRequest(String apiKey, String externalAthleteId) {
    }

    public record ConnectionView(
            UUID id,
            String provider,
            String providerLabel,
            String externalAthleteId,
            String externalAthleteName,
            boolean active,
            Instant lastSyncAt,
            String status
    ) {
    }

    public record DeliveryRequest() {
    }

    public record DeliveryView(
            String externalId,
            Instant deliveredAt,
            String provider,
            String status
    ) {
    }

    record DeliveryResult(String externalId, Instant deliveredAt, String text) {
    }
}
