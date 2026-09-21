package com.college.roommate.web;

import com.college.roommate.model.User;
import com.college.roommate.repo.UserRepo;
import com.college.roommate.service.ChainClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Profile photos, released only when the blockchain says consent was granted.
 *
 * The important part is what this class does NOT do. It never puts photos in
 * a statically served folder, and it never builds a guessable URL. If the
 * file were reachable at /uploads/karthik.jpg then the consent check below
 * would be decorative - anyone could type the address, or read it out of the
 * browser's network tab. So:
 *
 *   - files are stored under photo.dir, outside anything Spring serves
 *   - the name on disk is a random UUID, never derived from the person
 *   - the bytes only leave through GET /api/photo/{id}, which asks the
 *     contract first and returns 403 otherwise
 *
 * The locked state in the interface shows initials rather than a blurred
 * photo, because a CSS blur would still send the real image to the browser.
 */
@RestController
@RequestMapping("/api/photo")
public class PhotoController {

    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final List<String> ALLOWED =
            List.of("image/jpeg", "image/png");

    private final UserRepo users;
    private final ChainClient chain;
    private final Path photoDir;

    public PhotoController(UserRepo users, ChainClient chain,
                           @Value("${photo.dir}") String photoDir) throws IOException {
        this.users = users;
        this.chain = chain;
        this.photoDir = Paths.get(photoDir).toAbsolutePath().normalize();
        Files.createDirectories(this.photoDir);
    }

    /** Uploads or replaces the signed-in student's own photo. */
    @PostMapping("/{userId}")
    public ResponseEntity<?> upload(@PathVariable Long userId,
                                    @RequestParam("file") MultipartFile file) {

        Optional<User> found = users.findById(userId);
        if (found.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file was sent"));
        }
        if (file.getSize() > MAX_BYTES) {
            return ResponseEntity.badRequest().body(Map.of("error",
                    "That photo is over the 5 MB limit. Pick a smaller one."));
        }
        if (!ALLOWED.contains(file.getContentType())) {
            return ResponseEntity.badRequest().body(Map.of("error",
                    "That file is not a JPG or PNG. Choose a different one."));
        }

        String extension = "image/png".equals(file.getContentType()) ? ".png" : ".jpg";
        String diskName = UUID.randomUUID() + extension;   // never the user's name
        Path target = photoDir.resolve(diskName);

        try (var in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of("error",
                    "The photo could not be saved. Try again."));
        }

        User user = found.get();
        String previous = user.photoPath;
        user.photoPath = diskName;
        users.save(user);

        // Tidy up the replaced file rather than leaving orphans on disk.
        if (previous != null && !previous.isBlank()) {
            try {
                Files.deleteIfExists(photoDir.resolve(previous));
            } catch (IOException ignored) {
                // Not worth failing the upload over.
            }
        }

        return ResponseEntity.ok(Map.of("hasPhoto", true));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<?> remove(@PathVariable Long userId) {
        Optional<User> found = users.findById(userId);
        if (found.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }
        User user = found.get();
        if (user.photoPath != null) {
            try {
                Files.deleteIfExists(photoDir.resolve(user.photoPath));
            } catch (IOException ignored) {
            }
        }
        user.photoPath = null;
        users.save(user);
        return ResponseEntity.ok(Map.of("hasPhoto", false));
    }

    /**
     * Streams someone else's photo, but only if the contract says they
     * granted the viewer permission. Viewing your own always works.
     */
    @GetMapping("/{ownerId}")
    public ResponseEntity<?> get(@PathVariable Long ownerId,
                                 @RequestParam Long viewerId) {

        Optional<User> owner = users.findById(ownerId);
        Optional<User> viewer = users.findById(viewerId);

        if (owner.isEmpty() || viewer.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }
        if (!owner.get().hasPhoto()) {
            return ResponseEntity.status(404).body(Map.of("error", "No photo uploaded"));
        }

        boolean ownPhoto = ownerId.equals(viewerId);

        if (!ownPhoto) {
            if (owner.get().walletAddress == null || viewer.get().walletAddress == null) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", "Both students need a connected wallet first"));
            }
            boolean allowed = chain.hasConsent(
                    owner.get().walletAddress, viewer.get().walletAddress);
            if (!allowed) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", owner.get().name + " has not shared their photo with you",
                        "checkedOnChain", true));
            }
        }

        Path file = photoDir.resolve(owner.get().photoPath).normalize();

        // Refuse anything that escaped the photo directory.
        if (!file.startsWith(photoDir) || !Files.exists(file)) {
            return ResponseEntity.status(404).body(Map.of("error", "Photo file is missing"));
        }

        Resource body = new FileSystemResource(file);
        MediaType type = owner.get().photoPath.endsWith(".png")
                ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG;

        return ResponseEntity.ok()
                .contentType(type)
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(body);
    }
}
