package com.college.roommate.model;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Someone asking to see another student's contact details.
 *
 * This stays in MySQL on purpose. A request is not a permission - it carries
 * no authority at all, so there is nothing to gain by putting it on a
 * blockchain, and doing so would publish who is interested in whom. Only the
 * approval is written to the contract, by the owner's own key.
 *
 * Approving a request does NOT by itself release any contact details. The
 * backend still reads hasConsent from the chain before it answers. If the
 * chain says no, this row changes nothing.
 */
@Entity
@Table(name = "contact_requests")
public class ContactRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public Long requesterId;  // user asking to see the details
    public Long ownerId;      // user who owns them and decides

    /** PENDING, APPROVED or REJECTED. */
    public String status = PENDING;

    /** Set when approved, if the signing tool gave us a hash. */
    public String txHash;

    public Instant createdAt = Instant.now();
    public Instant decidedAt;

    public static final String PENDING = "PENDING";
    public static final String APPROVED = "APPROVED";
    public static final String REJECTED = "REJECTED";
}
