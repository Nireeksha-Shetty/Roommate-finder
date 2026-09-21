package com.college.roommate.model;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * A local record of a consent transaction. The blockchain is the source of
 * truth - this table only stores the transaction hash for the audit trail.
 */
@Entity
@Table(name = "consents")
public class Consent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public Long granterId;   // user who shared their details
    public Long receiverId;  // user who was allowed to see them
    public String txHash;    // proof it happened on chain
    public Instant createdAt = Instant.now();
}
