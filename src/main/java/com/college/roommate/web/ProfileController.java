package com.college.roommate.web;

import com.college.roommate.model.Profile;
import com.college.roommate.repo.ProfileRepo;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileRepo profiles;

    public ProfileController(ProfileRepo profiles) {
        this.profiles = profiles;
    }

    /** Creates the profile, or updates it if the user already filled the form. */
    @PostMapping
    public ResponseEntity<?> save(@RequestBody Profile incoming) {
        if (incoming.userId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "userId is required"));
        }

        Optional<Profile> existing = profiles.findByUserId(incoming.userId);
        existing.ifPresent(p -> incoming.id = p.id);

        return ResponseEntity.ok(profiles.save(incoming));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> get(@PathVariable Long userId) {
        Optional<Profile> found = profiles.findByUserId(userId);

        if (found.isEmpty()) {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "Fill in your preferences to see matches"));
        }
        return ResponseEntity.ok(found.get());
    }
}
