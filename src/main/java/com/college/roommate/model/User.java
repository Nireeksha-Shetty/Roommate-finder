package com.college.roommate.model;

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

    public String password;   // plain text - demo only, see README
    public String phone;

    /** MetaMask address. Consent on the blockchain is keyed on this. */
    public String walletAddress;
}
