import { useState } from "react";
import { api, SHARING, SHARING_FLOOR, QUESTIONS, rupees, shortShare } from "../api.js";
import { connectWallet, demoAccounts, hasMetaMask } from "../chain.js";

const STEP_LABELS = ["Account", "About you", "How you live", "Photo", "Wallet"];

const HEADINGS = [
  "Create your account",
  "Where and how you want to live",
  "How you live day to day",
  "Add a photo",
  "Connect a wallet"
];

const SUBS = [
  "Takes about two minutes. Your number stays private.",
  "This decides who you are shown, and who sees you.",
  "These six answers are what your match score is built from.",
  "Optional. You can add one later from your profile.",
  "Optional. Needed only when you share details with someone."
];

const BLANK = {
  name: "", email: "", phone: "", password: "",
  gender: "", genderPreference: "same",
  city: "Chennai", area: "", budget: "", sharing: "",
  // Left empty on purpose. A default of 3 would silently record "average"
  // for questions nobody answered, dragging everyone's scores to the middle.
  answers: [null, null, null, null, null, null],
  walletAddress: null
};

export default function Signup({ onSignedUp, onWantLogin }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    setDraft({ ...draft, [key]: e.target.value });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  function setAnswer(index, value) {
    const answers = draft.answers.slice();
    answers[index] = value;
    setDraft({ ...draft, answers });
    setErrors((prev) => {
      const next = { ...prev };
      delete next.answers;
      return next;
    });
  }

  function problems() {
    const e = {};
    if (step === 1) {
      if (!draft.name.trim()) e.name = "Enter your name";
      if (!draft.email.trim()) e.email = "Enter your email";
      else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email))
        e.email = "That does not look like an email address";
      if (!draft.phone.trim()) e.phone = "Enter your phone number";
      else if (draft.phone.replace(/\D/g, "").length < 10)
        e.phone = "Enter all 10 digits";
      if (!draft.password) e.password = "Choose a password";
      else if (draft.password.length < 8) e.password = "Use at least 8 characters";
    }
    if (step === 2) {
      if (!draft.gender) e.gender = "Pick one";
      if (!draft.area.trim()) e.area = "Enter an area";
      if (!draft.budget || Number(draft.budget) <= 0) e.budget = "Enter your budget";
      if (!draft.sharing) e.sharing = "Pick one";
    }
    if (step === 3 && draft.answers.some((a) => a === null)) {
      e.answers = "Answer all six, otherwise your matches will be guesses.";
    }
    return e;
  }

  async function next() {
    const found = problems();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    if (step < 5) {
      setStep(step + 1);
      return;
    }
    await finish();
  }

  /**
   * One request creates the account, so a half-finished wizard never leaves
   * a row behind. The photo needs the new user's id, so it goes second.
   */
  async function finish() {
    setBusy(true);
    setErrors({});
    try {
      const user = await api.register({ ...draft, budget: Number(draft.budget) });

      if (photoFile) {
        try {
          await api.uploadPhoto(user.id, photoFile);
        } catch (photoError) {
          // The account exists, so do not fail signup over a photo.
          console.warn("Photo upload failed:", photoError.message);
        }
      }

      const fresh = await api.me(user.id).catch(() => user);
      onSignedUp(fresh, draft.genderPreference, draft.sharing);
    } catch (e) {
      setErrors({ submit: e.message });
      setBusy(false);
    }
  }

  function pickPhoto(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setErrors({ photo: "That file is not a JPG or PNG. Choose a different one." });
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors({
        photo: `That photo is ${(file.size / 1048576).toFixed(1)} MB. The limit is 5 MB.`
      });
      e.target.value = "";
      return;
    }

    setErrors({});
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  }

  async function connect() {
    setErrors({});
    try {
      const address = await connectWallet();
      setDraft({ ...draft, walletAddress: address });
    } catch (e) {
      setErrors({ wallet: e.message });
    }
  }

  const budgetWarning =
    draft.sharing &&
    Number(draft.budget) > 0 &&
    Number(draft.budget) < SHARING_FLOOR[draft.sharing];

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="stepper">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} style={{ display: "contents" }}>
              <i className={n < step ? "done" : n === step ? "now" : ""}>
                {n < step ? "\u2713" : n}
              </i>
              {n < 5 && <b className={n < step ? "done" : ""} />}
            </span>
          ))}
        </div>

        <p className="step-label">
          Step {step} of 5 &middot; {STEP_LABELS[step - 1]}
        </p>
        <h2>{HEADINGS[step - 1]}</h2>
        <p className="sub">{SUBS[step - 1]}</p>

        {errors.submit && <div className="notice error">{errors.submit}</div>}

        {step === 1 && (
          <>
            <Field id="name" label="Full name" value={draft.name}
                   onChange={set("name")} error={errors.name} />
            <Field id="email" label="Email" type="email" value={draft.email}
                   onChange={set("email")} error={errors.email}
                   hint="Use your college email if you have one." />
            <Field id="phone" label="Phone number" value={draft.phone}
                   onChange={set("phone")} error={errors.phone}
                   hint="Nobody sees this until you allow them to." />
            <Field id="password" label="Password" type="password" value={draft.password}
                   onChange={set("password")} error={errors.password}
                   hint="At least 8 characters." />
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid2">
              <Select id="gender" label="Your gender" value={draft.gender}
                      onChange={set("gender")} error={errors.gender}
                      options={[["male", "Man"], ["female", "Woman"], ["other", "Other"]]} />
              <Select id="genderPreference" label="Match me with"
                      value={draft.genderPreference} onChange={set("genderPreference")}
                      hint="Most hostels and PGs require same-gender sharing."
                      options={[["same", "My gender only"], ["any", "Anyone"]]} />
            </div>
            <div className="grid2">
              <Select id="city" label="City" value={draft.city} onChange={set("city")}
                      options={[["Chennai", "Chennai"], ["Mumbai", "Mumbai"]]} />
              <Field id="area" label="Area you want to live in" value={draft.area}
                     onChange={set("area")} error={errors.area}
                     hint="For example Adyar." />
            </div>
            <div className="grid2">
              <Field id="budget" label="Monthly budget (₹)" type="number"
                     value={draft.budget} onChange={set("budget")} error={errors.budget}
                     hint="Your share of the rent." />
              <Select id="sharing" label="People per room" value={draft.sharing}
                      onChange={set("sharing")} error={errors.sharing}
                      hint="How many of you share one room."
                      options={SHARING.map((v) => [v, v])} />
            </div>
            {budgetWarning && (
              <div className="warn">
                {rupees(draft.budget)} is usually not enough for{" "}
                {shortShare(draft.sharing).toLowerCase()} in {draft.city}. Students
                normally budget from {rupees(SHARING_FLOOR[draft.sharing])}. You can
                carry on, but expect fewer matches.
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <p className={`qcount${draft.answers.every((a) => a !== null) ? " ready" : ""}`}>
              {draft.answers.filter((a) => a !== null).length} of 6 answered
            </p>
            {QUESTIONS.map((q, i) => (
              <div className="field" key={q.key}>
                <label>{q.label}</label>
                <div className="scale">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n}>
                      <input type="radio" name={q.key}
                             checked={draft.answers[i] === n}
                             onChange={() => setAnswer(i, n)} />
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
            {errors.answers && <div className="notice error">{errors.answers}</div>}
          </>
        )}

        {step === 4 && (
          <>
            <div className="skip-note">
              Your photo is only shown to students you have allowed. It never appears
              in search results, so you can add it later.
            </div>
            {errors.photo && <div className="notice error">{errors.photo}</div>}
            <div className="uploader">
              <div className="upload-slot">
                {photoPreview
                  ? <img src={photoPreview} alt="Your profile photo" />
                  : "Nothing uploaded"}
              </div>
              <div className="upload-copy">
                <p>A clear photo of your face helps people decide. JPG or PNG, up to 5 MB.</p>
                <label className="file-btn" htmlFor="signup-photo">
                  {photoFile ? "Replace photo" : "Choose photo"}
                </label>
                <input id="signup-photo" type="file" accept="image/png,image/jpeg"
                       onChange={pickPhoto} />
                {photoFile && (
                  <button className="btn-link" style={{ marginLeft: 10 }}
                          onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <div className="skip-note">
              You only need a wallet when you share your photo or number with someone.
              Everything else works without it, so skip this if you have not installed
              MetaMask yet.
            </div>
            {errors.wallet && <div className="notice error">{errors.wallet}</div>}
            {draft.walletAddress ? (
              <div className="notice ok">
                Wallet connected: {draft.walletAddress.slice(0, 6)}…
                {draft.walletAddress.slice(-4)}
              </div>
            ) : (
              <>
                <p className="note">
                  Connecting records permission on the blockchain when you share
                  details, so the platform cannot share them on your behalf.
                </p>

                {hasMetaMask() ? (
                  <button className="btn-quiet" onClick={connect}>Connect MetaMask</button>
                ) : (
                  <>
                    <p className="note">
                      No wallet extension found, so pick one of the local Hardhat
                      test accounts instead. It signs in this browser, exactly as
                      MetaMask would &mdash; your key is never sent to the server.
                    </p>
                    <div className="field">
                      <select
                        defaultValue=""
                        onChange={(e) =>
                          setDraft({ ...draft, walletAddress: e.target.value || null })
                        }
                      >
                        <option value="">Choose a test account…</option>
                        {demoAccounts().map((a) => (
                          <option key={a.address} value={a.address}>
                            {a.label} · {a.address.slice(0, 8)}…{a.address.slice(-6)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="chain-note">
                      Give each student a different account &mdash; consent has a
                      direction, so the granter and receiver cannot be the same.
                      Accounts #0 to #7 are already taken by the seeded students.
                    </p>
                  </>
                )}
              </>
            )}
          </>
        )}

        <div className="auth-foot">
          {step > 1 && (
            <button className="btn-quiet" onClick={() => setStep(step - 1)} disabled={busy}>
              Back
            </button>
          )}
          <span className="grow" />
          {(step === 4 || step === 5) && (
            <button className="btn-link" onClick={next} disabled={busy}>
              Skip for now
            </button>
          )}
          <button className="btn" onClick={next} disabled={busy}>
            {busy ? "Creating your account…" : step === 5 ? "Finish and see matches" : "Continue"}
          </button>
        </div>
      </div>

      <p className="auth-alt">
        Already have an account?{" "}
        <button className="btn-link" onClick={onWantLogin}>Log in</button>
      </p>
    </div>
  );
}

function Field({ id, label, type = "text", value, onChange, error, hint }) {
  return (
    <div className="field">
      <label htmlFor={`f-${id}`}>{label}</label>
      {hint && <span className="hint">{hint}</span>}
      <input id={`f-${id}`} type={type} value={value} onChange={onChange}
             className={error ? "bad" : ""} />
      {error && <span className="err">{error}</span>}
    </div>
  );
}

function Select({ id, label, value, onChange, error, hint, options }) {
  return (
    <div className="field">
      <label htmlFor={`f-${id}`}>{label}</label>
      {hint && <span className="hint">{hint}</span>}
      <select id={`f-${id}`} value={value} onChange={onChange}
              className={error ? "bad" : ""}>
        <option value="">Choose one</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {error && <span className="err">{error}</span>}
    </div>
  );
}
