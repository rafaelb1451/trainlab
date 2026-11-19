package com.trainlab.mail;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Toda mensagem que o sistema tenta enviar fica registrada aqui.
 *
 * <p>Serve para tres coisas: auditar o que o atleta/treinador recebeu, permitir reenvio, e
 * dar visibilidade em desenvolvimento (sem SMTP, a mensagem e' gravada e logada em vez de
 * desaparecer).</p>
 */
@Entity
@Table(name = "mail_outbox")
public class MailOutbox {

    public enum Status { SENT, FAILED, LOGGED }

    public enum Kind {
        EMAIL_VERIFICATION,
        PLAN_RELEASED,
        WORKOUT_CHANGED,
        SESSION_COMPLETED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "to_email", nullable = false, length = 180)
    private String toEmail;

    @Column(nullable = false, length = 200)
    private String subject;

    @Column(nullable = false, length = 8000)
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Kind kind;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getToEmail() { return toEmail; }
    public void setToEmail(String toEmail) { this.toEmail = toEmail; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public Kind getKind() { return kind; }
    public void setKind(Kind kind) { this.kind = kind; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
}
