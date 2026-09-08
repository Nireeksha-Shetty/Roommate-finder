"""
Trains a k-nearest-neighbours classifier that predicts whether two students
are compatible as roommates.

The trick is what counts as one sample. A single student cannot be
"compatible" on their own, so each sample is a PAIR, and the features are the
absolute differences between their six answers:

    [|sleep_a - sleep_b|, |clean_a - clean_b|, ... ]  ->  compatible? 0 or 1

Run this once before starting the service:

    python train_model.py

It writes knn_model.joblib, which app.py loads on startup.

Honest note for the report: there is no real dataset of student pairs who
lived together, so the labels below are generated from a rule plus random
noise. The classifier therefore learns to recover that rule. High accuracy
shows the pipeline works, not that it predicts real-world compatibility.
Swap in survey data and nothing else has to change.
"""

import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
import joblib

FEATURES = ["sleepTime", "cleanliness", "smoking", "foodPref", "noiseTolerance", "studyHabit"]

# How much each clash matters. Smoking and cleanliness cause the most fights
# between roommates, so a gap there counts more than a gap in food preference.
WEIGHTS = np.array([1.2, 1.5, 1.8, 0.8, 1.3, 1.0])

RANDOM_SEED = 42
N_PAIRS = 4000
NOISE_RATE = 0.10          # fraction of labels deliberately flipped
NEIGHBOURS = 15


def generate_pairs(n_pairs, rng):
    """Build n_pairs random student pairs and label each one."""
    a = rng.integers(1, 6, size=(n_pairs, len(FEATURES)))
    b = rng.integers(1, 6, size=(n_pairs, len(FEATURES)))

    # Features: how far apart the two students are on each question.
    differences = np.abs(a - b)

    # Label rule: small weighted total gap means they should get along.
    weighted_gap = differences @ WEIGHTS
    threshold = np.median(weighted_gap)
    labels = (weighted_gap < threshold).astype(int)

    # Real people are not this tidy, so flip some labels. But only flip pairs
    # sitting near the threshold: whether two near-identical students get on
    # is not in doubt, whereas borderline pairs genuinely are. Flipping
    # uniformly instead would teach the model that identical answers are
    # unreliable, and a perfect match would score lower than a good one.
    low, high = np.quantile(weighted_gap, [0.25, 0.75])
    ambiguous = np.where((weighted_gap >= low) & (weighted_gap <= high))[0]

    flip_count = int(NOISE_RATE * n_pairs)
    flip_index = rng.choice(ambiguous, size=min(flip_count, len(ambiguous)), replace=False)
    labels[flip_index] = 1 - labels[flip_index]

    return differences, labels


def main():
    rng = np.random.default_rng(RANDOM_SEED)
    X, y = generate_pairs(N_PAIRS, rng)

    print(f"Dataset: {X.shape[0]} pairs, {X.shape[1]} features")
    print(f"Compatible: {y.sum()}  |  Not compatible: {len(y) - y.sum()}")
    print(f"Label noise: {int(NOISE_RATE * 100)}% of labels flipped, borderline pairs only")
    print()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=RANDOM_SEED, stratify=y
    )

    # Scaling matters for KNN because it measures distance between features.
    model = make_pipeline(
        StandardScaler(),
        KNeighborsClassifier(n_neighbors=NEIGHBOURS, weights="distance")
    )
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    print(f"Training pairs: {len(X_train)}   Test pairs: {len(X_test)}")
    print(f"k = {NEIGHBOURS}")
    print()
    print(f"Test accuracy: {accuracy_score(y_test, predictions):.3f}")
    print()
    print("Confusion matrix")
    print("                 predicted no   predicted yes")
    matrix = confusion_matrix(y_test, predictions)
    print(f"  actual no       {matrix[0][0]:>8}       {matrix[0][1]:>8}")
    print(f"  actual yes      {matrix[1][0]:>8}       {matrix[1][1]:>8}")
    print()
    print(classification_report(y_test, predictions,
                                target_names=["not compatible", "compatible"]))

    scores = cross_val_score(model, X, y, cv=5)
    print(f"5-fold cross-validation: {scores.mean():.3f} (+/- {scores.std():.3f})")
    print()

    # A quick sanity check on the two extremes.
    identical = np.zeros((1, len(FEATURES)))
    opposite = np.full((1, len(FEATURES)), 4)
    print(f"Identical answers  -> {model.predict_proba(identical)[0][1]:.2f} compatible")
    print(f"Opposite answers   -> {model.predict_proba(opposite)[0][1]:.2f} compatible")

    joblib.dump(model, "knn_model.joblib")
    print()
    print("Saved knn_model.joblib")


if __name__ == "__main__":
    main()
