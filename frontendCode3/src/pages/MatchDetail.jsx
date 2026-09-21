import { useState } from "react";
import {
  api, QUESTIONS, rupees, genderWord, tintFor, initialsOf, tagsFor
} from "../api.js";
import { grantConsent, revokeConsent } from "../chain.js";

const TX_STEPS = [
  "Waiting for MetaMask",
  "Broadcasting transaction",
  "Confirming on chain",
  "Confirmed"
];

export default function MatchDetail({ user, match, onBack, onToast, onConnectWallet }) {
  const [stage, setStage] = useState(null);   // null, 0..3, or 4 when finished
  const [txHash, setTxHash] = useState(null);
  const [contact, setContact] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(false);

  const first = (match.name || "").split(" ")[0];

  /**
   * Walks the real stages a transaction goes through. Stage 4 means every
   * step is finished, so nothing is left spinning.
   */
  async function share() {
    setError("");
    if (!match.walletAddress) {
      setError(`${first} has not connected a wallet yet, so nothing can be recorded`);
      return;
    }
    if (!user.walletAddress) {
      setError("Connect your own wallet first");
      return;
    }

    setStage(0);
    setBusy(true);
    try {
      const hash = await grantConsent(match.walletAddress, user.walletAddress);
      setTxHash(hash);
      setStage(2);
      await api.recordConsent(user.id, match.userId, hash);
      setStage(4);
      onToast && onToast("Permission recorded on the blockchain");
    } catch (e) {
      setStage(null);
      setError(e.shortMessage || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    setError("");
    setBusy(true);
    try {
      await revokeConsent(match.walletAddress, user.walletAddress);
      setStage(null);
      setTxHash(null);
      onToast && onToast("Permission withdrawn");
    } catch (e) {
      setError(e.shortMessage || e.message);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Puts a request in front of them. Saved in MySQL only - a request grants
   * nothing, so there is nothing worth writing to the chain, and putting it
   * there would publish who is interested in whom.
   */
  async function askForDetails() {
    setError("");
    setBusy(true);
    try {
      await api.requestContact(user.id, match.userId);
      setRequested(true);
      onToast && onToast(`Asked ${first} for their details`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Asks the backend for the photo and number. The backend calls hasConsent
   * on the contract before answering, so a 403 here came from the chain and
   * not from a flag in the database.
   */
  async function reveal() {
    setError("");
    setBusy(true);
    try {
      const details = await api.getContact(match.userId, user.id);
      setContact(details);
      onToast && onToast("Contact details unlocked");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="crumb">
        <button className="btn-link" onClick={onBack}>Back to search results</button>
      </p>

      <div className="profile-card">
        <div className="phead">
          <div className="avatar" style={{ background: tintFor(match.userId) }} aria-hidden="true">
            {initialsOf(match.name)}
          </div>
          <div>
            <h2>{match.name}</h2>
            <div className="person">
              {match.verified && (
                <span className="verified"><i>&#10003;</i>Verified student</span>
              )}
              <span className="tag">{genderWord(match.gender)}</span>
              <span className="tag">{match.sharing}</span>
            </div>
            <p className="where" style={{ margin: "6px 0 0" }}>
              {match.area}, {match.city}
            </p>
          </div>
          <div className="budget">
            <em>Budget</em>
            {rupees(match.budget)}
            <small> / month</small>
          </div>
        </div>
        <div className="tags" style={{ margin: "14px 0 0" }}>
          {tagsFor(match).map((t) => <span className="tag" key={t}>{t}</span>)}
        </div>
      </div>

      {error && <div className="notice error">{error}</div>}

      {match.agreement && (
        <div className="panel">
          <h3>{Math.round(match.score)}% match</h3>
          <p className="note">A full bar means you gave the same answer.</p>
          <div className="strip-rows grow">
            {match.agreement.map((a) => (
              <div className="strip-row" key={a.question}>
                <span>{a.question}</span>
                <div style={{ "--fill": `${a.closeness * 100}%` }} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={stage === 4 ? "panel revealed" : "panel"}>
        <h3>Share your photo and contact details</h3>
        <p className="note">
          Your number stays hidden until you allow it. Permission is recorded on the
          blockchain, so it cannot be granted on your behalf, and you can withdraw it
          at any time.
        </p>

        {stage === null ? (
          user.walletAddress ? (
            <button className="btn" onClick={share} disabled={busy}>
              Allow {first} to see my details
            </button>
          ) : (
            <button className="btn" onClick={onConnectWallet}>
              Connect a wallet to share
            </button>
          )
        ) : (
          <>
            <div className="tx">
              {TX_STEPS.map((label, i) => (
                <div key={label}
                     className={`tx-step${i < stage ? " done" : i === stage ? " active" : ""}`}>
                  <span className="tx-icon" />
                  {i === 3 && stage >= 4 ? "Confirmed on chain" : label}
                </div>
              ))}
              {txHash && <p className="tx-hash">{txHash}</p>}
            </div>
            {stage >= 4 && (
              <button className="btn-quiet" style={{ marginTop: 13 }}
                      onClick={withdraw} disabled={busy}>
                Withdraw permission
              </button>
            )}
          </>
        )}
      </div>

      <div className={contact ? "panel revealed" : "panel locked"}>
        <h3>{first}&rsquo;s photo and contact details</h3>

        <div className="photo-wrap" style={{ marginTop: 12 }}>
          {contact ? (
            match.hasPhoto ? (
              <div className="photo">
                <img src={api.photoUrl(match.userId, user.id)}
                     alt={`${match.name}'s profile photo`} />
              </div>
            ) : (
              <div className="photo-locked">
                <div>
                  <div className="initials">{initialsOf(match.name)}</div>
                  <span>No photo uploaded</span>
                </div>
              </div>
            )
          ) : (
            <div className="photo-locked">
              <div>
                <div className="initials">{initialsOf(match.name)}</div>
                <span>Photo hidden</span>
              </div>
            </div>
          )}

          <div>
            {contact ? (
              <>
                <p className="contact-line">{contact.phone}</p>
                <p className="contact-line">{contact.email}</p>
                <p className="chain-note">
                  Released because the contract confirmed {first} granted you
                  permission. The photo is streamed through the same check, so it has
                  no public URL.
                </p>
              </>
            ) : (
              <>
                <p className="note">
                  {first}&rsquo;s photo and number stay hidden until they allow it.
                  Both are released by the same on-chain check, not by a flag in the
                  database.
                </p>

                {requested && (
                  <div className="notice ok">
                    Asked. {first} will see it under Requests and can approve or
                    turn it down.
                  </div>
                )}

                <div className="req-actions" style={{ marginLeft: 0 }}>
                  {!requested && (
                    <button className="btn" onClick={askForDetails} disabled={busy}>
                      {busy ? "Asking…" : `Ask ${first} for their details`}
                    </button>
                  )}
                  <button className="btn-quiet" onClick={reveal} disabled={busy}>
                    {busy ? "Checking the chain…" : "Check for permission"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
