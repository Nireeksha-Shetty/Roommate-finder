package com.college.roommate.model;

import jakarta.persistence.*;

/** The lifestyle answers the matching service scores. All on a 1-5 scale. */
@Entity
@Table(name = "profiles")
public class Profile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(unique = true)
    public Long userId;

    public String city;
    public Integer budget;          // rupees per month

    public Integer sleepTime;       // 1 = early riser, 5 = night owl
    public Integer cleanliness;     // 1 = relaxed, 5 = very tidy
    public Integer smoking;         // 1 = never, 5 = regularly
    public Integer foodPref;        // 1 = vegetarian, 5 = non-vegetarian
    public Integer noiseTolerance;  // 1 = needs silence, 5 = noise is fine
    public Integer studyHabit;      // 1 = studies outside, 5 = studies in room
}
