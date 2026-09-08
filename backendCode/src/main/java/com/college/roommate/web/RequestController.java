package com.college.roommate.web;

import com.college.roommate.model.ContactRequest;
import com.college.roommate.model.User;
import com.college.roommate.repo.ContactRequestRepo;
import com.college.roommate.repo.UserRepo;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Asking to see someone's contact details, and their decision on it.
 *
 * Deliberately kept off the blockchain: a request grants nothing, so it has no
 * business being public and permanent. Approving one records the decision and
 * the transaction hash, but the permission itself is only ever created by the
 * owner's own key signing grantConsent. See ConsentController.contact - it
 * reads the contract, never this table.
 */
@RestController
@RequestMapping("/api/requests")
public class RequestController {

    private final ContactRequestRepo requests;
    private final UserRepo users;

    public RequestController(ContactRequestRepo requests, UserRepo users) {
        this.requests = requests;
        this.users = users;
    }

    /** Ask a user for their contact details. Asking twice reuses the same row. */
    @PostMapping
    public ResponseEntity<?> create(@RequestBody ContactRequest incoming) {
        if (incoming.requesterId == null || incoming.ownerId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "requesterId and ownerId are both required"));
        }
        if (incoming.requesterId.equals(incoming.ownerId)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "You cannot request your own details"));
        }
        if (users.findById(incoming.requesterId).isEmpty()
                || users.findById(incoming.ownerId).isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }

        // Re-asking after a rejection puts it back in front of the owner
        // rather than creating a second row.
        Optional<ContactRequest> existing =
                requests.findByRequesterIdAndOwnerId(incoming.requesterId, incoming.ownerId);

        ContactRequest request = existing.orElseGet(ContactRequest::new);
        request.requesterId = incoming.requesterId;
        request.ownerId = incoming.ownerId;
        request.status = ContactRequest.PENDING;
        request.txHash = null;
        request.decidedAt = null;
        if (existing.isEmpty()) {
            request.createdAt = Instant.now();
        }

        return ResponseEntity.ok(requests.save(request));
    }

    /** Requests waiting for this user to approve or reject. */
    @GetMapping("/incoming/{ownerId}")
    public List<Map<String, Object>> incoming(@PathVariable Long ownerId) {
        List<Map<String, Object>> out = new ArrayList<>();

        for (ContactRequest r : requests.findByOwnerIdAndStatusOrderByCreatedAtDesc(
                ownerId, ContactRequest.PENDING)) {

            Optional<User> requester = users.findById(r.requesterId);
            if (requester.isEmpty()) {
                continue;
            }

            Map<String, Object> row = new HashMap<>();
            row.put("id", r.id);
            row.put("requesterId", r.requesterId);
            row.put("requesterName", requester.get().name);
            // Needed to sign grantConsent for the right address.
            row.put("requesterWallet", requester.get().walletAddress);
            row.put("createdAt", r.createdAt);
            out.add(row);
        }
        return out;
    }

    /** Everything this user has asked for, so the UI can show the status. */
    @GetMapping("/outgoing/{requesterId}")
    public List<Map<String, Object>> outgoing(@PathVariable Long requesterId) {
        List<Map<String, Object>> out = new ArrayList<>();

        for (ContactRequest r : requests.findByRequesterIdOrderByCreatedAtDesc(requesterId)) {
            Map<String, Object> row = new HashMap<>();
            row.put("id", r.id);
            row.put("ownerId", r.ownerId);
            row.put("ownerName", users.findById(r.ownerId).map(u -> u.name).orElse("Unknown"));
            row.put("status", r.status);
            out.add(row);
        }
        return out;
    }

    /**
     * Records that the owner approved, along with the transaction hash if the
     * signing tool produced one.
     *
     * This does not release anything by itself. Contact details are still
     * gated on hasConsent in the contract, so if the grant transaction never
     * reached the chain this row is simply a decision with no effect.
     */
    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id,
                                     @RequestBody(required = false) Map<String, String> body) {

        Optional<ContactRequest> found = requests.findById(id);
        if (found.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Request not found"));
        }

        ContactRequest request = found.get();
        request.status = ContactRequest.APPROVED;
        request.decidedAt = Instant.now();
        if (body != null) {
            request.txHash = body.get("txHash");
        }

        return ResponseEntity.ok(requests.save(request));
    }

    /** Turns the request down. Nothing is written to the chain. */
    @PostMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id) {
        Optional<ContactRequest> found = requests.findById(id);
        if (found.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Request not found"));
        }

        ContactRequest request = found.get();
        request.status = ContactRequest.REJECTED;
        request.decidedAt = Instant.now();
        request.txHash = null;

        return ResponseEntity.ok(requests.save(request));
    }
}
