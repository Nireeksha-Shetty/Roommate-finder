package com.college.roommate.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public String name;

    @Column(unique = true)
    public String email;

    /** Plain text, demo only. See "Known shortcuts" in the README. */
    @JsonIgnore
    public String password;

    /** Never returned by the API unless the chain says consent was granted. */
    @JsonIgnore
    public String phone;

    /** MetaMask address. Consent on the blockchain is keyed on this. */
    public String walletAddress;

    /**
     * Where the uploaded photo sits on disk. Deliberately NOT a public URL:
     * the file lives outside anything Spring serves statically, and the bytes
     * only go out through the consent-checked endpoint.
     */
    @JsonIgnore
    public String photoPath;

    public Boolean verified = false;

    /** Safe to expose - says a photo exists, not what it looks like. */
    @Transient
    public boolean hasPhoto() {
        return photoPath != null && !photoPath.isBlank();
    }
}
