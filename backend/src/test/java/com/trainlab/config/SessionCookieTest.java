package com.trainlab.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Trava as propriedades de seguranca do cookie de sessao.
 *
 * <p>Sao elas que fazem o token ficar fora do alcance do JavaScript (HttpOnly) e fora de
 * requisicoes disparadas por outros sites (SameSite=Strict). Se alguem afrouxar isso sem
 * perceber, o teste quebra.</p>
 */
class SessionCookieTest {

    @Test
    @DisplayName("cookie de sessao e HttpOnly, Strict, no path raiz e com o tempo de vida do token")
    void sessionCookieIsHardened() {
        ResponseCookie cookie = SessionCookie.build("abc.def.ghi", 43_200_000L, false);

        assertThat(cookie.getName()).isEqualTo(SessionCookie.NAME);
        assertThat(cookie.getValue()).isEqualTo("abc.def.ghi");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getSameSite()).isEqualTo("Strict");
        assertThat(cookie.getPath()).isEqualTo("/");
        assertThat(cookie.getMaxAge().getSeconds()).isEqualTo(43_200);
        assertThat(cookie.isSecure()).isFalse();
    }

    @Test
    @DisplayName("em HTTPS o cookie e' Secure")
    void secureFlagFollowsConfiguration() {
        assertThat(SessionCookie.build("t", 1000L, true).isSecure()).isTrue();
    }

    @Test
    @DisplayName("logout zera o cookie")
    void clearExpiresImmediately() {
        ResponseCookie cookie = SessionCookie.clear(false);

        assertThat(cookie.getValue()).isEmpty();
        assertThat(cookie.getMaxAge().getSeconds()).isZero();
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getPath()).isEqualTo("/");
    }
}
