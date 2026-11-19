package com.trainlab.auth;

import com.trainlab.common.ApiException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Testes do freio de forca bruta no login.
 *
 * <p>O relogio e' injetado para o teste poder "avancar o tempo" sem dormir.</p>
 */
class LoginAttemptServiceTest {

    private static final String KEY = "rafael@teste.local|10.0.0.1";

    /** Relogio controlado pelo teste. */
    private static final class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-11-19T12:00:00Z");

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    @Test
    @DisplayName("a chave junta email normalizado e IP")
    void buildsKey() {
        LoginAttemptService service = new LoginAttemptService();

        assertThat(service.key("  Rafael@Teste.Local ", "10.0.0.1"))
                .isEqualTo("rafael@teste.local|10.0.0.1");
        assertThat(service.key(null, null)).isEqualTo("|desconhecido");
    }

    @Test
    @DisplayName("quatro falhas ainda deixam tentar; a quinta bloqueia")
    void blocksAfterFiveFailures() {
        LoginAttemptService service = new LoginAttemptService();

        for (int i = 0; i < LoginAttemptService.MAX_ATTEMPTS - 1; i++) {
            service.recordFailure(KEY);
            assertThatCode(() -> service.checkAllowed(KEY)).doesNotThrowAnyException();
        }

        service.recordFailure(KEY);
        assertThatThrownBy(() -> service.checkAllowed(KEY))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Muitas tentativas");
    }

    @Test
    @DisplayName("login certo zera o contador")
    void successResetsCounter() {
        LoginAttemptService service = new LoginAttemptService();
        for (int i = 0; i < LoginAttemptService.MAX_ATTEMPTS - 1; i++) {
            service.recordFailure(KEY);
        }

        service.recordSuccess(KEY);

        for (int i = 0; i < LoginAttemptService.MAX_ATTEMPTS - 1; i++) {
            service.recordFailure(KEY);
        }
        assertThatCode(() -> service.checkAllowed(KEY)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("o bloqueio expira depois da janela")
    void blockExpires() {
        MutableClock clock = new MutableClock();
        LoginAttemptService service = new LoginAttemptService(clock);

        for (int i = 0; i < LoginAttemptService.MAX_ATTEMPTS; i++) {
            service.recordFailure(KEY);
        }
        assertThatThrownBy(() -> service.checkAllowed(KEY)).isInstanceOf(ApiException.class);

        clock.advance(LoginAttemptService.BLOCK.plusSeconds(1));

        assertThatCode(() -> service.checkAllowed(KEY)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("falhas antigas saem da janela e nao bloqueiam para sempre")
    void oldFailuresFallOutOfWindow() {
        MutableClock clock = new MutableClock();
        LoginAttemptService service = new LoginAttemptService(clock);

        for (int i = 0; i < LoginAttemptService.MAX_ATTEMPTS - 1; i++) {
            service.recordFailure(KEY);
        }
        clock.advance(LoginAttemptService.WINDOW.plusSeconds(1));
        service.recordFailure(KEY);

        assertThatCode(() -> service.checkAllowed(KEY)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("chaves diferentes nao se contaminam")
    void keysAreIndependent() {
        LoginAttemptService service = new LoginAttemptService();
        String outra = "outro@teste.local|10.0.0.2";

        for (int i = 0; i < LoginAttemptService.MAX_ATTEMPTS; i++) {
            service.recordFailure(KEY);
        }

        assertThatCode(() -> service.checkAllowed(outra)).doesNotThrowAnyException();
    }
}
