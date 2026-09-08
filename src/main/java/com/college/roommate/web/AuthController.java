package com.college.roommate.web;

import com.college.roommate.model.User;
import com.college.roommate.repo.UserRepo;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final UserRepo users;

    public AuthController(UserRepo users) {
        this.users = users;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User incoming) {
        if (incoming.email == null || incoming.email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        if (users.existsByEmail(incoming.email)) {
            return ResponseEntity.badRequest().body(Map.of("error", "That email is already registered"));
        }
        User saved = users.save(incoming);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        Optional<User> found = users.findByEmail(body.get("email"));

        if (found.isEmpty() || !found.get().password.equals(body.get("password"))) {
            return ResponseEntity.status(401).body(Map.of("error", "Email or password is incorrect"));
        }
        return ResponseEntity.ok(found.get());
    }

    /** Called after the user connects MetaMask, so consent can be keyed on their wallet. */
    @PostMapping("/wallet/{userId}")
    public ResponseEntity<?> saveWallet(@PathVariable Long userId, @RequestBody Map<String, String> body) {
        Optional<User> found = users.findById(userId);
        if (found.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }
        User user = found.get();
        user.walletAddress = body.get("walletAddress");
        return ResponseEntity.ok(users.save(user));
    }
}
