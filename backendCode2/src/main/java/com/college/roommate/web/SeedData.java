package com.college.roommate.web;

import com.college.roommate.model.Profile;
import com.college.roommate.model.User;
import com.college.roommate.repo.ProfileRepo;
import com.college.roommate.repo.UserRepo;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Eight students on first startup so the search page has something to show.
 * Log in as arun@college.edu / test1234.
 *
 * The spread is deliberate: every sharing level has at least one match for
 * Arun, and there are women who accept anyone and women who do not, so the
 * mutual gender rule can actually be demonstrated.
 *
 * Each student is given one of the local Hardhat test accounts, in order, so
 * the consent flow works on a fresh database without every student having to
 * sign in and connect a wallet first. These addresses are derived from
 * Hardhat's published test phrase, so they are the same on every machine and
 * hold nothing but worthless test ETH. Real signups start with no wallet and
 * connect their own - see AuthController.saveWallet.
 */
@Configuration
public class SeedData {

    /**
     * Hardhat accounts #0-#7, in the order `npx hardhat node` prints them.
     * The demo signer in the frontend derives its keys from the same phrase,
     * so a seeded student can sign for the address recorded here.
     */
    private static final String[] HARDHAT_ACCOUNTS = {
            "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
            "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
            "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
            "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
            "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955"
    };

    @Bean
    ApplicationRunner seed(UserRepo users, ProfileRepo profiles) {
        return args -> {
            if (users.count() > 0) return;

            //     name              email                 phone         wallet                gender   wants   area          city       budget sharing               verified  answers
            add(users, profiles, "Arun Kumar",      "arun@college.edu",    "9840000001", HARDHAT_ACCOUNTS[0], "male",   "same", "Adyar",        "Chennai", 9000,  "Double sharing",   true,  2,5,1,2,2,4);
            add(users, profiles, "Karthik Raman",   "karthik@college.edu", "9840000002", HARDHAT_ACCOUNTS[1], "male",   "same", "Adyar",        "Chennai", 9500,  "Double sharing",   true,  2,5,1,2,2,4);
            add(users, profiles, "Deepak Iyer",     "deepak@college.edu",  "9840000003", HARDHAT_ACCOUNTS[2], "male",   "same", "Velachery",    "Chennai", 11500, "Single occupancy", true,  3,4,1,2,3,3);
            add(users, profiles, "Mohan Subramani", "mohan@college.edu",   "9840000004", HARDHAT_ACCOUNTS[3], "male",   "any",  "T Nagar",      "Chennai", 8500,  "Triple sharing",   false, 4,3,1,3,4,2);
            add(users, profiles, "Vikram Nair",     "vikram@college.edu",  "9840000005", HARDHAT_ACCOUNTS[4], "male",   "same", "Guindy",       "Chennai", 9200,  "Double sharing",   false, 5,1,5,4,5,1);
            add(users, profiles, "Priya Sharma",    "priya@college.edu",   "9840000006", HARDHAT_ACCOUNTS[5], "female", "same", "Adyar",        "Chennai", 9000,  "Double sharing",   true,  2,5,1,2,2,4);
            add(users, profiles, "Anjali Rao",      "anjali@college.edu",  "9840000007", HARDHAT_ACCOUNTS[6], "female", "any",  "Velachery",    "Chennai", 9100,  "Double sharing",   true,  2,5,1,2,3,4);
            add(users, profiles, "Sanjay Gupta",    "sanjay@college.edu",  "9840000008", HARDHAT_ACCOUNTS[7], "male",   "same", "Andheri",      "Mumbai",  9000,  "Double sharing",   false, 2,5,1,2,2,4);

            System.out.println("Seeded 8 students, each on a Hardhat test account. "
                    + "Log in as arun@college.edu / test1234");
        };
    }

    private void add(UserRepo users, ProfileRepo profiles,
                     String name, String email, String phone, String wallet,
                     String gender, String wants, String area, String city,
                     int budget, String sharing, boolean verified,
                     int sleep, int clean, int smoke, int food, int noise, int study) {

        User u = new User();
        u.name = name;
        u.email = email;
        u.password = "test1234";
        u.phone = phone;
        u.walletAddress = wallet;
        u.verified = verified;
        u = users.save(u);

        Profile p = new Profile();
        p.userId = u.id;
        p.city = city;
        p.area = area;
        p.budget = budget;
        p.gender = gender;
        p.genderPreference = wants;
        p.sharing = sharing;
        p.sleepTime = sleep;
        p.cleanliness = clean;
        p.smoking = smoke;
        p.foodPref = food;
        p.noiseTolerance = noise;
        p.studyHabit = study;
        profiles.save(p);
    }
}
