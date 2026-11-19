package com.trainlab.config;

import org.springframework.http.ResponseCookie;

import java.time.Duration;

/**
 * Cookie de sessao usado no lugar do token em localStorage.
 *
 * <p>HttpOnly impede leitura por JavaScript (mitiga XSS); SameSite=Strict impede envio em
 * requisicoes vindas de outros sites (mitiga CSRF). O front e o back ficam no mesmo host —
 * no dev via proxy do Vite —, entao o cookie funciona sem CORS especial.</p>
 */
public final class SessionCookie {

    public static final String NAME = "trainlab_token";

    private SessionCookie() {
    }

    public static ResponseCookie build(String token, long maxAgeMs, boolean secure) {
        return ResponseCookie.from(NAME, token)
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .sameSite("Strict")
                .maxAge(Duration.ofMillis(maxAgeMs))
                .build();
    }

    public static ResponseCookie clear(boolean secure) {
        return ResponseCookie.from(NAME, "")
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .sameSite("Strict")
                .maxAge(Duration.ZERO)
                .build();
    }
}
