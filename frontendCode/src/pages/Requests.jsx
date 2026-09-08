import { useEffect, useState } from "react";
import { api } from "../api.js";
import { grantConsent, hasMetaMask } from "../chain.js";

/**
 * Incoming requests to see your contact details, and what you asked others for.
 *
 * Approving signs grantConsent with your own key, in this browser - through
 * MetaMask if it is installed, otherwise through the local demo signer in
 * chain.js. Either way the key stays on this machine and the backend never
 * sees it, so the server cannot forge an approval on your behalf.
 *
 * Rejecting writes nothing to the chain at all. Refusing costs no gas and
 * leaves no permanent record of who asked.
 */
export default function Requests({ user }) {
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(null);

  function load() {
    api.incomingRequests(user.id).then(setIncoming).catch((e) => setError(e.message));
    api.outgoingRequests(user.id).then(setOutgoing).catch((e) => setError(e.message));
  }

  useEffect(load, [user.id]);

  async function approve(row) {
    setError("");
    setStatus("");

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
      setStatus(
        `Approved on chain. ${row.requesterName} can now see your details. Transaction ${txHash.slice(0, 12)}…`
      );
      load();
    } catch (e) {
      setError(e.shortMessage || e.message);
    } finally {
      setBusy(null);
    }
  }

  async function reject(row) {
    setError("");
    setStatus("");
    setBusy(row.id);
    try {
      await api.rejectRequest(row.id);
      setStatus(
        `Turned down ${row.requesterName}'s request. Nothing was written to the chain.`
      );
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <h2>Requests</h2>
      <p className="lede">
        Approving signs a transaction with your own key. Nothing is released
        until the contract records it.
      </p>

      {error && <div className="notice error">{error}</div>}
      {status && <div className="notice ok">{status}</div>}

      <div className="panel">
        <h3>Waiting for you</h3>

        {incoming.length === 0 && (
          <p className="empty">Nobody has asked for your details yet.</p>
        )}

        {incoming.map((row) => (
          <div className="row" key={row.id}>
            <div className="match-body">
              <strong>{row.requesterName}</strong>
              <p className="match-meta">
                wants to see your phone number
                {!row.requesterWallet && " · no wallet connected yet"}
              </p>
            </div>
            <div>
              <button
                className="btn"
                onClick={() => approve(row)}
                disabled={busy === row.id}
              >
                {busy === row.id
                  ? hasMetaMask()
                    ? "Confirm in MetaMask…"
                    : "Signing…"
                  : "Approve"}
              </button>{" "}
              <button
                className="btn-quiet"
                onClick={() => reject(row)}
                disabled={busy === row.id}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <h3>What you have asked for</h3>

        {outgoing.length === 0 && (
          <p className="empty">
            You have not asked anyone for their details. Open a match and use
            "Ask for their details".
          </p>
        )}

        {outgoing.map((row) => (
          <div className="row" key={row.id}>
            <div className="match-body">
              <strong>{row.ownerName}</strong>
            </div>
            <span className="verdict">{row.status.toLowerCase()}</span>
          </div>
        ))}
      </div>
    </>
  );
}
