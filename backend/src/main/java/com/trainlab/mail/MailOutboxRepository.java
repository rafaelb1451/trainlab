package com.trainlab.mail;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MailOutboxRepository extends JpaRepository<MailOutbox, UUID> {

    List<MailOutbox> findTop50ByOrderByCreatedAtDesc();

    List<MailOutbox> findTop50ByToEmailOrderByCreatedAtDesc(String toEmail);
}
