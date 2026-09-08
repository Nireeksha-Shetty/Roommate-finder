-- Reference only. You do not need to run this file.
-- Hibernate creates these tables from the entity classes on first startup
-- (spring.jpa.hibernate.ddl-auto=update).
--
-- It is here because project reports usually need the schema written out.

CREATE DATABASE IF NOT EXISTS roommates;
USE roommates;

CREATE TABLE users (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    name            VARCHAR(255),
    email           VARCHAR(255) UNIQUE,
    password        VARCHAR(255),
    phone           VARCHAR(255),
    wallet_address  VARCHAR(255),          -- MetaMask address, set on connect
    PRIMARY KEY (id)
);

CREATE TABLE profiles (
    id               BIGINT NOT NULL AUTO_INCREMENT,
    user_id          BIGINT UNIQUE,
    city             VARCHAR(255),
    budget           INT,                  -- rupees per month
    sleep_time       INT,                  -- all six below are 1-5
    cleanliness      INT,
    smoking          INT,
    food_pref        INT,
    noise_tolerance  INT,
    study_habit      INT,
    PRIMARY KEY (id)
);

-- An audit trail only. The blockchain holds the actual permission, so
-- deleting rows here does not grant or remove access to contact details.
CREATE TABLE consents (
    id           BIGINT NOT NULL AUTO_INCREMENT,
    granter_id   BIGINT,
    receiver_id  BIGINT,
    tx_hash      VARCHAR(255),
    created_at   DATETIME(6),
    PRIMARY KEY (id)
);

-- review_text lives here; keccak256(review_text) is published to the contract.
CREATE TABLE reviews (
    id           BIGINT NOT NULL AUTO_INCREMENT,
    author_id    BIGINT,
    subject_id   BIGINT,
    review_text  VARCHAR(1000),
    rating       INT,
    review_hash  VARCHAR(255),
    tx_hash      VARCHAR(255),
    created_at   DATETIME(6),
    PRIMARY KEY (id)
);
