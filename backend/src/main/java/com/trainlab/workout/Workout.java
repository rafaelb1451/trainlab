package com.trainlab.workout;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "workouts")
public class Workout {

    /**
     * Referências usadas somente para estimar TSS/distância do template quando o alvo não
     * traz valores absolutos (o template é compartilhado entre atletas). São médias de
     * treino, não limiares individuais.
     */
    private static final double REFERENCE_FTP_WATTS = 250.0;
    private static final double REFERENCE_LTHR_BPM = 165.0;
    private static final double REFERENCE_RUN_PACE_SEC_PER_KM = 300.0;
    private static final double REFERENCE_SWIM_PACE_SEC_PER_100M = 120.0;
    private static final double REFERENCE_BIKE_SPEED_KMH = 32.0;

    private static final double DEFAULT_INTENSITY = 0.65;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "coach_id", nullable = false)
    private UUID coachId;

    /**
     * Atleta dono do treino individual (v5). {@code null} = treino de biblioteca,
     * compartilhado entre todos os atletas do treinador. Só é definido na criação;
     * o PUT nunca move um treino de atleta.
     */
    @Column(name = "athlete_id")
    private UUID athleteId;

    @Column(nullable = false, length = 160)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Sport sport;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WorkoutType type;

    @Column(length = 3000)
    private String description;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "workout_tags", joinColumns = @JoinColumn(name = "workout_id"))
    @Column(name = "tag", length = 60)
    private List<String> tags = new ArrayList<>();

    @Column(nullable = false)
    private Integer difficulty = 3;

    @Column(name = "estimated_duration_sec", nullable = false)
    private Integer estimatedDurationSec = 0;

    /**
     * TSS estimado do template (sem individualização por atleta), recalculado a cada save.
     * Fórmula do SPEC 9.1: Σ duration_h × IF² × 100 × repeat.
     */
    @Column(name = "estimated_tss")
    private Integer estimatedTss;

    /** Distância estimada do template em metros (0 quando não há pace/speed aplicável). */
    @Column(name = "estimated_distance_m")
    private Integer estimatedDistanceM;

    @Column(nullable = false)
    private boolean archived = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "workout", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("position ASC")
    private List<WorkoutBlock> blocks = new ArrayList<>();

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public void addBlock(WorkoutBlock block) {
        block.setWorkout(this);
        blocks.add(block);
    }

    public int calculateEstimatedDurationSec() {
        int total = 0;
        for (WorkoutBlock block : blocks) {
            int repeat = block.getRepeatCount() == null ? 1 : block.getRepeatCount();
            int blockSeconds = 0;
            for (WorkoutStep step : block.getSteps()) {
                if (step.getDurationType() == DurationType.TIME && step.getDurationSec() != null) {
                    blockSeconds += step.getDurationSec();
                }
            }
            total += repeat * blockSeconds;
        }
        return total;
    }

    /**
     * Recalcula {@code estimatedTss} e {@code estimatedDistanceM} do template.
     *
     * <p>IF por step (SPEC 9.1): alvo absoluto (watts/FTP, bpm/LTHR ou pace) tem prioridade;
     * depois zona fixa (Z1..Z7), percentual (midpoint/100), RPE e, por fim, FREE/desconhecido
     * com 0.65. TSS = Σ duração_h × IF² × 100 × repetições. Steps de distância entram na
     * duração via pace/velocidade estimada; steps de tempo geram distância pela mesma
     * referência quando o alvo permite estimar o ritmo.</p>
     */
    public void recalculateEstimates() {
        double totalTss = 0.0;
        double totalDistanceM = 0.0;
        for (WorkoutBlock block : blocks) {
            int repeat = block.getRepeatCount() == null ? 1 : block.getRepeatCount();
            for (WorkoutStep step : block.getSteps()) {
                double intensity = intensityFactor(step.getTarget());
                double durationSec = estimateDurationSec(step, intensity);
                if (durationSec > 0) {
                    totalTss += (durationSec / 3600.0) * intensity * intensity * 100.0 * repeat;
                }
                totalDistanceM += estimateDistanceMeters(step, durationSec, intensity) * repeat;
            }
        }
        this.estimatedTss = (int) Math.round(totalTss);
        this.estimatedDistanceM = (int) Math.round(totalDistanceM);
    }

    private double intensityFactor(Target target) {
        if (target == null || target.getType() == null) {
            return DEFAULT_INTENSITY;
        }
        Double absolute = absoluteIntensity(target);
        if (absolute != null) {
            return absolute;
        }
        return switch (target.getType()) {
            case HR_ZONE, PACE_ZONE, POWER_ZONE -> zoneIntensity(target.getZone());
            case HR_PERCENT, PACE_PERCENT, POWER_PERCENT -> percentIntensity(target);
            case RPE -> rpeIntensity(target);
            case FREE -> DEFAULT_INTENSITY;
        };
    }

    private Double absoluteIntensity(Target target) {
        Double value = midpoint(target.getAbsoluteMin(), target.getAbsoluteMax());
        if (value == null || value <= 0 || target.getAbsoluteUnit() == null) {
            return null;
        }
        return switch (target.getAbsoluteUnit()) {
            case "w" -> value / REFERENCE_FTP_WATTS;
            case "bpm" -> value / REFERENCE_LTHR_BPM;
            // Pace é velocidade invertida: quanto menor o pace, maior a intensidade.
            case "s_per_km" -> REFERENCE_RUN_PACE_SEC_PER_KM / value;
            case "s_per_100m" -> REFERENCE_SWIM_PACE_SEC_PER_100M / value;
            default -> null;
        };
    }

    private double percentIntensity(Target target) {
        Double value = midpoint(target.getMinValue(), target.getMaxValue());
        return value == null || value <= 0 ? DEFAULT_INTENSITY : value / 100.0;
    }

    private double rpeIntensity(Target target) {
        Double value = midpoint(target.getMinValue(), target.getMaxValue());
        if (value == null) {
            return DEFAULT_INTENSITY;
        }
        double rpe = Math.max(1.0, Math.min(10.0, value));
        return 0.50 + (rpe - 1.0) * 0.0667;
    }

    private double zoneIntensity(Integer zone) {
        if (zone == null) {
            return DEFAULT_INTENSITY;
        }
        return switch (zone) {
            case 1 -> 0.55;
            case 2 -> 0.70;
            case 3 -> 0.85;
            case 4 -> 0.95;
            case 5 -> 1.05;
            case 6 -> 1.15;
            case 7 -> 1.25;
            default -> DEFAULT_INTENSITY;
        };
    }

    private Double midpoint(Integer min, Integer max) {
        if (min == null && max == null) {
            return null;
        }
        if (min == null) {
            return max.doubleValue();
        }
        if (max == null) {
            return min.doubleValue();
        }
        return (min + max) / 2.0;
    }

    private double estimateDurationSec(WorkoutStep step, double intensity) {
        if (step.getDurationType() == DurationType.TIME) {
            return step.getDurationSec() == null ? 0.0 : step.getDurationSec();
        }
        if (step.getDurationType() == DurationType.DISTANCE && step.getDistanceM() != null
                && step.getDistanceM() > 0) {
            double speed = estimateSpeedMetersPerSecond(step, intensity);
            return speed <= 0 ? 0.0 : step.getDistanceM() / speed;
        }
        return 0.0;
    }

    private double estimateDistanceMeters(WorkoutStep step, double durationSec, double intensity) {
        if (step.getDistanceM() != null && step.getDistanceM() > 0) {
            return step.getDistanceM();
        }
        if (step.getDurationType() == DurationType.TIME && durationSec > 0) {
            return durationSec * estimateSpeedMetersPerSecond(step, intensity);
        }
        return 0.0;
    }

    private double estimateSpeedMetersPerSecond(WorkoutStep step, double intensity) {
        double safeIntensity = Math.max(0.30, intensity);
        Target target = step.getTarget();
        if (sport == Sport.BIKE) {
            Double absolutePace = absolutePaceSecPerKm(target);
            if (absolutePace != null && absolutePace > 0) {
                return 1000.0 / absolutePace;
            }
            return (REFERENCE_BIKE_SPEED_KMH / 3.6) * safeIntensity;
        }
        if (sport == Sport.SWIM) {
            Double absolutePace = absolutePaceSecPer100m(target);
            double pace = absolutePace == null || absolutePace <= 0
                    ? REFERENCE_SWIM_PACE_SEC_PER_100M / safeIntensity
                    : absolutePace;
            return 100.0 / pace;
        }
        // Corrida (e fallback para esportes sem velocidade própria).
        Double absolutePace = absolutePaceSecPerKm(target);
        double pace = absolutePace == null || absolutePace <= 0
                ? REFERENCE_RUN_PACE_SEC_PER_KM / safeIntensity
                : absolutePace;
        return 1000.0 / pace;
    }

    private Double absolutePaceSecPerKm(Target target) {
        if (target == null) {
            return null;
        }
        Double value = midpoint(target.getAbsoluteMin(), target.getAbsoluteMax());
        if (value == null || value <= 0 || target.getAbsoluteUnit() == null) {
            return null;
        }
        return switch (target.getAbsoluteUnit()) {
            case "s_per_km" -> value;
            case "s_per_100m" -> value * 10.0;
            default -> null;
        };
    }

    private Double absolutePaceSecPer100m(Target target) {
        if (target == null) {
            return null;
        }
        Double value = midpoint(target.getAbsoluteMin(), target.getAbsoluteMax());
        if (value == null || value <= 0 || target.getAbsoluteUnit() == null) {
            return null;
        }
        return switch (target.getAbsoluteUnit()) {
            case "s_per_100m" -> value;
            case "s_per_km" -> value / 10.0;
            default -> null;
        };
    }

    public int countSteps() {
        return blocks.stream().mapToInt(b -> b.getSteps().size()).sum();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getCoachId() {
        return coachId;
    }

    public void setCoachId(UUID coachId) {
        this.coachId = coachId;
    }

    public UUID getAthleteId() {
        return athleteId;
    }

    public void setAthleteId(UUID athleteId) {
        this.athleteId = athleteId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Sport getSport() {
        return sport;
    }

    public void setSport(Sport sport) {
        this.sport = sport;
    }

    public WorkoutType getType() {
        return type;
    }

    public void setType(WorkoutType type) {
        this.type = type;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public Integer getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(Integer difficulty) {
        this.difficulty = difficulty;
    }

    public Integer getEstimatedDurationSec() {
        return estimatedDurationSec;
    }

    public void setEstimatedDurationSec(Integer estimatedDurationSec) {
        this.estimatedDurationSec = estimatedDurationSec;
    }

    public Integer getEstimatedTss() {
        return estimatedTss;
    }

    public void setEstimatedTss(Integer estimatedTss) {
        this.estimatedTss = estimatedTss;
    }

    public Integer getEstimatedDistanceM() {
        return estimatedDistanceM;
    }

    public void setEstimatedDistanceM(Integer estimatedDistanceM) {
        this.estimatedDistanceM = estimatedDistanceM;
    }

    public boolean isArchived() {
        return archived;
    }

    public void setArchived(boolean archived) {
        this.archived = archived;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<WorkoutBlock> getBlocks() {
        return blocks;
    }

    public void setBlocks(List<WorkoutBlock> blocks) {
        this.blocks = blocks;
    }
}
