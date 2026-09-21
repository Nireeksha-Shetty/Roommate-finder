package com.college.roommate.repo;

import com.college.roommate.model.ContactRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ContactRequestRepo extends JpaRepository<ContactRequest, Long> {

    Optional<ContactRequest> findByRequesterIdAndOwnerId(Long requesterId, Long ownerId);

    /** Requests waiting for this user to decide, newest first. */
    List<ContactRequest> findByOwnerIdAndStatusOrderByCreatedAtDesc(Long ownerId, String status);

    /** Everything this user has asked for, so the UI can show the status. */
    List<ContactRequest> findByRequesterIdOrderByCreatedAtDesc(Long requesterId);
}
