package com.trainlab.plan;

import com.trainlab.user.AppUser;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/planned")
public class PlannedWorkoutController {

    private final PlannedWorkoutService plannedWorkoutService;

    public PlannedWorkoutController(PlannedWorkoutService plannedWorkoutService) {
        this.plannedWorkoutService = plannedWorkoutService;
    }

    @GetMapping
    public List<PlanDtos.PlannedWorkoutDto> list(@AuthenticationPrincipal AppUser currentUser,
                                                 @RequestParam(required = false) UUID athleteId,
                                                 @RequestParam(required = false)
                                                 @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                 @RequestParam(required = false)
                                                 @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return plannedWorkoutService.list(currentUser, athleteId, from, to);
    }

    @PostMapping
    public ResponseEntity<PlanDtos.PlannedWorkoutDto> create(
            @AuthenticationPrincipal AppUser currentUser,
            @Valid @RequestBody PlanDtos.PlannedWorkoutRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(plannedWorkoutService.create(currentUser, request));
    }

    @PatchMapping("/{id}")
    public PlanDtos.PlannedWorkoutDto patch(@AuthenticationPrincipal AppUser currentUser,
                                            @PathVariable UUID id,
                                            @Valid @RequestBody PlanDtos.PlannedWorkoutPatchRequest request) {
        return plannedWorkoutService.patch(id, currentUser, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AppUser currentUser, @PathVariable UUID id) {
        plannedWorkoutService.delete(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
