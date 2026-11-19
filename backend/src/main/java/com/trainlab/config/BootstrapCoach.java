package com.trainlab.config;

import com.trainlab.user.AppUser;
import com.trainlab.user.UserRepository;
import com.trainlab.user.UserRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Cria a primeira conta de treinador em uma instalacao nova.
 *
 * <p>Em producao o seed fica desligado (ninguem quer contas demo com senha conhecida), mas
 * alguem precisa ser o primeiro treinador. Definindo {@code BOOTSTRAP_COACH_EMAIL} e
 * {@code BOOTSTRAP_COACH_PASSWORD}, este runner cria a conta <b>somente se ainda nao existir
 * nenhum treinador</b> — rodar de novo nao faz nada.</p>
 *
 * <p>Depois do primeiro deploy, remova as duas variaveis do .env.</p>
 */
@Component
public class BootstrapCoach implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapCoach.class);

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.coach-email:}")
    private String email;

    @Value("${app.bootstrap.coach-password:}")
    private String password;

    @Value("${app.bootstrap.coach-name:Treinador}")
    private String name;

    public BootstrapCoach(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return;
        }
        if (password.length() < 8) {
            log.warn("BOOTSTRAP_COACH_PASSWORD tem menos de 8 caracteres: conta nao criada.");
            return;
        }
        boolean coachExists = users.findAll().stream()
                .anyMatch(user -> user.getRole() == UserRole.COACH);
        if (coachExists) {
            return;
        }

        AppUser coach = new AppUser();
        coach.setName(name.trim());
        coach.setEmail(email.trim().toLowerCase());
        coach.setPasswordHash(passwordEncoder.encode(password));
        coach.setRole(UserRole.COACH);
        coach.setEmailVerified(true);
        coach.setEmailVerifiedAt(java.time.Instant.now());
        users.save(coach);

        log.info("Treinador inicial criado: {}", coach.getEmail());
        log.info("Remova BOOTSTRAP_COACH_PASSWORD do .env agora que a conta existe.");
    }
}
