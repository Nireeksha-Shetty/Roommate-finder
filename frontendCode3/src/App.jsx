import { useCallback, useEffect, useState } from "react";
import { api, rupees } from "./api.js";
import { connectWallet, demoAccounts, hasMetaMask } from "./chain.js";
import Signup from "./pages/Signup.jsx";
import Login from "./pages/Login.jsx";
import Search from "./pages/Search.jsx";
import Filters from "./pages/Filters.jsx";
import Saved from "./pages/Saved.jsx";
import MatchDetail from "./pages/MatchDetail.jsx";
import ProfileForm from "./pages/ProfileForm.jsx";
import Reviews from "./pages/Reviews.jsx";
import Requests from "./pages/Requests.jsx";

const NAV = [
  ["search", "Search"],
  ["saved", "Saved"],
  ["requests", "Requests"],
  ["profile", "My profile"],
  ["reviews", "Reviews"]
];

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authMode, setAuthMode] = useState("signup");
  const [tab, setTab] = useState("search");
  const [openMatch, setOpenMatch] = useState(null);
  const [saved, setSaved] = useState({});
  const [filters, setFilters] = useState({
    genderPreference: "same",
    sharing: "Double sharing",
    sort: "match"
  });
  const [allMatches, setAllMatches] = useState([]);
  const [excluded, setExcluded] = useState({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [pending, setPending] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  const toast = useCallback((message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  // Load the profile once signed in, and seed the filters from it.
  useEffect(() => {
    if (!user) return;
    api
      .getProfile(user.id)
      .then((p) => {
        setProfile(p);
        setFilters((f) => ({
          ...f,
          genderPreference: p.genderPreference || "same",
          sharing: p.sharing || "Double sharing"
        }));
      })
      .catch(() => setProfile(null));
  }, [user]);

  // How many people are waiting on a decision, for the nav badge. Re-reads on
  // every tab change so approving one updates the count without a refresh.
  useEffect(() => {
    if (!user) return;
    api
      .incomingRequests(user.id)
      .then((rows) => setPending(rows.length))
      .catch(() => setPending(0));
  }, [user, tab]);

  function afterSignup(newUser, genderPreference, sharing) {
    setUser(newUser);
    setFilters({ genderPreference, sharing, sort: "match" });
    setTab("search");
    toast(`Welcome, ${(newUser.name || "").split(" ")[0]}`);
  }

  async function connect() {
    // No extension: offer the local Hardhat accounts instead of dead-ending.
    if (!hasMetaMask()) {
      setPickerOpen(true);
      return;
    }
    try {
      const address = await connectWallet();
      const updated = await api.saveWallet(user.id, address);
      setUser(updated);
      toast("Wallet connected");
    } catch (e) {
      toast(e.message);
    }
  }

  /** Used when no wallet extension is installed - see chain.js. */
  async function useDemoAccount(address) {
    if (!address) return;
    try {
      const updated = await api.saveWallet(user.id, address);
      setUser(updated);
      setPickerOpen(false);
      toast("Wallet connected");
    } catch (e) {
      toast(e.message);
    }
  }

  function toggleSave(id) {
    setSaved((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      toast(next[id] ? "Saved for later" : "Removed from saved");
      return next;
    });
  }

  function open(match) {
    setOpenMatch(match);
    setTab("detail");
  }

  if (!user) {
    return (
      <>
        <TopbarLite />
        {authMode === "signup" ? (
          <Signup onSignedUp={afterSignup} onWantLogin={() => setAuthMode("login")} />
        ) : (
          <Login onSignedIn={setUser} onWantSignup={() => setAuthMode("signup")} />
        )}
        <Toasts items={toasts} />
      </>
    );
  }

  const savedCount = Object.values(saved).filter(Boolean).length;
  const wide = tab === "search";

  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="mark">RM</div>
            <strong>RoomMate.in</strong>
          </div>
          <nav className="topnav">
            {NAV.map(([key, label]) => (
              <button key={key} aria-current={tab === key} onClick={() => setTab(key)}>
                {label}
                {key === "saved" && savedCount > 0 ? ` (${savedCount})` : ""}
                {key === "requests" && pending > 0 ? ` (${pending})` : ""}
              </button>
            ))}
          </nav>
          <div className="userbox">
            <span className="wallet-pill">
              {(user.name || "").split(" ")[0]}
              {user.walletAddress
                ? ` \u00b7 ${user.walletAddress.slice(0, 6)}…${user.walletAddress.slice(-4)}`
                : " \u00b7 no wallet"}
            </span>
            <button className="signout" onClick={() => { setUser(null); setProfile(null); }}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {wide && profile && (
        <div className="hero-band">
          <div className="hero-inner">
            <span className="trust-badge">
              <span className="tick">&#10003;</span>
              Your photo and number stay hidden until you share them
            </span>
            <h1>Find a roommate you can actually live with</h1>
            <p className="hero-count">
              Students looking for someone to share with in {profile.city}, within{" "}
              <b>±{rupees(3000)}</b> of your <b>{rupees(profile.budget)}</b> budget.
              Nobody here is a landlord &mdash; you find each other, then find a place
              together.
            </p>
          </div>
        </div>
      )}

      <div className={`page${wide ? "" : " single"}`}>
        {wide && profile && (
          <Filters profile={profile} filters={filters} setFilters={setFilters}
                   excluded={excluded} open={filtersOpen}
                   onToggle={() => setFiltersOpen(!filtersOpen)} />
        )}

        <main>
          {pickerOpen && !user.walletAddress && (
            <div className="panel">
              <h3>Pick a test account</h3>
              <p className="note">
                No wallet extension found, so use one of the local Hardhat test
                accounts instead. It signs in this browser, exactly as MetaMask
                would &mdash; your key is never sent to the server.
              </p>
              <div className="wallet-picker">
                <select defaultValue="" onChange={(e) => useDemoAccount(e.target.value)}>
                  <option value="">Choose a test account…</option>
                  {demoAccounts().map((a) => (
                    <option key={a.address} value={a.address}>
                      {a.label} · {a.address.slice(0, 8)}…{a.address.slice(-6)}
                    </option>
                  ))}
                </select>
                <button className="btn-quiet" onClick={() => setPickerOpen(false)}>
                  Cancel
                </button>
              </div>
              <p className="chain-note">
                Give each signed-in student a different account &mdash; consent has
                a direction, so the granter and receiver cannot be the same.
              </p>
            </div>
          )}

          {!profile && tab !== "profile" && tab !== "reviews" && tab !== "requests" && (
            <div className="empty-box">
              <h3>Finish your profile first</h3>
              <p>Your city, budget and six answers decide who you are shown.</p>
              <button className="btn-quiet" onClick={() => setTab("profile")}>
                Go to my profile
              </button>
            </div>
          )}

          {profile && tab === "search" && (
            <Search user={user} profile={profile} filters={filters} setFilters={setFilters}
                    saved={saved} onToggleSave={toggleSave} onOpen={open}
                    onConnectWallet={connect}
                    onLoaded={(list, ex) => { setAllMatches(list); setExcluded(ex); }} />
          )}

          {profile && tab === "saved" && (
            <Saved matches={allMatches} saved={saved} onToggleSave={toggleSave}
                   onOpen={open} onBrowse={() => setTab("search")} />
          )}

          {tab === "profile" && (
            <ProfileForm user={user} profile={profile} onSaved={setProfile}
                         onUserChanged={setUser} onToast={toast} />
          )}

          {tab === "requests" && <Requests user={user} onToast={toast} />}

          {tab === "reviews" && <Reviews user={user} onToast={toast} />}

          {tab === "detail" && openMatch && (
            <MatchDetail user={user} match={openMatch} onToast={toast}
                         onConnectWallet={connect}
                         onBack={() => setTab("search")} />
          )}
        </main>
      </div>

      <Toasts items={toasts} />
    </>
  );
}

function TopbarLite() {
  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <div className="mark">RM</div>
          <strong>RoomMate.in</strong>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--slate)" }}>
          Find someone to share with
        </span>
      </div>
    </div>
  );
}

function Toasts({ items }) {
  if (items.length === 0) return null;
  return (
    <div className="toasts">
      {items.map((t) => (
        <div className="toast" key={t.id}>{t.message}</div>
      ))}
    </div>
  );
}
