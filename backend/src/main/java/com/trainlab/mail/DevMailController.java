package com.trainlab.mail;

import com.trainlab.common.ApiException;
import com.trainlab.user.AppUser;
import com.trainlab.user.UserRole;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Caixa de saida de e-mails para desenvolvimento.
 *
 * <p>So' existe no perfil {@code dev}: sem SMTP, e' por aqui que se le a mensagem que o
 * sistema "enviou" (inclusive o link de confirmacao de e-mail). Em producao o bean nem e'
 * registrado.</p>
 */
@RestController
@RequestMapping("/api/dev/mail")
@Profile("dev")
public class DevMailController {

    private final MailOutboxRepository outbox;
    private final com.trainlab.notification.NotificationDigestJob digestJob;

    public DevMailController(MailOutboxRepository outbox,
                             com.trainlab.notification.NotificationDigestJob digestJob) {
        this.outbox = outbox;
        this.digestJob = digestJob;
    }

    public record MailView(UUID id, String to, String subject, String body, String kind,
                           String status, Instant createdAt) {
    }

    /** Atleta ve os proprios e-mails; treinador ve a caixa inteira (ambiente de dev). */
    @GetMapping
    public List<MailView> list(@AuthenticationPrincipal AppUser user) {
        if (user == null) {
            throw ApiException.unauthorized("Autenticacao necessaria");
        }
        List<MailOutbox> messages = user.getRole() == UserRole.ATHLETE
                ? outbox.findTop50ByToEmailOrderByCreatedAtDesc(user.getEmail())
                : outbox.findTop50ByOrderByCreatedAtDesc();

        return messages.stream()
                .map(mail -> new MailView(mail.getId(), mail.getToEmail(), mail.getSubject(),
                        mail.getBody(), mail.getKind().name(), mail.getStatus().name(),
                        mail.getCreatedAt()))
                .toList();
    }

    /** Forca o envio dos resumos pendentes agora (nao esperar a janela de 15 min). */
    @org.springframework.web.bind.annotation.PostMapping("/digest")
    public java.util.Map<String, Object> flushDigest() {
        int athletes = digestJob.flush();
        return java.util.Map.of("athletes", athletes);
    }
}
