package com.college.roommate.web;

import com.college.roommate.model.Profile;
import com.college.roommate.model.User;
import com.college.roommate.repo.ProfileRepo;
import com.college.roommate.repo.UserRepo;
import com.college.roommate.service.MlClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final ProfileRepo profiles;
    private final UserRepo users;
    private final MlClient ml;

    public MatchController(ProfileRepo profiles, UserRepo users, MlClient ml) {
        this.profiles = profiles;
        this.users = users;
        this.ml = ml;
    }

    /**
     * @param genderPreference optionally overrides the saved preference, so the
     *                         "Same gender only / Anyone" toggle works without
     *                         the student having to save their profile first.
     * @param sharing          same idea for the people-per-room filter.
     */
    @GetMapping("/{userId}")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> matches(@PathVariable Long userId,
                                     @RequestParam(required = false) String genderPreference,
                                     @RequestParam(required = false) String sharing) {

        Optional<Profile> found = profiles.findByUserId(userId);
        if (found.isEmpty()) {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "Fill in your profile to see matches"));
        }

        // Work on a copy: the filter values below must never be persisted.
        Profile seeker = found.get().copy();

        // Apply the live filter values.
        if (genderPreference != null && !genderPreference.isBlank()) {
            seeker.genderPreference = genderPreference;
        }
        if (sharing != null && !sharing.isBlank()) {
            seeker.sharing = sharing;
        }

        List<Profile> candidates = profiles.findAll();

        Map<String, Object> raw = ml.findMatchesRaw(
                seeker, candidates,
                id -> users.findById(id).map(u -> u.name).orElse("Unknown"));

        List<Map<String, Object>> ranked =
                (List<Map<String, Object>>) raw.getOrDefault("matches", List.of());

        // The matching service only knows the six answers and the filters, so
        // everything the card displays is attached here.
        List<Map<String, Object>> enriched = new ArrayList<>();
        for (Map<String, Object> m : ranked) {
            Map<String, Object> row = new HashMap<>(m);
            Long id = Long.valueOf(m.get("userId").toString());

            users.findById(id).ifPresent(u -> {
                row.put("walletAddress", u.walletAddress);
                row.put("verified", Boolean.TRUE.equals(u.verified));
                row.put("hasPhoto", u.hasPhoto());
            });
            profiles.findByUserId(id).ifPresent(p -> {
                row.put("area", p.area);
                row.put("gender", p.gender);
                row.put("sharing", p.sharing);
                // The six answers, so the interface can show lifestyle chips
                // ("Non-smoker", "Very tidy") without a second request.
                row.put("sleepTime", p.sleepTime);
                row.put("cleanliness", p.cleanliness);
                row.put("smoking", p.smoking);
                row.put("foodPref", p.foodPref);
                row.put("noiseTolerance", p.noiseTolerance);
                row.put("studyHabit", p.studyHabit);
            });
            enriched.add(row);
        }

        return ResponseEntity.ok(Map.of(
                "matches", enriched,
                "excluded", raw.getOrDefault("excluded", Map.of()),
                "totalStudents", Math.max(candidates.size() - 1, 0)
        ));
    }
}
