package com.college.roommate.model;

import jakarta.persistence.*;

/**
 * Everything the matching service scores, plus the hard filters.
 *
 * Nobody here has a flat. These are all preferences of a student who is
 * looking for someone to share with, so budget is what they can spend and
 * sharing is how many people they want in one room.
 */
@Entity
@Table(name = "profiles")
public class Profile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(unique = true)
    public Long userId;

    public String city;
    public String area;
    public Integer budget;             // rupees per month, their share

    /** "male", "female" or "other". */
    public String gender;

    /** "same" or "any". Applied mutually - see the matching service. */
    public String genderPreference = "same";

    /** "Single occupancy", "Double sharing" or "Triple sharing". */
    public String sharing = "Double sharing";

    // The six lifestyle answers, all on a 1-5 scale.
    public Integer sleepTime;          // 1 = early riser, 5 = night owl
    public Integer cleanliness;        // 1 = relaxed, 5 = very tidy
    public Integer smoking;            // 1 = never, 5 = regularly
    public Integer foodPref;           // 1 = vegetarian, 5 = non-vegetarian
    public Integer noiseTolerance;     // 1 = needs silence, 5 = noise is fine
    public Integer studyHabit;         // 1 = studies outside, 5 = studies in room

    /**
     * A detached copy, used when a request applies filter values that must not
     * reach the database. Mutating the entity returned by the repository would
     * be persisted the moment anything wraps the call in a transaction.
     */
    public Profile copy() {
        Profile p = new Profile();
        p.id = id;
        p.userId = userId;
        p.city = city;
        p.area = area;
        p.budget = budget;
        p.gender = gender;
        p.genderPreference = genderPreference;
        p.sharing = sharing;
        p.sleepTime = sleepTime;
        p.cleanliness = cleanliness;
        p.smoking = smoking;
        p.foodPref = foodPref;
        p.noiseTolerance = noiseTolerance;
        p.studyHabit = studyHabit;
        return p;
    }
}
