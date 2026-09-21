package com.college.roommate.web;

import com.college.roommate.model.Profile;
import com.college.roommate.model.User;
import com.college.roommate.repo.ProfileRepo;
import com.college.roommate.repo.UserRepo;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final UserRepo users;
    private final ProfileRepo profiles;

    public AuthController(UserRepo users, ProfileRepo profiles) {
        this.users = users;
        this.profiles = profiles;
    }

    /** The whole signup wizard arrives in one request. */
    public static class SignupRequest {
        public String name;
        public String email;
        public String phone;
        public String password;
        public String gender;
        public String genderPreference;
        public String city;
        public String area;
        public Integer budget;
        public String sharing;
        public List<Integer> answers;      // the six 1-5 values, in order
        public String walletAddress;       // optional, may be skipped
    }

    private List<String> problemsWith(SignupRequest r) {
        List<String> problems = new ArrayList<>();

        if (r.name == null || r.name.isBlank()) problems.add("Enter your name");
        if (r.email == null || !r.email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))
            problems.add("Enter a valid email address");
        if (r.phone == null || r.phone.replaceAll("\\D", "").length() < 10)
            problems.add("Enter all 10 digits of your phone number");
        if (r.password == null || r.password.length() < 8)
            problems.add("Use a password of at least 8 characters");
        if (r.gender == null || r.gender.isBlank()) problems.add("Pick your gender");
        if (r.city == null || r.city.isBlank()) problems.add("Enter your city");
        if (r.area == null || r.area.isBlank()) problems.add("Enter an area");
        if (r.budget == null || r.budget <= 0) problems.add("Enter your monthly budget");
        if (r.sharing == null || r.sharing.isBlank()) problems.add("Pick how many per room");

        // All six are required. A default of 3 would silently record "average"
        // for questions nobody answered, and those profiles would drag every
        // other student's match score toward the middle.
        if (r.answers == null || r.answers.size() != 6 || r.answers.contains(null))
            problems.add("Answer all six lifestyle questions");

        return problems;
    }

    /**
     * Creates the user and the profile together. Transactional so a failure
     * halfway cannot leave an account with no profile, which would then show
     * up in nobody's matches and confuse the student.
     */
    @PostMapping("/register")
    @Transactional
    public ResponseEntity<?> register(@RequestBody SignupRequest request) {
        List<String> problems = problemsWith(request);
        if (!problems.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", problems.get(0),
                    "problems", problems));
        }
        if (users.existsByEmail(request.email)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "That email is already registered"));
        }

        User user = new User();
        user.name = request.name.trim();
        user.email = request.email.trim();
        user.phone = request.phone.trim();
        user.password = request.password;
        user.walletAddress = request.walletAddress;
        user.verified = false;
        user = users.save(user);

        Profile profile = new Profile();
        profile.userId = user.id;
        profile.city = request.city.trim();
        profile.area = request.area.trim();
        profile.budget = request.budget;
        profile.gender = request.gender;
        profile.genderPreference =
                request.genderPreference == null ? "same" : request.genderPreference;
        profile.sharing = request.sharing;
        profile.sleepTime = request.answers.get(0);
        profile.cleanliness = request.answers.get(1);
        profile.smoking = request.answers.get(2);
        profile.foodPref = request.answers.get(3);
        profile.noiseTolerance = request.answers.get(4);
        profile.studyHabit = request.answers.get(5);
        profiles.save(profile);

        return ResponseEntity.ok(user);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        Optional<User> found = users.findByEmail(body.get("email"));

        if (found.isEmpty() || !found.get().password.equals(body.get("password"))) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Email or password is incorrect"));
        }
        return ResponseEntity.ok(found.get());
    }

    /** Called when a student connects MetaMask, at signup or later. */
    @PostMapping("/wallet/{userId}")
    public ResponseEntity<?> saveWallet(@PathVariable Long userId,
                                        @RequestBody Map<String, String> body) {
        Optional<User> found = users.findById(userId);
        if (found.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }
        User user = found.get();
        user.walletAddress = body.get("walletAddress");
        return ResponseEntity.ok(users.save(user));
    }

    /** Lets the frontend refresh the signed-in student after an upload. */
    @GetMapping("/me/{userId}")
    public ResponseEntity<?> me(@PathVariable Long userId) {
        Optional<User> found = users.findById(userId);
        if (found.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }
        return ResponseEntity.ok(found.get());
    }
}
