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

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Mensagens que o sistema manda sozinho.
 *
 * <p>Duas trocas de informacao que o produto precisa:</p>
 * <ul>
 *   <li><b>planilha liberada</b> — o treinador fechou a semana e o atleta recebe o resumo;</li>
 *   <li><b>treino alterado</b> — uma sessao do atleta foi agendada, movida ou removida.</li>
 * </ul>
 *
 * <p>O envio nao bloqueia a operacao: falha de e-mail vira registro no outbox, nunca erro para
 * quem chamou.</p>
 */
@Service
public class NotificationService {

    public enum Action { SCHEDULED, UPDATED, REMOVED }

    private static final Locale BR = new Locale("pt", "BR");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEEE, d 'de' MMMM", BR);
    private static final DateTimeFormatter SHORT = DateTimeFormatter.ofPattern("dd/MM", BR);

    private final MailService mail;
    private final UserRepository users;
    private final WorkoutRepository workouts;

    @Value("${app.mail.app-base-url:http://localhost:5173}")
    private String appBaseUrl;

    public NotificationService(MailService mail, UserRepository users, WorkoutRepository workouts) {
        this.mail = mail;
        this.users = users;
        this.workouts = workouts;
    }

    /** Avisa o atleta que o treinador mexeu numa sessao futura. */
    public void workoutChanged(Athlete athlete, UUID workoutId, LocalDate date, Action action) {
        AppUser user = user(athlete);
        if (user == null || date == null) {
            return;
        }
        String workoutName = workouts.findById(workoutId).map(Workout::getName).orElse("Treino");
        String what = switch (action) {
            case SCHEDULED -> "Um novo treino entrou no seu calendario.";
            case UPDATED -> "Seu treinador ajustou um treino.";
            case REMOVED -> "Um treino saiu do seu calendario.";
        };

        String body = """
                Ola, %s.

                %s

                Treino : %s
                Data   : %s

                Abra o TrainLab para ver o detalhe: %s

                TrainLab
                """.formatted(athlete.getDisplayName(), what, workoutName,
                date.format(DAY), appBaseUrl);

        String subject = switch (action) {
            case SCHEDULED -> "Novo treino em " + date.format(SHORT);
            case UPDATED -> "Treino alterado em " + date.format(SHORT);
            case REMOVED -> "Treino removido em " + date.format(SHORT);
        };

        mail.send(user.getEmail(), subject, body, MailOutbox.Kind.WORKOUT_CHANGED);
    }

    private AppUser user(Athlete athlete) {
        if (athlete == null || athlete.getUserId() == null) {
            return null;
        }
        return users.findById(athlete.getUserId()).orElse(null);
    }
}
