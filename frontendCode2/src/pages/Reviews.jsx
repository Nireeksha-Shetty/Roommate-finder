import { useEffect, useState } from "react";
import { api } from "../api.js";
import { storeReview, verifyReview } from "../chain.js";

export default function Reviews({ user }) {
  const [reviews, setReviews] = useState([]);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState({});

  function load() {
    api
      .getReviews(user.id)
      .then(setReviews)
      .catch((e) => setError(e.message));
  }

  useEffect(load, [user.id]);

  /** Publishes keccak256(text) to the contract, then saves the text. */
  async function submit() {
    setError("");
    setStatus("");

    if (!text.trim()) {
      setError("Write something first");
      return;
    }

    setBusy(true);
    try {
      const { hash, txHash } = await storeReview(text.trim(), user.walletAddress);
      await api.addReview({
        authorId: user.id,
        subjectId: user.id, // demo writes to your own page so it is visible
        text: text.trim(),
        rating: Number(rating),
        reviewHash: hash,
        txHash
      });
      setText("");
      setStatus("Review published and its hash written to the blockchain.");
      load();
    } catch (e) {
      setError(e.shortMessage || e.message);
    } finally {
      setBusy(false);
    }
  }

  /** Re-hashes the stored text and asks the contract if it matches. */
  async function check(review) {
    try {
      const intact = await verifyReview(review.text);
      setChecks({ ...checks, [review.id]: intact ? "intact" : "changed" });
    } catch (e) {
      setError(e.shortMessage || e.message);
    }
  }

  return (
    <>
      <h2>Reviews</h2>
      <p className="lede">
        The text is stored in the database, but its hash goes on the blockchain.
        If anyone edits the stored text later, the hashes stop matching.
      </p>

      {error && <div className="notice error">{error}</div>}
      {status && <div className="notice ok">{status}</div>}

      <div className="panel">
        <div className="field">
          <label htmlFor="review">Your review</label>
          <span className="hint">
            What was this person like to live with?
          </span>
          <textarea
            id="review"
            rows="3"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError("");
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="rating">Rating</label>
          <select
            id="rating"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} out of 5
              </option>
            ))}
          </select>
        </div>

        <button className="btn" onClick={submit} disabled={busy}>
          {busy ? "Confirm in MetaMask…" : "Publish review"}
        </button>
      </div>

      {reviews.length === 0 && <p className="empty">No reviews yet.</p>}

      {reviews.map((r) => (
        <div className="review" key={r.id}>
          <p className="stars">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
          <p>{r.text}</p>
          <p className="chain-note">Hash: {r.reviewHash}</p>

          {checks[r.id] === "intact" && (
            <p className="chain-note">Verified against the blockchain, text is unchanged.</p>
          )}
          {checks[r.id] === "changed" && (
            <p className="chain-note" style={{ color: "var(--danger)" }}>
              No matching hash on the blockchain. This text was changed.
            </p>
          )}

          <button className="btn-link" onClick={() => check(r)}>
            Verify on chain
          </button>
        </div>
      ))}
    </>
  );
}
