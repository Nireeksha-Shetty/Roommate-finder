import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Matches({ user, onOpen }) {
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMatches(user.id)
      .then((data) => setMatches(data.matches || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user.id]);

  if (loading) {
    return <p className="empty">Finding your matches…</p>;
  }

  return (
    <>
      <h2>Your matches</h2>
      <p className="lede">
        Ranked by how closely your answers line up. Only students in your city
        and within ₹3,000 of your budget appear here.
      </p>

      {error && <div className="notice error">{error}</div>}

      {!error && matches.length === 0 && (
        <p className="empty">
          Nobody matches yet. Check your city and budget under My preferences.
        </p>
      )}

      {matches.map((m) => (
        <button className="match" key={m.userId} onClick={() => onOpen(m)}>
          <div className="score">
            {Math.round(m.score)}
            <span>match</span>
          </div>
          <div className="match-body">
            <h3>{m.name}</h3>
            <p className="match-meta">
              {m.city} · ₹{m.budget.toLocaleString("en-IN")} a month
            </p>
            <p className="reasons">
              {m.reasons.length > 0
                ? `You agree on ${m.reasons.join(", ")}`
                : "Very different answers to yours"}
            </p>
            {m.modelConfidence !== undefined && (
              <p className="verdict">
                Classifier:{" "}
                {m.modelSaysCompatible ? "compatible" : "not compatible"} (
                {Math.round(m.modelConfidence)}% confidence)
              </p>
            )}
          </div>
        </button>
      ))}
    </>
  );
}
