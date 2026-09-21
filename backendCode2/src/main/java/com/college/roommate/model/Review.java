package com.college.roommate.model;

import jakarta.persistence.*;
import java.time.Instant;

/** Review text lives here; its hash lives on the blockchain. */
@Entity
@Table(name = "reviews")
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public Long authorId;
    public Long subjectId;

    @Column(name = "review_text", length = 1000)
    public String text;

    public Integer rating;   // 1-5 stars

    /** keccak256 of the text, also written to the contract. */
    public String reviewHash;
    public String txHash;

    public Instant createdAt = Instant.now();
}
