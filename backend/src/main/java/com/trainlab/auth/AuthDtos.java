package com.trainlab.auth;

import com.trainlab.user.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank(message = "o nome é obrigatório")
            @Size(min = 2, max = 120, message = "o nome deve ter entre 2 e 120 caracteres")
            String name,

            @NotBlank(message = "o email é obrigatório")
            @Email(message = "informe um email válido")
            @Size(max = 180, message = "o email deve ter no máximo 180 caracteres")
            String email,

            @NotBlank(message = "a senha é obrigatória")
            @Size(min = 8, max = 72, message = "a senha deve ter entre 8 e 72 caracteres")
            String password,

            @NotNull(message = "o perfil é obrigatório (COACH ou ATHLETE)")
            UserRole role
    ) {
    }

    public record LoginRequest(
            @NotBlank(message = "o email é obrigatório")
            @Email(message = "informe um email válido")
            String email,

            @NotBlank(message = "a senha é obrigatória")
            String password
    ) {
    }

    public record UserDto(UUID id, String name, String email, UserRole role, UUID athleteId) {
    }

    public record AuthResponse(String token, UserDto user) {
    }
}
