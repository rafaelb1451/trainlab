package com.trainlab.athlete;

import com.trainlab.user.AppUser;
import com.trainlab.workout.Sport;
import com.trainlab.workout.ZoneType;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/athletes")
public class AthleteController {

    private final AthleteService athleteService;

    public AthleteController(AthleteService athleteService) {
        this.athleteService = athleteService;
    }

    @GetMapping
    public List<AthleteDtos.AthleteSummary> list(@AuthenticationPrincipal AppUser currentUser) {
        return athleteService.list(currentUser);
    }

    @PostMapping
    public ResponseEntity<AthleteDtos.AthleteDetail> create(@AuthenticationPrincipal AppUser currentUser,
                                                            @Valid @RequestBody AthleteDtos.AthleteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(athleteService.create(currentUser, request));
    }

    @GetMapping("/{id}")
    public AthleteDtos.AthleteDetail get(@AuthenticationPrincipal AppUser currentUser,
                                         @PathVariable UUID id) {
        return athleteService.get(id, currentUser);
    }

    @PutMapping("/{id}")
    public AthleteDtos.AthleteDetail update(@AuthenticationPrincipal AppUser currentUser,
                                            @PathVariable UUID id,
                                            @Valid @RequestBody AthleteDtos.AthleteUpdateRequest request) {
        return athleteService.update(id, currentUser, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AppUser currentUser, @PathVariable UUID id) {
        athleteService.delete(id, currentUser);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/thresholds")
    public List<AthleteDtos.ThresholdDto> thresholds(@AuthenticationPrincipal AppUser currentUser,
                                                     @PathVariable UUID id) {
        return athleteService.getThresholds(id, currentUser);
    }

    @PutMapping("/{id}/thresholds/{sport}")
    public AthleteDtos.ThresholdDto putThreshold(@AuthenticationPrincipal AppUser currentUser,
                                                 @PathVariable UUID id,
                                                 @PathVariable Sport sport,
                                                 @Valid @RequestBody AthleteDtos.ThresholdRequest request) {
        return athleteService.putThreshold(id, sport, currentUser, request);
    }

    @GetMapping("/{id}/zones")
    public List<AthleteDtos.ZoneDto> zones(@AuthenticationPrincipal AppUser currentUser,
                                           @PathVariable UUID id) {
        return athleteService.getZones(id, currentUser);
    }

    @PutMapping("/{id}/zones/{sport}/{type}")
    public List<AthleteDtos.ZoneDto> putZones(@AuthenticationPrincipal AppUser currentUser,
                                              @PathVariable UUID id,
                                              @PathVariable Sport sport,
                                              @PathVariable ZoneType type,
                                              @Valid @RequestBody List<AthleteDtos.ZoneInput> inputs) {
        return athleteService.putZones(id, sport, type, currentUser, inputs);
    }
}
