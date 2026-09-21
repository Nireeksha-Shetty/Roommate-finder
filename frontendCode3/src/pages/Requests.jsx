import { useEffect, useState } from "react";
import { api, tintFor, initialsOf } from "../api.js";
import { grantConsent, hasMetaMask } from "../chain.js";

const STATUS_WORD = {
  PENDING: "Waiting for them",
  APPROVED: "Approved",
  REJECTED: "Turned down"
};

/**
 * Incoming requests to see your photo and number, and what you asked others for.
 *
 * Approving signs grantConsent with your own key, in this browser - through
 * MetaMask if it is installed, otherwise through the local demo signer in
 * chain.js. Either way the key stays on this machine and the backend never
 * sees it, so the server cannot forge an approval on your behalf.
 *
 * Rejecting writes nothing to the chain at all. Refusing costs no gas and
 * leaves no permanent record of who asked.
 */
export default function Requests({ user, onToast }) {
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  function load() {
    api.incomingRequests(user.id).then(setIncoming).catch((e) => setError(e.message));
    api.outgoingRequests(user.id).then(setOutgoing).catch((e) => setError(e.message));
  }

  useEffect(load, [user.id]);

  async function approve(row) {
    setError("");

    if (!user.walletAddress) {
      setError("Connect a wallet first - the approval has to be signed by you");
      return;
    }
    if (!row.requesterWallet) {
      setError(
        `${row.requesterName} has not connected a wallet, so there is no address to grant to`
      );
      return;
    }

    setBusy(row.id);
    try {
      // Signed here, not on the server. Only after the contract has recorded
      // it do we tell the backend, and even then the backend re-reads the
      // chain before it releases anything.
      const txHash = await grantConsent(row.requesterWallet, user.walletAddress);
      await api.approveRequest(row.id, txHash);
      onToast &&
        onToast(`Approved on chain. ${row.requesterName} can now see your details.`);
      load();
    } catch (e) {
      setError(e.shortMessage || e.message);
    } finally {
      setBusy(null);
    }
  }

  async function reject(row) {
    setError("");
    setBusy(row.id);
    try {
      await api.rejectRequest(row.id);
      onToast &&
        onToast(`Turned down ${row.requesterName}. Nothing was written to the chain.`);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="results-head">
        <div>
          <h2>Requests</h2>
          <span className="sub">
            Approving signs a transaction with your own key &mdash; nothing is
            released until the contract records it
          </span>
        </div>
      </div>

      {error && <div className="notice error">{error}</div>}

      {!user.walletAddress && (
        <div className="skip-note" style={{ marginBottom: 18 }}>
          You can see who asked without a wallet, but approving needs one, because
          the permission has to be signed by you.
        </div>
      )}

      <div className="panel">
        <h3>Waiting for you</h3>
        <p className="note">
          These students want to see your photo and phone number.
        </p>

        {incoming.length === 0 ? (
          <p className="req-empty">Nobody has asked for your details yet.</p>
        ) : (
          incoming.map((row) => (
            <div className="req-row" key={row.id}>
              <div className="avatar" style={{ background: tintFor(row.requesterId) }}
                   aria-hidden="true">
                {initialsOf(row.requesterName)}
              </div>

              <div className="req-body">
                <div className="person" style={{ margin: 0 }}>
                  <span className="nm">{row.requesterName}</span>
                  {row.requesterVerified && (
                    <span className="verified"><i>&#10003;</i>Verified student</span>
                  )}
                </div>
                <p className="where">
                  {row.requesterArea
                    ? `${row.requesterArea}, ${row.requesterCity}`
                    : "Wants to see your details"}
                  {!row.requesterWallet && " · no wallet connected yet"}
                </p>
              </div>

              <div className="req-actions">
                <button className="btn" onClick={() => approve(row)}
                        disabled={busy === row.id}>
                  {busy === row.id
                    ? hasMetaMask()
                      ? "Confirm in MetaMask…"
                      : "Signing…"
                    : "Approve"}
                </button>
                <button className="btn-quiet" onClick={() => reject(row)}
                        disabled={busy === row.id}>
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="panel">
        <h3>What you have asked for</h3>

        {outgoing.length === 0 ? (
          <p className="req-empty">
            You have not asked anyone yet. Open a match and use &ldquo;Ask for
            their details&rdquo;.
          </p>
        ) : (
          outgoing.map((row) => (
            <div className="req-row" key={row.id}>
              <div className="avatar" style={{ background: tintFor(row.ownerId) }}
                   aria-hidden="true">
                {initialsOf(row.ownerName)}
              </div>
              <div className="req-body">
                <div className="person" style={{ margin: 0 }}>
                  <span className="nm">{row.ownerName}</span>
                </div>
              </div>
              <span className={`req-status ${row.status.toLowerCase()}`}>
                {STATUS_WORD[row.status] || row.status}
              </span>
            </div>
          ))
        )}
      </div>

      <p className="chain-note">
        A request is only a message, so it stays in the database. Publishing it
        would put who is interested in whom on a permanent public ledger, and it
        grants nothing anyway &mdash; only the approval is written to the contract.
      </p>
    </>
  );
}
