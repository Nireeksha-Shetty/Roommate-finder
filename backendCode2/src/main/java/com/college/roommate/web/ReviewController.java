package com.college.roommate.web;

import com.college.roommate.model.Review;
import com.college.roommate.repo.ReviewRepo;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewRepo reviews;

    public ReviewController(ReviewRepo reviews) {
        this.reviews = reviews;
    }

    /**
     * Saves the review text. The frontend has already published
     * keccak256(text) to the contract and passes the hash in.
     */
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Review incoming) {
        if (incoming.text == null || incoming.text.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Write something first"));
        }
        if (incoming.rating == null || incoming.rating < 1 || incoming.rating > 5) {
            return ResponseEntity.badRequest().body(Map.of("error", "Pick a rating from 1 to 5"));
        }

        // If the review was written without a wallet connected there is no
        // on-chain hash. Leave it empty rather than inventing one: the contract
        // stores keccak256, so any hash produced here would never verify and
        // the review would look protected when it is not.
        if (incoming.reviewHash != null && incoming.reviewHash.isBlank()) {
            incoming.reviewHash = null;
        }

        return ResponseEntity.ok(reviews.save(incoming));
    }

    @GetMapping("/{subjectId}")
    public List<Review> forUser(@PathVariable Long subjectId) {
        return reviews.findBySubjectIdOrderByCreatedAtDesc(subjectId);
    }
}
