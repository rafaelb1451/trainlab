package com.trainlab.workout;

import com.trainlab.user.AppUser;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workouts")
public class WorkoutController {

    private final WorkoutService workoutService;

    public WorkoutController(WorkoutService workoutService) {
        this.workoutService = workoutService;
    }

    @GetMapping
    public List<WorkoutDtos.WorkoutSummary> list(@AuthenticationPrincipal AppUser currentUser,
                                                 @RequestParam(required = false) Sport sport,
                                                 @RequestParam(required = false) String q,
                                                 @RequestParam(required = false) String tag,
                                                 @RequestParam(required = false) UUID athleteId,
                                                 @RequestParam(required = false) String scope) {
        return workoutService.list(currentUser, sport, q, tag, athleteId, scope);
    }

    /**
     * Cria treino individual + sessão planejada de forma atômica (SPEC 11.1.4).
     */
    @PostMapping("/assign")
    public ResponseEntity<WorkoutDtos.AssignResponse> assign(
            @AuthenticationPrincipal AppUser currentUser,
            @Valid @RequestBody WorkoutDtos.AssignRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(workoutService.assign(currentUser, request));
    }

    @GetMapping("/tags")
    public List<String> tags(@AuthenticationPrincipal AppUser currentUser) {
        return workoutService.tags(currentUser);
    }

    @PostMapping
    public ResponseEntity<WorkoutDtos.WorkoutDetail> create(@AuthenticationPrincipal AppUser currentUser,
                                                            @Valid @RequestBody WorkoutDtos.WorkoutRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(workoutService.create(currentUser, request));
    }

    @GetMapping("/{id}")
    public WorkoutDtos.WorkoutDetail get(@AuthenticationPrincipal AppUser currentUser, @PathVariable UUID id) {
        return workoutService.get(id, currentUser);
    }

    @PutMapping("/{id}")
    public WorkoutDtos.WorkoutDetail update(@AuthenticationPrincipal AppUser currentUser,
                                            @PathVariable UUID id,
                                            @Valid @RequestBody WorkoutDtos.WorkoutRequest request) {
        return workoutService.update(id, currentUser, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AppUser currentUser, @PathVariable UUID id) {
        workoutService.delete(id, currentUser);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<WorkoutDtos.WorkoutDetail> duplicate(@AuthenticationPrincipal AppUser currentUser,
                                                               @PathVariable UUID id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(workoutService.duplicate(id, currentUser));
    }

    @GetMapping("/{id}/preview")
    public WorkoutDtos.WorkoutPreview preview(@AuthenticationPrincipal AppUser currentUser,
                                              @PathVariable UUID id,
                                              @RequestParam(required = false) UUID athleteId) {
        return workoutService.preview(id, athleteId, currentUser);
    }
}
