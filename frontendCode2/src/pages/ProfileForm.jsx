import { useEffect, useState } from "react";
import { api } from "../api.js";

// The six questions the matching service scores, with readable scale ends.
const QUESTIONS = [
  { key: "sleepTime", label: "When do you usually sleep?", low: "Early night", high: "Very late" },
  { key: "cleanliness", label: "How tidy do you keep your room?", low: "Relaxed", high: "Spotless" },
  { key: "smoking", label: "Do you smoke?", low: "Never", high: "Regularly" },
  { key: "foodPref", label: "What do you eat?", low: "Vegetarian", high: "Non-vegetarian" },
  { key: "noiseTolerance", label: "How much noise can you study through?", low: "Need silence", high: "Noise is fine" },
  { key: "studyHabit", label: "Where do you study?", low: "Library or outside", high: "In the room" }
];

const BLANK = {
  city: "",
  budget: "",
  sleepTime: 3,
  cleanliness: 3,
  smoking: 1,
  foodPref: 3,
  noiseTolerance: 3,
  studyHabit: 3
};

export default function ProfileForm({ user }) {
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getProfile(user.id)
      .then((p) => setForm({ ...BLANK, ...p }))
      .catch(() => {});
  }, [user.id]);

  function setScale(key, value) {
    setForm({ ...form, [key]: value });
    setSaved(false);
    setError("");
  }

  async function save() {
    if (!form.city.trim()) {
      setError("Enter the city you are looking in");
      return;
    }
    if (!form.budget || Number(form.budget) <= 0) {
      setError("Enter your monthly budget");
      return;
    }

    setBusy(true);
    try {
      await api.saveProfile({
        ...form,
        userId: user.id,
        budget: Number(form.budget)
      });
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>My preferences</h2>
      <p className="lede">
        These answers are the only thing used to rank your matches. Change them
        any time and the list updates.
      </p>

      {error && <div className="notice error">{error}</div>}
      {saved && <div className="notice ok">Preferences saved.</div>}

      <div className="row">
        <div className="field">
          <label htmlFor="city">City</label>
          <input
            id="city"
            type="text"
            value={form.city}
            onChange={(e) => {
              setForm({ ...form, city: e.target.value });
              setSaved(false);
              setError("");
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="budget">Monthly budget (₹)</label>
          <input
            id="budget"
            type="number"
            value={form.budget}
            onChange={(e) => {
              setForm({ ...form, budget: e.target.value });
              setSaved(false);
              setError("");
            }}
          />
        </div>
      </div>

      {QUESTIONS.map((q) => (
        <div className="field" key={q.key}>
          <label>{q.label}</label>
          <div className="scale">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n}>
                <input
                  type="radio"
                  name={q.key}
                  value={n}
                  checked={Number(form[q.key]) === n}
                  onChange={() => setScale(q.key, n)}
                />
                {n}
              </label>
            ))}
          </div>
          <div className="scale-ends">
            <span>{q.low}</span>
            <span>{q.high}</span>
          </div>
        </div>
      ))}

      <button className="btn" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save preferences"}
      </button>
    </>
  );
}
