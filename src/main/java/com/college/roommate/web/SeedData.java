package com.college.roommate.web;

import com.college.roommate.model.Profile;
import com.college.roommate.model.User;
import com.college.roommate.repo.ProfileRepo;
import com.college.roommate.repo.UserRepo;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Puts six students in the database on startup so the matches page has
 * something to show. Log in as arun@college.edu / test123.
 */
@Configuration
public class SeedData {

    @Bean
    ApplicationRunner seed(UserRepo users, ProfileRepo profiles) {
        return args -> {
            if (users.count() > 0) return;

            addStudent(users, profiles, "Arun", "arun@college.edu", "9840000001",
                    "Chennai", 9000, 2, 5, 1, 2, 2, 4);
            addStudent(users, profiles, "Karthik", "karthik@college.edu", "9840000002",
                    "Chennai", 9500, 2, 5, 1, 2, 2, 4);
            addStudent(users, profiles, "Deepak", "deepak@college.edu", "9840000003",
                    "Chennai", 10000, 3, 4, 1, 2, 3, 3);
            addStudent(users, profiles, "Mohan", "mohan@college.edu", "9840000004",
                    "Chennai", 8500, 4, 3, 1, 3, 4, 2);
            addStudent(users, profiles, "Vikram", "vikram@college.edu", "9840000005",
                    "Chennai", 9200, 5, 1, 5, 4, 5, 1);
            addStudent(users, profiles, "Sanjay", "sanjay@college.edu", "9840000006",
                    "Mumbai", 9000, 2, 5, 1, 2, 2, 4);

            System.out.println("Seeded 6 students. Log in as arun@college.edu / test123");
        };
    }

    private void addStudent(UserRepo users, ProfileRepo profiles,
                            String name, String email, String phone,
                            String city, int budget, int sleep, int clean,
                            int smoke, int food, int noise, int study) {

        User u = new User();
        u.name = name;
        u.email = email;
        u.password = "test123";
        u.phone = phone;
        u = users.save(u);

        Profile p = new Profile();
        p.userId = u.id;
        p.city = city;
        p.budget = budget;
        p.sleepTime = sleep;
        p.cleanliness = clean;
        p.smoking = smoke;
        p.foodPref = food;
        p.noiseTolerance = noise;
        p.studyHabit = study;
        profiles.save(p);
    }
}
