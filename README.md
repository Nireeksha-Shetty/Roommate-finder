# Roommate finder

A college project that matches students to roommates using machine learning,
and records permission to share contact details on a blockchain.

Four parts, each in its own folder:

| Folder | What it is | Runs on |
|---|---|---|
| `frontend` | React app (Vite) | 5173 |
| `backend` | Spring Boot REST API | 8080 |
| `ml-service` | Python matching service | 8000 |
| `blockchain` | Solidity contract on a local Hardhat node | 8545 |

Data lives in MySQL. You need four terminals plus a running MySQL server.

## What each concept actually does

**Machine learning.** Two approaches run side by side, and both are shown in
the interface.

*Ranking* uses content-based filtering. Candidates outside your city or more
than ₹3,000 from your budget are removed first. The remaining students are
scored by weighted Manhattan distance between their six answers and yours, out
of 100. Each match also reports the three answers you agreed on most closely,
so the number can be explained rather than just displayed.

*Prediction* uses a k-nearest-neighbours classifier (`k=15`, distance-weighted,
with feature scaling). The unit of classification is a **pair**, not a person,
because one student cannot be compatible alone. Each sample is the six absolute
differences between two students' answers, labelled compatible or not.

Why both? The distance score is deterministic and explainable, which is what
you want for ranking. The classifier is a genuinely trained model, which is
what demonstrates the ML concept. They agree on the clear cases, and the
interface shows each separately so neither is hidden behind the other.

**Be straight about the training data.** There is no real dataset of student
pairs who lived together, so `train_model.py` generates labels from a weighted
rule and flips 10% of the borderline ones. The classifier therefore learns to
recover that rule. Test accuracy of roughly 0.84 shows the pipeline works, not
that it predicts real compatibility. Replace the generated labels with survey
data and nothing else in the code has to change. Say this in your report - it
is the first thing an examiner will probe.

**Blockchain.** `RoommateRegistry.sol` does two jobs:

- *Consent.* `grantConsent(address)` records that you allow someone to see your
  phone number. Before the API returns any contact details, it calls
  `hasConsent` on the contract. Deleting rows from the `consents` table changes
  nothing, because the permission does not live in the database.
- *Review integrity.* The review text is stored in the database, but
  `keccak256(text)` is published to the contract. Re-hashing the stored text and
  checking it against the chain proves whether it was edited.

No personal data is ever written to the chain — only wallet addresses and
hashes. This matters, because anything on a blockchain is public and permanent.

## Running it

Start these in order.

### 1. Blockchain

```bash
cd blockchain
npm install
npm run node          # leave this running - it prints 20 test accounts
```

In a second terminal:

```bash
cd blockchain
npm run deploy
```

This prints the contract address. Copy it into **two** places:

- `frontend/src/chain.js` → `CONTRACT_ADDRESS`
- `backend/src/main/resources/application.properties` → `chain.contract`

On a fresh Hardhat node the address is usually
`0x5FbDB2315678afecb367f032d93F642f64180aa3`, which is already the default in
both files — so you may not need to change anything.

### 2. Matching service

```bash
cd ml-service
pip install -r requirements.txt
python train_model.py          # trains the classifier, writes knn_model.joblib
uvicorn app:app --reload --port 8000
```

`train_model.py` prints the accuracy, confusion matrix and cross-validation
scores. Those numbers go straight into your report, so keep the output.

You only need to train once. The service still runs without the model file -
it drops the prediction and keeps the similarity ranking.

Check it: <http://localhost:8000/docs>, or <http://localhost:8000/health>
which reports whether the model loaded.

### 3. MySQL

Create the database and set your password. Start MySQL, then:

```sql
CREATE DATABASE roommates;
```

Open `backend/src/main/resources/application.properties` and set
`spring.datasource.password` to your MySQL root password. If you use a user
other than `root`, change `spring.datasource.username` too.

You do not need to create any tables. Hibernate reads the entity classes and
creates `users`, `profiles`, `consents` and `reviews` on first startup.

### 4. Backend

```bash
cd backend
mvn spring-boot:run
```

If you don't have Maven installed, open the `backend` folder in IntelliJ or
VS Code and run `RoommateApplication.java` — the IDE downloads the
dependencies itself. There is no `mvnw` wrapper in this project.

Six students are seeded on startup. Sign in as `arun@college.edu` /
`test123`. To inspect the data, use MySQL Workbench or the command line:

```sql
USE roommates;
SELECT * FROM users;
SELECT * FROM consents;
```

Seeding only runs when the `users` table is empty, so your own accounts and
reviews survive a restart. To start clean, run `DROP DATABASE roommates;` and
restart the backend.

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>.

