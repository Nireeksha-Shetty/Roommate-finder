import { useEffect, useRef, useState } from "react";
import {
  api, SHARING, SHARING_FLOOR, QUESTIONS, rupees, shortShare
} from "../api.js";

export default function ProfileForm({ user, profile, onSaved, onUserChanged, onToast }) {
  const [form, setForm] = useState(profile || {});
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { if (profile) setForm(profile); }, [profile]);

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setError("");
  };

  async function save() {
    if (!form.city || !String(form.city).trim()) { setError("Enter your city"); return; }
    if (!form.area || !String(form.area).trim()) { setError("Enter an area"); return; }
    if (!form.budget || Number(form.budget) <= 0) { setError("Enter your budget"); return; }

    setBusy(true);
    try {
      const saved = await api.saveProfile({
        ...form,
        userId: user.id,
        budget: Number(form.budget)
      });
      onSaved(saved);
      onToast && onToast("Profile saved");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function pickPhoto(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPhotoError("");

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setPhotoError("That file is not a JPG or PNG. Choose a different one.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(
        `That photo is ${(file.size / 1048576).toFixed(1)} MB. The limit is 5 MB.`
      );
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);

    try {
      await api.uploadPhoto(user.id, file);
      const fresh = await api.me(user.id);
      onUserChanged(fresh);
      onToast && onToast("Photo added");
    } catch (uploadError) {
      setPhotoError(uploadError.message);
      setPreview(null);
    }
    e.target.value = "";
  }

  async function removePhoto() {
    try {
      await api.deletePhoto(user.id);
      const fresh = await api.me(user.id);
      onUserChanged(fresh);
      setPreview(null);
      onToast && onToast("Photo removed");
    } catch (e) {
      setPhotoError(e.message);
    }
  }

  const hasPhoto = preview || user.hasPhoto;

  const budgetWarning =
    form.sharing &&
    Number(form.budget) > 0 &&
    Number(form.budget) < SHARING_FLOOR[form.sharing];

  return (
    <>
      <div className="results-head">
        <div>
          <h2>My profile</h2>
          <span className="sub">
            These answers decide who you are shown, and who sees you
          </span>
        </div>
      </div>

      <div className="panel">
        <h3>Your photo</h3>
        <p className="note">
          Only students you have allowed can see this. It never appears in search
          results.
        </p>
        {photoError && <div className="notice error">{photoError}</div>}
        <div className="uploader">
          <div className="upload-slot">
            {hasPhoto ? (
              <img src={preview || api.photoUrl(user.id, user.id)}
                   alt="Your profile photo" />
            ) : (
              "Nothing uploaded"
            )}
          </div>
          <div className="upload-copy">
            <p>A clear photo of your face helps people decide. JPG or PNG, up to 5 MB.</p>
            <label className="file-btn" htmlFor="profile-photo">
              {hasPhoto ? "Replace photo" : "Choose photo"}
            </label>
            <input id="profile-photo" ref={fileRef} type="file"
                   accept="image/png,image/jpeg" onChange={pickPhoto} />
            {hasPhoto && (
              <button className="btn-link" style={{ marginLeft: 10 }} onClick={removePhoto}>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="notice error">{error}</div>}

      <div className="panel">
        <h3>About you</h3>
        <div className="grid2" style={{ marginTop: 13 }}>
          <div className="field">
            <label htmlFor="p-city">City</label>
            <select id="p-city" value={form.city || "Chennai"} onChange={set("city")}>
              <option>Chennai</option>
              <option>Mumbai</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="p-area">Area</label>
            <input id="p-area" type="text" value={form.area || ""} onChange={set("area")} />
          </div>
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="p-budget">Monthly budget (₹)</label>
            <input id="p-budget" type="number" value={form.budget || ""}
                   onChange={set("budget")} />
          </div>
          <div className="field">
            <label htmlFor="p-gender">Your gender</label>
            <select id="p-gender" value={form.gender || ""} onChange={set("gender")}>
              <option value="male">Man</option>
              <option value="female">Woman</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="p-share">People per room</label>
            <span className="hint">How many of you will share one room.</span>
            <select id="p-share" value={form.sharing || "Double sharing"}
                    onChange={set("sharing")}>
              {SHARING.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="p-match">Match me with</label>
            <span className="hint">Most hostels and PGs require same-gender sharing.</span>
            <select id="p-match" value={form.genderPreference || "same"}
                    onChange={set("genderPreference")}>
              <option value="same">My gender only</option>
              <option value="any">Anyone</option>
            </select>
          </div>
        </div>
        {budgetWarning && (
          <div className="warn">
            {rupees(form.budget)} a month is usually not enough for{" "}
            {shortShare(form.sharing).toLowerCase()} in {form.city || "Chennai"}.
            Students normally budget from {rupees(SHARING_FLOOR[form.sharing])}.
          </div>
        )}
      </div>

      <div className="panel">
        <h3>How you live</h3>
        <p className="note">Six questions, scored against everyone else.</p>
        {QUESTIONS.map((q) => (
          <div className="field" key={q.key}>
            <label>{q.label}</label>
            <div className="scale">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n}>
                  <input type="radio" name={q.key}
                         checked={Number(form[q.key]) === n}
                         onChange={() => { setForm({ ...form, [q.key]: n }); setError(""); }} />
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
          {busy ? "Saving…" : "Save profile"}
        </button>
      </div>
    </>
  );
}
