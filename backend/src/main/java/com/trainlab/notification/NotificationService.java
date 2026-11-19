package com.trainlab.notification;

import com.trainlab.athlete.Athlete;
import com.trainlab.mail.MailOutbox;
import com.trainlab.mail.MailService;
import com.trainlab.user.AppUser;
import com.trainlab.user.UserRepository;
import com.trainlab.workout.Workout;
import com.trainlab.workout.WorkoutRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Mensagens que o sistema manda sozinho.
 *
 * <p>O aviso de mudanca no planejamento <b>nao sai na hora</b>: o treinador costuma montar a
 * semana em varios cliques, e um e-mail por clique seria ruido. Cada mudanca entra na fila
 * ({@link PendingNotification}) e o {@link NotificationDigestJob} manda um resumo por atleta.</p>
 */
@Service
public class NotificationService {

    private static final Locale BR = new Locale("pt", "BR");
    private static final DateTimeFormatter SHORT = DateTimeFormatter.ofPattern("dd/MM", BR);

    private final MailService mail;
    private final UserRepository users;
    private final WorkoutRepository workouts;
    private final PendingNotificationRepository pending;

    @Value("${app.mail.app-base-url:http://localhost:5173}")
    private String appBaseUrl;

    public NotificationService(MailService mail, UserRepository users, WorkoutRepository workouts,
                               PendingNotificationRepository pending) {
        this.mail = mail;
        this.users = users;
        this.workouts = workouts;
        this.pending = pending;
    }

    /**
     * Registra a mudanca para o proximo resumo.
     *
     * <p>Regras de consolidacao:</p>
     * <ul>
     *   <li>a mesma sessao alterada varias vezes vira uma linha so', com o estado final;</li>
     *   <li>uma sessao criada e removida antes do resumo desaparece — o atleta nunca soube
     *       que ela existiu;</li>
     *   <li>uma sessao criada e depois remarcada continua sendo "novo treino" para quem le.</li>
     * </ul>
     */
    @Transactional
    public void workoutChanged(Athlete athlete, UUID workoutId, LocalDate date,
                               NotificationAction action) {
        if (athlete == null || workoutId == null || date == null) {
            return;
        }
        var existing = pending.findByAthleteIdAndWorkoutIdAndProcessedAtIsNull(
                athlete.getId(), workoutId);

        if (action == NotificationAction.REMOVED && existing.isPresent()
                && existing.get().getAction() == NotificationAction.SCHEDULED) {
            pending.delete(existing.get());
            return;
        }

        PendingNotification row = existing.orElseGet(PendingNotification::new);
        boolean aindaNovo = existing.isPresent()
                && existing.get().getAction() == NotificationAction.SCHEDULED
                && action != NotificationAction.REMOVED;

        row.setAthleteId(athlete.getId());
        row.setWorkoutId(workoutId);
        if (!aindaNovo) {
            row.setAction(action);
        }
        row.setScheduledDate(date);
        row.setUpdatedAt(Instant.now());
        pending.save(row);
    }

    /**
     * Envia o resumo de um atleta e marca as linhas como processadas.
     * Retorna quantas sessoes entraram na mensagem.
     */
    @Transactional
    public int sendDigest(Athlete athlete, List<PendingNotification> rows) {
        AppUser user = user(athlete);
        if (user == null || rows.isEmpty()) {
            return 0;
        }

        StringBuilder list = new StringBuilder();
        for (PendingNotification row : rows) {
            String name = workouts.findById(row.getWorkoutId())
                    .map(Workout::getName).orElse("Treino");
            list.append("- ").append(row.getScheduledDate() == null
                            ? "(sem data)" : row.getScheduledDate().format(SHORT))
                    .append(" — ").append(name)
                    .append(" (").append(label(row.getAction())).append(")\n");
        }

        int count = rows.size();
        String abertura = count == 1
                ? "Seu treinador atualizou 1 sessao do seu calendario:"
                : "Seu treinador atualizou " + count + " sessoes do seu calendario:";

        String body = """
                Ola, %s.

                %s

                %s
                Abra o TrainLab para ver os detalhes: %s

                TrainLab
                """.formatted(athlete.getDisplayName(), abertura, list, appBaseUrl);

        String subject = count == 1
                ? "Atualizacao no seu calendario"
                : "Seu calendario tem " + count + " atualizacoes";

        mail.send(user.getEmail(), subject, body, MailOutbox.Kind.WORKOUT_CHANGED);

        Instant now = Instant.now();
        rows.forEach(row -> row.setProcessedAt(now));
        pending.saveAll(rows);

        return count;
    }

    private String label(NotificationAction action) {
        return switch (action) {
            case SCHEDULED -> "novo";
            case UPDATED -> "alterado";
            case REMOVED -> "removido";
        };
    }

    private AppUser user(Athlete athlete) {
        if (athlete == null || athlete.getUserId() == null) {
            return null;
        }
        return users.findById(athlete.getUserId()).orElse(null);
    }
}
