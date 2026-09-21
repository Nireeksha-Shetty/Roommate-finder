import { useState } from "react";
import { api } from "../api.js";

export default function Login({ onSignedIn, onWantSignup }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setError("");
  };

  async function submit() {
    if (!form.email.trim() || !form.password) {
      setError("Enter your email and password");
      return;
    }
    setBusy(true);
    try {
      const user = await api.login(form.email, form.password);
      onSignedIn(user);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h2>Log in</h2>
        <p className="sub">
          Eight students are seeded. Try arun@college.edu with password test1234.
        </p>

        {error && <div className="notice error">{error}</div>}

        <div className="field">
          <label htmlFor="l-email">Email</label>
          <input id="l-email" type="email" value={form.email} onChange={set("email")} />
        </div>
        <div className="field">
          <label htmlFor="l-pass">Password</label>
          <input id="l-pass" type="password" value={form.password}
                 onChange={set("password")}
                 onKeyDown={(e) => e.key === "Enter" && submit()} />
        </div>

        <button className="btn" onClick={submit} disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </div>

      <p className="auth-alt">
        New here?{" "}
        <button className="btn-link" onClick={onWantSignup}>Create an account</button>
      </p>
    </div>
  );
}
