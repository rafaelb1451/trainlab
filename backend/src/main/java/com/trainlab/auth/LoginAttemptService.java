package com.trainlab.auth;

import com.trainlab.common.ApiException;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Freio de forca bruta no login.
 *
 * <p>Conta as <b>falhas</b> por chave (email + IP) dentro de uma janela deslizante. Ao passar
 * do limite, novas tentativas recebem 429 por um tempo, mesmo que a senha esteja correta — e'
 * o que impede um atacante de testar um dicionario inteiro.</p>
 *
 * <p>O estado e' em memoria: serve para uma instancia. Com varias instancias, trocar por
 * Redis ou bucket4j com backend distribuido.</p>
 */
@Component
public class LoginAttemptService {

    static final int MAX_ATTEMPTS = 5;
    static final Duration WINDOW = Duration.ofMinutes(15);
    static final Duration BLOCK = Duration.ofMinutes(15);

    private final Clock clock;
    private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();
    private final Map<String, Instant> blockedUntil = new ConcurrentHashMap<>();

    public LoginAttemptService() {
        this(Clock.systemUTC());
    }

    /** Visivel para teste: permite controlar o tempo. */
    LoginAttemptService(Clock clock) {
        this.clock = clock;
    }

    public String key(String email, String ip) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
        String normalizedIp = ip == null || ip.isBlank() ? "desconhecido" : ip.trim();
        return normalizedEmail + "|" + normalizedIp;
    }

    /** Lanca 429 quando a chave esta bloqueada. Chamado antes de validar a senha. */
    public void checkAllowed(String key) {
        Instant now = clock.instant();
        Instant until = blockedUntil.get(key);
        if (until == null) {
            return;
        }
        if (now.isBefore(until)) {
            long seconds = Math.max(1, Duration.between(now, until).toSeconds());
            throw ApiException.tooManyRequests(
                    "Muitas tentativas de login. Tente novamente em " + (seconds / 60 + 1) + " minuto(s).");
        }
        blockedUntil.remove(key);
        failures.remove(key);
    }

    public void recordFailure(String key) {
        Instant now = clock.instant();
        Deque<Instant> attempts = failures.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (attempts) {
            attempts.addLast(now);
            prune(attempts, now);
            if (attempts.size() >= MAX_ATTEMPTS) {
                blockedUntil.put(key, now.plus(BLOCK));
                attempts.clear();
            }
        }
    }

    public void recordSuccess(String key) {
        failures.remove(key);
        blockedUntil.remove(key);
    }

    /** Remove marcas antigas para o mapa nao crescer indefinidamente. */
    void pruneExpired() {
        Instant now = clock.instant();
        blockedUntil.entrySet().removeIf(entry -> now.isAfter(entry.getValue()));
        failures.entrySet().removeIf(entry -> {
            synchronized (entry.getValue()) {
                prune(entry.getValue(), now);
                return entry.getValue().isEmpty();
            }
        });
    }

    private void prune(Deque<Instant> attempts, Instant now) {
        Instant limit = now.minus(WINDOW);
        Iterator<Instant> iterator = attempts.iterator();
        while (iterator.hasNext()) {
            if (iterator.next().isBefore(limit)) {
                iterator.remove();
            } else {
                break;
            }
        }
    }
}
