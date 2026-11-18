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

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "coach_id", nullable = false)
    private UUID coachId;

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
