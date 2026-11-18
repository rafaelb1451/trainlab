package com.trainlab.auth;

import com.trainlab.athlete.Athlete;
import com.trainlab.athlete.AthleteRepository;
import com.trainlab.common.ApiException;
import com.trainlab.config.JwtService;
import com.trainlab.user.AppUser;
import com.trainlab.user.UserRepository;
import com.trainlab.user.UserRole;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final AthleteRepository athleteRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(UserRepository userRepository, AthleteRepository athleteRepository,
                          PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.athleteRepository = athleteRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthDtos.AuthResponse> register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("Já existe um usuário cadastrado com este email");
        }

        AppUser user = new AppUser();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        user = userRepository.save(user);

        java.util.UUID athleteId = null;
        if (user.getRole() == UserRole.ATHLETE) {
            Athlete athlete = new Athlete();
            athlete.setUserId(user.getId());
            athlete.setDisplayName(user.getName());
            athlete = athleteRepository.save(athlete);
            athleteId = athlete.getId();
        }

        String token = jwtService.generateToken(user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AuthDtos.AuthResponse(token, toDto(user, athleteId)));
    }

    @PostMapping("/login")
    public AuthDtos.AuthResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        AppUser user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .orElseThrow(() -> ApiException.unauthorized("Email ou senha inválidos"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Email ou senha inválidos");
        }
        String token = jwtService.generateToken(user);
        return new AuthDtos.AuthResponse(token, toDto(user, athleteIdOf(user)));
    }

    @GetMapping("/me")
    public AuthDtos.UserDto me(@AuthenticationPrincipal AppUser user) {
        if (user == null) {
            throw ApiException.unauthorized("Autenticação necessária");
        }
        return toDto(user, athleteIdOf(user));
    }

    private AuthDtos.UserDto toDto(AppUser user, java.util.UUID athleteId) {
        return new AuthDtos.UserDto(user.getId(), user.getName(), user.getEmail(), user.getRole(), athleteId);
    }

    private java.util.UUID athleteIdOf(AppUser user) {
        if (user.getRole() != UserRole.ATHLETE) {
            return null;
        }
        return athleteRepository.findByUserId(user.getId()).map(Athlete::getId).orElse(null);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
