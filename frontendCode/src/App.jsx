import { useState } from "react";
import { api } from "./api.js";
import { connectWallet, demoAccounts, hasMetaMask } from "./chain.js";
import Login from "./pages/Login.jsx";
import ProfileForm from "./pages/ProfileForm.jsx";
import Matches from "./pages/Matches.jsx";
import MatchDetail from "./pages/MatchDetail.jsx";
import Reviews from "./pages/Reviews.jsx";
import Requests from "./pages/Requests.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("matches");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [walletError, setWalletError] = useState("");

  if (!user) {
    return (
      <div className="shell">
        <div className="masthead">
          <h1>Roommate finder</h1>
        </div>
        <Login onSignedIn={setUser} />
      </div>
    );
  }

  async function handleConnect() {
    setWalletError("");
    try {
      const address = await connectWallet();
      const updated = await api.saveWallet(user.id, address);
      setUser(updated);
    } catch (e) {
      setWalletError(e.message);
    }
  }

  /** Used when no wallet extension is installed - see chain.js. */
  async function useDemoAccount(address) {
    setWalletError("");
    if (!address) {
      return;
    }
    try {
      const updated = await api.saveWallet(user.id, address);
      setUser(updated);
    } catch (e) {
      setWalletError(e.message);
    }
  }

  function openMatch(match) {
    setSelectedMatch(match);
    setView("detail");
  }

  return (
    <div className="shell">
      <div className="masthead">
        <h1>Roommate finder</h1>
        <span className="who">
          {user.name}
          {user.walletAddress
            ? ` · ${user.walletAddress.slice(0, 6)}…${user.walletAddress.slice(-4)}`
            : ""}
        </span>
      </div>

      {!user.walletAddress && (
        <div className="panel">
          <h3>Connect your wallet</h3>
          <p className="lede" style={{ marginBottom: 14 }}>
            Sharing contact details is recorded on the blockchain, so you need a
            wallet before you can send or receive them.
          </p>
          {walletError && <div className="notice error">{walletError}</div>}

          {hasMetaMask() ? (
            <button className="btn" onClick={handleConnect}>
              Connect MetaMask
            </button>
          ) : (
            <>
              <p className="match-meta">
                No wallet extension found, so pick one of the local Hardhat test
                accounts instead. It signs in this browser, exactly as MetaMask
                would - your key is never sent to the server.
              </p>
              <div className="field">
                <select
                  defaultValue=""
                  onChange={(e) => useDemoAccount(e.target.value)}
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
                Give each signed-in student a different account - consent has a
                direction, so the granter and receiver cannot be the same.
              </p>
            </>
          )}
        </div>
      )}

      <nav className="tabs">
        <button
          aria-current={view === "matches"}
          onClick={() => setView("matches")}
        >
          Matches
        </button>
        <button
          aria-current={view === "profile"}
          onClick={() => setView("profile")}
        >
          My preferences
        </button>
        <button
          aria-current={view === "requests"}
          onClick={() => setView("requests")}
        >
          Requests
        </button>
        <button
          aria-current={view === "reviews"}
          onClick={() => setView("reviews")}
        >
          Reviews
        </button>
        <button onClick={() => setUser(null)}>Sign out</button>
      </nav>

      {view === "matches" && <Matches user={user} onOpen={openMatch} />}
      {view === "profile" && <ProfileForm user={user} />}
      {view === "requests" && <Requests user={user} />}
      {view === "reviews" && <Reviews user={user} />}
      {view === "detail" && selectedMatch && (
        <MatchDetail
          user={user}
          match={selectedMatch}
          onBack={() => setView("matches")}
        />
      )}
    </div>
  );
}
