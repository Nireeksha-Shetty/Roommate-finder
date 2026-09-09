import { useState } from "react";
import { api } from "../api.js";

export default function Login({ onSignedIn }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setError("");
  };

  async function submit() {
    if (!form.email.trim() || !form.password.trim()) {
      setError("Enter your email and password");
      return;
    }
    if (mode === "register" && !form.name.trim()) {
      setError("Enter your name");
      return;
    }

    setBusy(true);
    try {
      const user =
        mode === "login"
          ? await api.login(form.email, form.password)
          : await api.register(form);
      onSignedIn(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>{mode === "login" ? "Sign in" : "Create an account"}</h2>
      <p className="lede">
        {mode === "login"
          ? "Six students are already seeded. Try arun@college.edu with password test123."
          : "Your phone number stays hidden until you choose to share it."}
      </p>

      {error && <div className="notice error">{error}</div>}

      {mode === "register" && (
        <>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" type="text" value={form.name} onChange={set("name")} />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone number</label>
            <input id="phone" type="text" value={form.phone} onChange={set("phone")} />
          </div>
        </>
      )}

      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={form.email} onChange={set("email")} />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={form.password}
          onChange={set("password")}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </div>

      <button className="btn" onClick={submit} disabled={busy}>
        {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>

      <p style={{ marginTop: 20 }}>
        <button
          className="btn-link"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "login" ? "Create an account instead" : "I already have an account"}
        </button>
      </p>
    </>
  );
}
