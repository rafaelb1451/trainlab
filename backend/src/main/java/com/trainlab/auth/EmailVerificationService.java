package com.trainlab.auth;

import com.trainlab.common.ApiException;
import com.trainlab.mail.MailOutbox;
import com.trainlab.mail.MailService;
import com.trainlab.user.AppUser;
import com.trainlab.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Confirmacao de e-mail no cadastro.
 *
 * <p>O cadastro cria a conta como nao verificada e dispara um link com token de uso unico
 * (24 h). O token so' existe em claro no e-mail; o banco guarda o hash. Confirmar marca a
 * conta como verificada — a partir dali o usuario entra normalmente.</p>
 */
@Service
public class EmailVerificationService {

    static final Duration TOKEN_TTL = Duration.ofHours(24);

    private final EmailVerificationTokenRepository tokens;
    private final UserRepository users;
    private final MailService mail;

    @Value("${app.mail.app-base-url:http://localhost:5173}")
    private String appBaseUrl;

    private final SecureRandom random = new SecureRandom();

    public EmailVerificationService(EmailVerificationTokenRepository tokens, UserRepository users,
                                    MailService mail) {
        this.tokens = tokens;
        this.users = users;
        this.mail = mail;
    }

    /** Cria um token novo e envia o link de confirmacao. */
    @Transactional
    public void sendVerification(AppUser user) {
        String rawToken = randomToken();

        EmailVerificationToken token = new EmailVerificationToken();
        token.setUserId(user.getId());
        token.setTokenHash(hash(rawToken));
        token.setExpiresAt(Instant.now().plus(TOKEN_TTL));
        tokens.save(token);

        String link = appBaseUrl.replaceAll("/+$", "") + "/verificar-email?token=" + rawToken;
        String body = """
                Ola, %s.

                Falta um passo para ativar sua conta no TrainLab: confirme seu e-mail.

                %s

                O link vale por 24 horas. Se nao foi voce quem se cadastrou, ignore esta mensagem.

                TrainLab
                """.formatted(user.getName(), link);

        mail.send(user.getEmail(), "Confirme seu e-mail no TrainLab", body,
                MailOutbox.Kind.EMAIL_VERIFICATION);
    }

    /** Consome o token e marca a conta como verificada. */
    @Transactional
    public void verify(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw ApiException.badRequest("Informe o token de confirmacao");
        }
        EmailVerificationToken token = tokens
                .findFirstByTokenHashAndUsedAtIsNullOrderByCreatedAtDesc(hash(rawToken.trim()))
                .orElseThrow(() -> ApiException.badRequest(
                        "Link invalido ou ja utilizado. Peca um novo e-mail de confirmacao."));

        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.badRequest(
                    "Este link expirou. Peca um novo e-mail de confirmacao.");
        }

        AppUser user = users.findById(token.getUserId())
                .orElseThrow(() -> ApiException.notFound("Usuario nao encontrado"));

        token.setUsedAt(Instant.now());
        tokens.save(token);

        user.setEmailVerified(true);
        user.setEmailVerifiedAt(Instant.now());
        users.save(user);
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 indisponivel", ex);
        }
    }
}
