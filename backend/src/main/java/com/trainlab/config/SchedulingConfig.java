package com.trainlab.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Habilita os jobs periodicos (hoje: o resumo de planejamento por e-mail). */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
