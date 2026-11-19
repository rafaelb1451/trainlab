package com.trainlab.auth;

import com.trainlab.athlete.Athlete;
import com.trainlab.athlete.AthleteRepository;
import com.trainlab.common.ApiException;
import com.trainlab.config.JwtService;
import com.trainlab.config.SessionCookie;
import com.trainlab.user.AppUser;
import com.trainlab.user.UserRepository;
import com.trainlab.user.UserRole;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
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
    private final LoginAttemptService loginAttempts;

    @Value("${app.jwt.cookie-secure:false}")
    private boolean secureCookie;

    public AuthController(UserRepository userRepository, AthleteRepository athleteRepository,
                          PasswordEncoder passwordEncoder, JwtService jwtService,
                          LoginAttemptService loginAttempts) {
        this.userRepository = userRepository;
        this.athleteRepository = athleteRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.loginAttempts = loginAttempts;
    }

    /**
     * Auto-cadastro publico.
     *
     * <p>Sempre cria um ATHLETE: o papel nao vem do cliente. Um treinador e' criado pelo seed
     * ou por um administrador — caso contrario qualquer pessoa se daria privilegio de
     * treinador no proprio cadastro.</p>
     */
    @PostMapping("/register")
    public ResponseEntity<AuthDtos.AuthResponse> register(
            @Valid @RequestBody AuthDtos.RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("Ja existe um usuario cadastrado com este email");
        }

        AppUser user = new AppUser();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(UserRole.ATHLETE);
        user = userRepository.save(user);

        Athlete athlete = new Athlete();
        athlete.setUserId(user.getId());
        athlete.setDisplayName(user.getName());
        athlete = athleteRepository.save(athlete);

        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, cookieFor(user).toString())
                .body(new AuthDtos.AuthResponse(toDto(user, athlete.getId())));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDtos.AuthResponse> login(
            @Valid @RequestBody AuthDtos.LoginRequest request, HttpServletRequest http) {
        String key = loginAttempts.key(request.email(), http.getRemoteAddr());
        loginAttempts.checkAllowed(key);

        AppUser user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .orElseThrow(() -> {
                    loginAttempts.recordFailure(key);
                    return ApiException.unauthorized("Email ou senha invalidos");
                });
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            loginAttempts.recordFailure(key);
            throw ApiException.unauthorized("Email ou senha invalidos");
        }

        loginAttempts.recordSuccess(key);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookieFor(user).toString())
                .body(new AuthDtos.AuthResponse(toDto(user, athleteIdOf(user))));
    }

    /**
     * Encerra a sessao: apaga o cookie <b>e</b> incrementa a versao do token, invalidando
     * tambem qualquer copia do token que tenha vazado.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal AppUser user) {
        if (user != null) {
            user.bumpTokenVersion();
            userRepository.save(user);
        }
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, SessionCookie.clear(secureCookie).toString())
                .build();
    }

    @GetMapping("/me")
    public AuthDtos.UserDto me(@AuthenticationPrincipal AppUser user) {
        if (user == null) {
            throw ApiException.unauthorized("Autenticacao necessaria");
        }
        return toDto(user, athleteIdOf(user));
    }

    private String cookieFor(AppUser user) {
        String token = jwtService.generateToken(user);
        return SessionCookie.build(token, jwtService.getExpirationMs(), secureCookie).toString();
    }

    private AuthDtos.UserDto toDto(AppUser user, java.util.UUID athleteId) {
        return new AuthDtos.UserDto(user.getId(), user.getName(), user.getEmail(),
                user.getRole(), athleteId);
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
