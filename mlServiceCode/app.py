"""
Roommate matching service.

The Spring Boot backend POSTs one seeker profile plus all candidate profiles.
This service filters out impossible matches, then scores the rest by how
similar their lifestyle preferences are.
"""

import os

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.metrics.pairwise import manhattan_distances
import joblib

app = FastAPI(title="Roommate matching service")

# The six lifestyle answers, each on a 1-5 scale.
FEATURES = ["sleepTime", "cleanliness", "smoking", "foodPref", "noiseTolerance", "studyHabit"]

# Some answers matter more than others when sharing a room.
WEIGHTS = np.array([1.2, 1.5, 1.8, 0.8, 1.3, 1.0])

MODEL_PATH = os.path.join(os.path.dirname(__file__), "knn_model.joblib")

# Trained by train_model.py. The service still works without it - the
# similarity score is computed directly and the prediction is just omitted.
try:
    knn_model = joblib.load(MODEL_PATH)
    print(f"Loaded KNN model from {MODEL_PATH}")
except Exception:
    knn_model = None
    print("No knn_model.joblib found. Run 'python train_model.py' to enable predictions.")

# Readable names for the "why did we match?" explanation.
LABELS = {
    "sleepTime": "sleep schedule",
    "cleanliness": "cleanliness",
    "smoking": "smoking habits",
    "foodPref": "food preference",
    "noiseTolerance": "noise tolerance",
    "studyHabit": "study habits",
}

BUDGET_TOLERANCE = 3000  # rupees per month


class Profile(BaseModel):
    userId: int
    name: str
    city: str
    budget: int
    sleepTime: int
    cleanliness: int
    smoking: int
    foodPref: int
    noiseTolerance: int
    studyHabit: int


class MatchRequest(BaseModel):
    seeker: Profile
    candidates: list[Profile]
    topN: int = 5


def to_vector(profile: Profile) -> np.ndarray:
    """Turn a profile into a weighted feature vector."""
    raw = np.array([getattr(profile, f) for f in FEATURES], dtype=float)
    return raw * WEIGHTS


def passes_filters(seeker: Profile, candidate: Profile) -> bool:
    """Hard requirements. No score can rescue a failure here."""
    if candidate.userId == seeker.userId:
        return False
    if candidate.city.strip().lower() != seeker.city.strip().lower():
        return False
    if abs(candidate.budget - seeker.budget) > BUDGET_TOLERANCE:
        return False
    return True


def shared_traits(seeker: Profile, candidate: Profile, limit: int = 3) -> list[str]:
    """The features where the two profiles agree most closely."""
    gaps = [(f, abs(getattr(seeker, f) - getattr(candidate, f))) for f in FEATURES]
    gaps.sort(key=lambda pair: pair[1])
    return [LABELS[f] for f, gap in gaps[:limit] if gap <= 1]


@app.get("/health")
def health():
    return {
        "status": "up",
        "modelLoaded": knn_model is not None,
        "algorithm": "weighted distance similarity + KNN pair classifier",
    }


@app.post("/match")
def match(request: MatchRequest):
    eligible = [c for c in request.candidates if passes_filters(request.seeker, c)]

    if not eligible:
        return {"matches": [], "message": "No one in your city matches your budget range yet."}

    seeker_vector = to_vector(request.seeker).reshape(1, -1)
    candidate_vectors = np.array([to_vector(c) for c in eligible])

    # --- Approach 1: direct similarity, always available ---------------
    # Distance between weighted preference vectors: 0 means identical answers.
    distances = manhattan_distances(seeker_vector, candidate_vectors)[0]

    # Worst possible case is every answer at the opposite end of the 1-5 scale.
    worst_distance = float(np.sum(WEIGHTS * 4))

    # --- Approach 2: trained classifier, if the model file exists ------
    # One row per candidate, each row the absolute differences between the
    # seeker's answers and that candidate's. Same shape train_model.py used.
    probabilities = None
    if knn_model is not None:
        differences = np.array([
            [abs(getattr(request.seeker, f) - getattr(c, f)) for f in FEATURES]
            for c in eligible
        ])
        probabilities = knn_model.predict_proba(differences)[:, 1]

    results = []
    for index, (candidate, distance) in enumerate(zip(eligible, distances)):
        score = (1 - float(distance) / worst_distance) * 100

        row = {
            "userId": candidate.userId,
            "name": candidate.name,
            "city": candidate.city,
            "budget": candidate.budget,
            "score": round(max(score, 0.0), 1),
            "reasons": shared_traits(request.seeker, candidate),
        }

        if probabilities is not None:
            confidence = float(probabilities[index])
            row["modelConfidence"] = round(confidence * 100, 1)
            row["modelSaysCompatible"] = bool(confidence >= 0.5)

        results.append(row)

    results.sort(key=lambda r: r["score"], reverse=True)
    return {"matches": results[: request.topN]}
