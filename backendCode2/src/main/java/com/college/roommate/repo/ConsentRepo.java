package com.college.roommate.repo;

import com.college.roommate.model.Consent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ConsentRepo extends JpaRepository<Consent, Long> {
    Optional<Consent> findByGranterIdAndReceiverId(Long granterId, Long receiverId);
}
