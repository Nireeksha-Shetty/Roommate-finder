package com.college.roommate.service;

import com.college.roommate.model.Profile;
import com.college.roommate.model.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/** Sends profiles to the Python matching service and returns the ranked list. */
@Service
public class MlClient {

    private final RestTemplate http = new RestTemplate();
    private final String mlUrl;

    public MlClient(@Value("${ml.url}") String mlUrl) {
        this.mlUrl = mlUrl;
    }

    /** Shape a Profile the way the Python service expects it. */
    private Map<String, Object> asPayload(Profile p, String name) {
        Map<String, Object> m = new HashMap<>();
        m.put("userId", p.userId);
        m.put("name", name);
        m.put("city", p.city);
        m.put("budget", p.budget);
        m.put("gender", p.gender == null ? "other" : p.gender);
        m.put("genderPreference",
                p.genderPreference == null ? "same" : p.genderPreference);
        m.put("sharing", p.sharing == null ? "Double sharing" : p.sharing);
        m.put("sleepTime", p.sleepTime);
        m.put("cleanliness", p.cleanliness);
        m.put("smoking", p.smoking);
        m.put("foodPref", p.foodPref);
        m.put("noiseTolerance", p.noiseTolerance);
        m.put("studyHabit", p.studyHabit);
        return m;
    }

    /**
     * @param nameLookup turns a userId into a display name
     * @return the "matches" list from the service, or an empty list on failure
     */
    /** The whole response, so callers can also read the excluded counts. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> findMatchesRaw(Profile seeker,
                                              List<Profile> candidates,
                                              Function<Long, String> nameLookup) {

        List<Map<String, Object>> candidatePayload = new ArrayList<>();
        for (Profile c : candidates) {
            candidatePayload.add(asPayload(c, nameLookup.apply(c.userId)));
        }

        Map<String, Object> body = Map.of(
                "seeker", asPayload(seeker, nameLookup.apply(seeker.userId)),
                "candidates", candidatePayload,
                "topN", 5
        );

        try {
            Map<String, Object> response =
                    (Map<String, Object>) http.postForObject(mlUrl + "/match", body, Map.class);
            if (response == null || response.get("matches") == null) {
                return Map.of("matches", List.of(), "excluded", Map.of());
            }
            return response;
        } catch (Exception e) {
            System.err.println("Matching service unavailable: " + e.getMessage());
            return Map.of("matches", List.of(), "excluded", Map.of());
        }
    }

    /** Just the ranked list, for callers that do not need the counts. */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> findMatches(Profile seeker,
                                                 List<Profile> candidates,
                                                 Function<Long, String> nameLookup) {
        Object matches = findMatchesRaw(seeker, candidates, nameLookup).get("matches");
        return matches == null ? List.of() : (List<Map<String, Object>>) matches;
    }
}
