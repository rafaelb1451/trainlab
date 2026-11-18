package com.trainlab.activity;

import com.trainlab.athlete.AthleteService;
import com.trainlab.common.ApiException;
import com.trainlab.user.AppUser;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/activities")
public class ActivityController {

    private final ActivityService activityService;
    private final ActivityImportService importService;
    private final AthleteService athleteService;

    public ActivityController(ActivityService activityService,
                              ActivityImportService importService,
                              AthleteService athleteService) {
        this.activityService = activityService;
        this.importService = importService;
        this.athleteService = athleteService;
    }

    @GetMapping
    public List<ActivityDtos.ActivitySummary> list(
            @AuthenticationPrincipal AppUser currentUser,
            @RequestParam(required = false) UUID athleteId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return activityService.list(currentUser, athleteId, from, to);
    }

    @GetMapping("/{id}")
    public ActivityDtos.ActivityDetail get(@AuthenticationPrincipal AppUser currentUser,
                                           @PathVariable UUID id) {
        return activityService.get(id, currentUser);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ActivityDtos.ActivitySummary> importActivity(
            @AuthenticationPrincipal AppUser currentUser,
            @RequestParam(required = false) UUID athleteId,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String notes) {
        UUID targetAthleteId = resolveAthleteId(currentUser, athleteId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(importService.importActivity(currentUser, targetAthleteId, file, name, notes));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AppUser currentUser,
                                       @PathVariable UUID id) {
        activityService.delete(id, currentUser);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/analysis")
    public ActivityDtos.AnalysisResponse analysis(@AuthenticationPrincipal AppUser currentUser,
                                                  @PathVariable UUID id) {
        return activityService.analysis(id, currentUser);
    }

    private UUID resolveAthleteId(AppUser currentUser, UUID athleteId) {
        if (athleteId != null) {
            return athleteId;
        }
        if (currentUser != null && currentUser.getRole() == com.trainlab.user.UserRole.ATHLETE) {
            UUID own = athleteService.athleteIdOf(currentUser);
            if (own != null) {
                return own;
            }
        }
        throw ApiException.badRequest("Informe athleteId para importar a atividade");
    }
}
