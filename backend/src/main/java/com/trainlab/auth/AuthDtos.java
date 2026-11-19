package com.trainlab.auth;

import com.trainlab.user.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public final class AuthDtos {

    private AuthDtos() {
    }

    /**
     * Auto-cadastro. Nao existe campo de papel: quem se cadastra pela API e' sempre atleta.
     * Um treinador e' criado pelo seed ou por um administrador.
     */
    public record RegisterRequest(
            @NotBlank(message = "o nome e' obrigatorio")
            @Size(min = 2, max = 120, message = "o nome deve ter entre 2 e 120 caracteres")
            String name,

            @NotBlank(message = "o email e' obrigatorio")
            @Email(message = "informe um email valido")
            @Size(max = 180, message = "o email deve ter no maximo 180 caracteres")
            String email,

            @NotBlank(message = "a senha e' obrigatoria")
            @Size(min = 8, max = 72, message = "a senha deve ter entre 8 e 72 caracteres")
            String password
    ) {
    }

    public record LoginRequest(
            @NotBlank(message = "o email e' obrigatorio")
            @Email(message = "informe um email valido")
            String email,

            @NotBlank(message = "a senha e' obrigatoria")
            String password
    ) {
    }

    /** Token que veio no link do e-mail de confirmacao. */
    public record VerifyEmailRequest(
            @NotBlank(message = "informe o token de confirmacao")
            String token
    ) {
    }

    public record UserDto(UUID id, String name, String email, UserRole role, UUID athleteId,
                          boolean emailVerified) {
    }

    /**
     * Resposta de login/registro. O token nao trafega no corpo: ele vai no cookie HttpOnly,
     * para que JavaScript (e portanto um XSS) nao consiga le-lo.
     */
    public record AuthResponse(UserDto user) {
    }
}
