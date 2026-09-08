import { useState } from "react";
import { api } from "../api.js";
import { grantConsent, revokeConsent } from "../chain.js";

export default function MatchDetail({ user, match, onBack }) {
  const [contact, setContact] = useState(null);
  const [shared, setShared] = useState(null); // tx hash after granting
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [requested, setRequested] = useState(false);

  const theirWallet = match.walletAddress;

  /** Writes consent to the contract, then records the tx hash in the database. */
  async function share() {
    setError("");
    if (!theirWallet) {
      setError(`${match.name} has not connected a wallet yet, so nothing can be recorded`);
      return;
    }

    setBusy("share");
    try {
      const txHash = await grantConsent(theirWallet, user.walletAddress);
      await api.recordConsent(user.id, match.userId, txHash);
      setShared(txHash);
    } catch (e) {
      setError(e.shortMessage || e.message);
    } finally {
      setBusy("");
    }
  }

  async function unshare() {
    setError("");
    setBusy("unshare");
    try {
      await revokeConsent(theirWallet, user.walletAddress);
      setShared(null);
    } catch (e) {
      setError(e.shortMessage || e.message);
    } finally {
      setBusy("");
    }
  }

  /**
   * Puts a request in front of them. Saved in MySQL only - a request grants
   * nothing, so there is nothing worth writing to the chain, and putting it
   * there would publish who is interested in whom.
   */
  async function askForDetails() {
    setError("");
    setBusy("request");
    try {
      await api.requestContact(user.id, match.userId);
      setRequested(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  /**
   * Asks the backend for their phone number. The backend calls hasConsent on
   * the contract before it answers, so a 403 here came from the blockchain.
   */
  async function reveal() {
    setError("");
    setContact(null);
    setBusy("reveal");
    try {
      const details = await api.getContact(match.userId, user.id);
      setContact(details);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <p>
        <button className="btn-link" onClick={onBack}>
          Back to matches
        </button>
      </p>

      <h2>{match.name}</h2>
      <p className="lede">
        {Math.round(match.score)}% match · {match.city} · ₹
        {match.budget.toLocaleString("en-IN")} a month
        {match.reasons.length > 0 && <> · you agree on {match.reasons.join(", ")}</>}
      </p>

      {error && <div className="notice error">{error}</div>}

      <div className={shared ? "panel revealed" : "panel"}>
        <h3>Share your details</h3>
        <p className="match-meta">
          Recording this on the blockchain lets {match.name} see your phone
          number. You can withdraw it at any time.
        </p>

        {shared ? (
          <>
            <div className="notice ok">
              Consent recorded. {match.name} can now see your contact details.
            </div>
            <button className="btn-quiet" onClick={unshare} disabled={busy === "unshare"}>
              {busy === "unshare" ? "Withdrawing…" : "Withdraw consent"}
            </button>
            <p className="chain-note">Transaction: {shared}</p>
          </>
        ) : (
          <button className="btn" onClick={share} disabled={busy === "share"}>
            {busy === "share" ? "Confirm in MetaMask…" : `Share my details with ${match.name}`}
          </button>
        )}
      </div>

      <div className={contact ? "panel revealed" : "panel locked"}>
        <h3>Their details</h3>

        {contact ? (
          <>
            <p className="contact-line">{contact.phone}</p>
            <p className="contact-line">{contact.email}</p>
            <p className="chain-note">
              Released because the contract confirmed {match.name} granted you
              permission.
            </p>
          </>
        ) : (
          <>
            <p className="match-meta">
              Hidden until {match.name} shares them with you. The check runs
              against the contract, not the database.
            </p>

            {requested ? (
              <div className="notice ok">
                Asked. {match.name} will see it under Requests and can approve
                or turn it down.
              </div>
            ) : (
              <button
                className="btn"
                onClick={askForDetails}
                disabled={busy === "request"}
              >
                {busy === "request" ? "Asking…" : `Ask ${match.name} for their details`}
              </button>
            )}{" "}
            <button className="btn-quiet" onClick={reveal} disabled={busy === "reveal"}>
              {busy === "reveal" ? "Checking the chain…" : "Check for permission"}
            </button>
          </>
        )}
      </div>
    </>
  );
}
