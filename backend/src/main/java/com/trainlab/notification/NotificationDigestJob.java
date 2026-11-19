package com.trainlab.notification;

import com.trainlab.athlete.Athlete;
import com.trainlab.athlete.AthleteRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Envia os resumos pendentes, agrupados por atleta.
 *
 * <p>Roda a cada {@code app.mail.digest-interval-ms} (15 min por padrao). A janela agrupa o
 * que o treinador fez de uma vez: montar a semana inteira vira <b>um</b> e-mail.</p>
 */
@Component
public class NotificationDigestJob {

    private static final Logger log = LoggerFactory.getLogger(NotificationDigestJob.class);

    private final PendingNotificationRepository pending;
    private final AthleteRepository athletes;
    private final NotificationService notifications;

    public NotificationDigestJob(PendingNotificationRepository pending, AthleteRepository athletes,
                                 NotificationService notifications) {
        this.pending = pending;
        this.athletes = athletes;
        this.notifications = notifications;
    }

    @Scheduled(fixedDelayString = "${app.mail.digest-interval-ms:900000}",
            initialDelayString = "${app.mail.digest-initial-delay-ms:60000}")
    public void scheduledFlush() {
        try {
            int sent = flush();
            if (sent > 0) {
                log.info("Resumo de planejamento enviado para {} atleta(s)", sent);
            }
        } catch (RuntimeException ex) {
            log.warn("Falha ao enviar resumos de planejamento: {}", ex.getMessage());
        }
    }

    /** Processa a fila agora. Retorna quantos atletas receberam resumo. */
    @Transactional
    public int flush() {
        List<PendingNotification> rows = pending.findByProcessedAtIsNullOrderByUpdatedAtAsc();
        if (rows.isEmpty()) {
            return 0;
        }
        Map<UUID, List<PendingNotification>> byAthlete = rows.stream()
                .collect(Collectors.groupingBy(PendingNotification::getAthleteId));

        int sent = 0;
        for (Map.Entry<UUID, List<PendingNotification>> entry : byAthlete.entrySet()) {
            Athlete athlete = athletes.findById(entry.getKey()).orElse(null);
            if (athlete == null) {
                continue;
            }
            if (notifications.sendDigest(athlete, entry.getValue()) > 0) {
                sent++;
            }
        }
        return sent;
    }
}