## MetaMask setup

Add the local network once:

- Network name: Hardhat
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency: ETH

Then import two of the private keys that `npm run node` printed, so you have
two accounts to switch between. You need two, because consent has a direction —
one account grants, the other receives.

## Demonstrating the consent flow

This is the sequence worth showing in a viva.

1. Sign in as Arun, connect MetaMask account #1.
2. Open a match (Karthik) and press **Check for permission**. It fails, and the
   message says the check ran against the chain.
3. Sign out. Sign in as `karthik@college.edu` / `test123`, switch MetaMask to
   account #2, connect it.
4. Open Arun from Karthik's match list and press **Share my details with Arun**.
   MetaMask opens; confirm. The Hardhat terminal logs the transaction.
5. Sign back in as Arun, switch MetaMask to account #1, open Karthik, press
   **Check for permission** again. The phone number appears.
6. To make the point: run `DELETE FROM consents;` in MySQL and repeat step 5.
   It still works, because the contract is the authority, not the database.
   Then press **Withdraw consent** as Karthik and it stops working.

## API endpoints

```
POST /api/register              create an account
POST /api/login                 sign in
POST /api/wallet/{userId}       save a connected MetaMask address
POST /api/profile               create or update lifestyle answers
GET  /api/profile/{userId}
GET  /api/matches/{userId}      ranked matches from the ML service
POST /api/consent               record a consent transaction hash
GET  /api/contact/{granterId}?viewerId=N   gated by hasConsent on chain
POST /api/reviews
GET  /api/reviews/{subjectId}
```

## Things a marker may ask about

**Why is the matching service in Python and not Java?** scikit-learn is the
standard tool and has no real Java equivalent. Spring Boot calls it over HTTP,
which is also a reasonable way to show a service boundary.

**Which algorithm is the ML?** k-nearest-neighbours, `k=15`, distance-weighted,
on standardised features, trained on pairs. Ranking is done by weighted
Manhattan distance, which is content-based filtering rather than a trained
model. Both live in `ml-service/`, and the interface labels which is which.

**Why is a pair the unit of classification?** A single student has no
compatibility label. Taking absolute differences between two students' answers
turns matching into ordinary binary classification, and the feature vector is
symmetric, so the order of the pair does not change the prediction.

**Where do the weights come from?** `WEIGHTS` in both `app.py` and
`train_model.py`. Smoking and cleanliness are weighted highest because they
cause the most conflict between roommates. They are a judgement call, not
learned - with real outcome data you would fit them instead.

**Why is the label noise only on borderline pairs?** Flipping labels uniformly
taught the model that identical answers were unreliable, so a perfect match
scored lower than a merely good one. Restricting noise to the middle band fixed
that, and is also more realistic: borderline pairs are genuinely uncertain,
obvious ones are not.

**Why store the review text off chain?** On-chain storage is expensive, public
and permanent. A hash is 32 bytes and gives the tamper-evidence you want
without publishing what a student wrote about someone.

**Why does the backend read the chain instead of trusting its own table?** So
that the database cannot be the single point of trust. That is the whole claim
of the consent feature, and step 6 above demonstrates it.

## Known shortcuts

These are deliberate, to keep the project readable. Worth listing in your
report rather than hiding.

- Passwords are stored in plain text and there is no session token. A real
  build needs BCrypt and JWT.
- The frontend keeps the signed-in user in React state, so a refresh signs you
  out.
- MySQL credentials sit in plain text in `application.properties`. In a real
  build these belong in environment variables.
- Hibernate manages the schema with `ddl-auto=update`, which is convenient for
  a project but is not how you would manage a production database.
- Anyone can review anyone; there is no check that they actually lived
  together.
- The reviews page writes reviews against your own account so they are visible
  immediately in the demo.

## Verified before handover

- `RoommateRegistry.sol` compiles under solc 0.8.24 with no errors or warnings.
- The ABI encoding hand-written in `ChainClient.java` was checked byte for byte
  against ethers' own encoder for `hasConsent(address,address)`.
- The frontend production build passes (`npm run build`).
- The matching logic was run against sample profiles: an identical profile
  scores 100, a partially similar one 84, and an opposite one 17, and the city
  and budget filters correctly exclude candidates.
- The KNN classifier trains and predicts: 0.845 test accuracy, 0.854 under
  5-fold cross-validation, and it returns 1.00 for identical answers and 0.00
  for opposite ones.

The Spring Boot code was **not** compiled, because this environment had no JDK
compiler or access to Maven Central. Run `mvn spring-boot:run` first and fix
anything that surfaces before you rely on it.
