package com.trainlab.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Envio de e-mail transacional.
 *
 * <p>Dois transportes:</p>
 * <ul>
 *   <li>{@code log} (padrao) — grava no outbox e escreve no log. Serve para desenvolver e
 *       testar o fluxo inteiro sem servidor de e-mail;</li>
 *   <li>{@code smtp} — usa o {@link JavaMailSender} configurado em {@code spring.mail.*}.</li>
 * </ul>
 *
 * <p>Falha de e-mail <b>nunca</b> derruba a operacao de negocio: a excecao e' capturada, o
 * registro fica como {@code FAILED} e a acao do usuario segue valendo.</p>
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final MailOutboxRepository outbox;
    private final ObjectProvider<JavaMailSender> mailSender;

    @Value("${app.mail.transport:log}")
    private String transport;

    @Value("${app.mail.from:no-reply@trainlab.app}")
    private String from;

    public MailService(MailOutboxRepository outbox, ObjectProvider<JavaMailSender> mailSender) {
        this.outbox = outbox;
        this.mailSender = mailSender;
    }

    /** Envia (ou registra) uma mensagem. Retorna o registro gravado. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public MailOutbox send(String to, String subject, String body, MailOutbox.Kind kind) {
        MailOutbox record = new MailOutbox();
        record.setToEmail(to);
        record.setSubject(subject);
        record.setBody(body);
        record.setKind(kind);

        boolean smtp = "smtp".equalsIgnoreCase(transport);
        try {
            if (smtp) {
                JavaMailSender sender = mailSender.getIfAvailable();
                if (sender == null) {
                    throw new IllegalStateException(
                            "transporte smtp selecionado, mas spring.mail.host nao esta configurado");
                }
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(from);
                message.setTo(to);
                message.setSubject(subject);
                message.setText(body);
                sender.send(message);
                record.setStatus(MailOutbox.Status.SENT);
            } else {
                log.info("[MAIL:{}] para={} | assunto={}\n{}", transport, to, subject, body);
                record.setStatus(MailOutbox.Status.LOGGED);
            }
        } catch (RuntimeException ex) {
            record.setStatus(MailOutbox.Status.FAILED);
            record.setErrorMessage(truncate(ex.getMessage()));
            log.warn("Falha ao enviar e-mail para {} ({}): {}", to, kind, ex.getMessage());
        }
        return outbox.save(record);
    }

    private String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() > 480 ? value.substring(0, 480) : value;
    }
}
