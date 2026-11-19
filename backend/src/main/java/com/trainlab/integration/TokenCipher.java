package com.trainlab.integration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Cifra as credenciais de integracao antes de gravar no banco (AES-GCM).
 *
 * <p>A chave vem de {@code INTEGRATION_SECRET}. Sem a variavel, o servidor cria e guarda uma
 * chave local em {@code ./data/integration.key} — assim o ambiente de desenvolvimento
 * sobrevive a reinicios sem colocar segredo no repositorio.</p>
 */
@Component
public class TokenCipher {

    private static final Logger log = LoggerFactory.getLogger(TokenCipher.class);
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;
    private static final Path DEV_KEY_FILE = Path.of("data", "integration.key");

    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public TokenCipher(@Value("${app.integration.secret:}") String secret) {
        byte[] material;
        if (secret != null && !secret.isBlank()) {
            material = sha256(secret);
        } else {
            material = loadOrCreateDevKey();
        }
        this.key = new SecretKeySpec(material, "AES");
    }

    public String encrypt(String plain) {
        if (plain == null || plain.isBlank()) {
            throw new IllegalArgumentException("Credencial vazia");
        }
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));

            byte[] payload = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, payload, 0, iv.length);
            System.arraycopy(encrypted, 0, payload, iv.length, encrypted.length);
            return Base64.getEncoder().encodeToString(payload);
        } catch (Exception ex) {
            throw new IllegalStateException("Falha ao cifrar credencial", ex);
        }
    }

    public String decrypt(String encoded) {
        if (encoded == null || encoded.isBlank()) {
            return null;
        }
        try {
            byte[] payload = Base64.getDecoder().decode(encoded);
            byte[] iv = new byte[IV_BYTES];
            byte[] encrypted = new byte[payload.length - IV_BYTES];
            System.arraycopy(payload, 0, iv, 0, IV_BYTES);
            System.arraycopy(payload, IV_BYTES, encrypted, 0, encrypted.length);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new IllegalStateException("Falha ao decifrar credencial", ex);
        }
    }

    private static byte[] sha256(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 indisponivel", ex);
        }
    }

    private static byte[] loadOrCreateDevKey() {
        try {
            if (Files.exists(DEV_KEY_FILE)) {
                return Base64.getDecoder().decode(Files.readString(DEV_KEY_FILE).trim());
            }
            byte[] generated = new byte[32];
            new SecureRandom().nextBytes(generated);
            Files.createDirectories(DEV_KEY_FILE.getParent());
            Files.writeString(DEV_KEY_FILE, Base64.getEncoder().encodeToString(generated));
            log.warn("INTEGRATION_SECRET nao definido: chave local criada em {}. "
                    + "Em producao defina a variavel.", DEV_KEY_FILE.toAbsolutePath());
            return generated;
        } catch (IOException ex) {
            log.warn("Nao foi possivel persistir a chave local de integracao; "
                    + "as conexoes expiram ao reiniciar.", ex);
            byte[] generated = new byte[32];
            new SecureRandom().nextBytes(generated);
            return generated;
        }
    }
}
