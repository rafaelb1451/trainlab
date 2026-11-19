package com.trainlab.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, UUID> {

    Optional<EmailVerificationToken> findFirstByTokenHashAndUsedAtIsNullOrderByCreatedAtDesc(
            String tokenHash);
}
