package com.college.roommate.repo;

import com.college.roommate.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewRepo extends JpaRepository<Review, Long> {
    List<Review> findBySubjectIdOrderByCreatedAtDesc(Long subjectId);
}
