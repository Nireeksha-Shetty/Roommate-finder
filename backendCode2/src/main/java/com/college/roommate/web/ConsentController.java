package com.college.roommate.web;

import com.college.roommate.model.Consent;
import com.college.roommate.model.User;
import com.college.roommate.repo.ConsentRepo;
import com.college.roommate.repo.UserRepo;
import com.college.roommate.service.ChainClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class ConsentController {

    private final ConsentRepo consents;
    private final UserRepo users;
    private final ChainClient chain;

    public ConsentController(ConsentRepo consents, UserRepo users, ChainClient chain) {
        this.consents = consents;
        this.users = users;
        this.chain = chain;
    }

    /**
     * Records a consent transaction after MetaMask has confirmed it.
     * The blockchain already holds the permission - this is the audit trail.
     */
    @PostMapping("/consent")
    public ResponseEntity<?> record(@RequestBody Consent incoming) {
        if (incoming.txHash == null || incoming.txHash.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Confirm the transaction in MetaMask first"));
        }

        Optional<Consent> existing =
                consents.findByGranterIdAndReceiverId(incoming.granterId, incoming.receiverId);
        existing.ifPresent(c -> incoming.id = c.id);

        return ResponseEntity.ok(consents.save(incoming));
    }

    /**
     * Returns a user's phone number and email, but only if the blockchain
     * says they granted permission to the person asking.
     *
     * This is the part worth demonstrating: deleting the row from the consents
     * table changes nothing, because the check below reads the contract.
     */
    @GetMapping("/contact/{granterId}")
    public ResponseEntity<?> contact(@PathVariable Long granterId,
                                     @RequestParam Long viewerId) {

        Optional<User> granter = users.findById(granterId);
        Optional<User> viewer = users.findById(viewerId);

        if (granter.isEmpty() || viewer.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }

        if (granter.get().walletAddress == null || viewer.get().walletAddress == null) {
            return ResponseEntity.status(400)
                    .body(Map.of("error", "Both users need to connect MetaMask first"));
        }

        boolean allowed = chain.hasConsent(
                granter.get().walletAddress,
                viewer.get().walletAddress
        );

        if (!allowed) {
            return ResponseEntity.status(403).body(Map.of(
                    "error", granter.get().name + " has not shared their contact details with you",
                    "checkedOnChain", true
            ));
        }

        return ResponseEntity.ok(Map.of(
                "name", granter.get().name,
                "phone", granter.get().phone,
                "email", granter.get().email,
                "verifiedOnChain", true
        ));
    }
}
