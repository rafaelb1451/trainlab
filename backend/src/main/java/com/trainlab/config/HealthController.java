package com.trainlab.config;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Sonda publica de saude, usada pelo healthcheck do container e pelo proxy.
 * Nao expoe nada de negocio: apenas confirma que a aplicacao subiu.
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public Map<String, Object> health() {
        return Map.of(
                "status", "ok",
                "time", Instant.now().toString()
        );
    }
}
