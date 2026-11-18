package com.trainlab.athlete;

import com.trainlab.workout.Sport;
import com.trainlab.workout.ZoneType;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "zone_sets", uniqueConstraints = {
        @UniqueConstraint(name = "uk_zone_sets_athlete_sport_type",
                columnNames = {"athlete_id", "sport", "zone_type"})
})
public class ZoneSet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "athlete_id", nullable = false)
    private UUID athleteId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Sport sport;

    @Enumerated(EnumType.STRING)
    @Column(name = "zone_type", nullable = false, length = 10)
    private ZoneType zoneType;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "zoneSet", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("zoneNumber ASC")
    private List<AthleteZone> zones = new ArrayList<>();

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public void addZone(AthleteZone zone) {
        zone.setZoneSet(this);
        zones.add(zone);
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getAthleteId() {
        return athleteId;
    }

    public void setAthleteId(UUID athleteId) {
        this.athleteId = athleteId;
    }

    public Sport getSport() {
        return sport;
    }

    public void setSport(Sport sport) {
        this.sport = sport;
    }

    public ZoneType getZoneType() {
        return zoneType;
    }

    public void setZoneType(ZoneType zoneType) {
        this.zoneType = zoneType;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<AthleteZone> getZones() {
        return zones;
    }

    public void setZones(List<AthleteZone> zones) {
        this.zones = zones;
    }
}
