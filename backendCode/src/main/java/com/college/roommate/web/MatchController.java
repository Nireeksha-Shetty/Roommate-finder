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

    @GetMapping("/{userId}")
    public ResponseEntity<?> matches(@PathVariable Long userId) {
        Optional<Profile> seeker = profiles.findByUserId(userId);
        if (seeker.isEmpty()) {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "Fill in your preferences to see matches"));
        }

        List<Profile> candidates = profiles.findAll();

        List<Map<String, Object>> ranked = ml.findMatches(
                seeker.get(),
                candidates,
                id -> users.findById(id).map(u -> u.name).orElse("Unknown")
        );

        // The matching service knows nothing about wallets, so add them here.
        // The frontend needs each wallet to send a consent transaction.
        List<Map<String, Object>> withWallets = new ArrayList<>();
        for (Map<String, Object> match : ranked) {
            Map<String, Object> copy = new HashMap<>(match);
            Long matchUserId = Long.valueOf(match.get("userId").toString());
            copy.put("walletAddress",
                    users.findById(matchUserId).map(u -> u.walletAddress).orElse(null));
            withWallets.add(copy);
        }

        return ResponseEntity.ok(Map.of("matches", withWallets));
    }
}
