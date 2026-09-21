import { useEffect, useState } from "react";
import {
  api, SHARING, SHARING_FLOOR, rupees, shortShare,
  genderWord, genderPlural, tintFor, initialsOf, tagsFor
} from "../api.js";

export default function Search({ user, profile, filters, setFilters,
                                 saved, onToggleSave, onOpen, onConnectWallet,
                                 onLoaded }) {
  const [matches, setMatches] = useState([]);
  const [excluded, setExcluded] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [firstPaint, setFirstPaint] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    api
      .getMatches(user.id, {
        genderPreference: filters.genderPreference,
        sharing: filters.sharing
      })
      .then((data) => {
        if (!live) return;
        const list = data.matches || [];
        const ex = data.excluded || {};
        setMatches(list);
        setExcluded(ex);
        setTotal(data.totalStudents || 0);
        setError("");
        // Hand the results up so Saved and the filter counts can use them
        // without refetching.
        onLoaded && onLoaded(list, ex);
      })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));

    return () => { live = false; };
  }, [user.id, filters.genderPreference, filters.sharing]);

  const sorted = sortMatches(matches, filters.sort);

  const budgetTooLow =
    profile && profile.budget < SHARING_FLOOR[filters.sharing || profile.sharing];

  const hidden = [];
  if (excluded["my-gender"]) hidden.push(`${excluded["my-gender"]} by your gender filter`);
  if (excluded["their-gender"])
    hidden.push(`${excluded["their-gender"]} who only want their own gender`);
  if (excluded.city) hidden.push(`${excluded.city} in another city`);
  if (excluded.budget) hidden.push(`${excluded.budget} outside your budget`);
  if (excluded.sharing) hidden.push(`${excluded.sharing} want a different room size`);

  return (
    <>
      {!user.walletAddress && (
        <div className="skip-note" style={{ marginBottom: 18 }}>
          You can browse and save without a wallet. Connect one when you are ready
          to share your photo or number.{" "}
          <button className="btn-link" onClick={onConnectWallet}>Connect a wallet</button>
        </div>
      )}

      {budgetTooLow && (
        <div className="warn">
          {rupees(profile.budget)} a month is usually not enough for{" "}
          {shortShare(filters.sharing || profile.sharing).toLowerCase()} in{" "}
          {profile.city}. Students normally budget from{" "}
          {rupees(SHARING_FLOOR[filters.sharing || profile.sharing])}.
        </div>
      )}

      <div className="results-head">
        <div>
          <h2>
            {loading
              ? "Searching…"
              : `${sorted.length} roommate${sorted.length === 1 ? "" : "s"} in ${profile.city}`}
          </h2>
          <span className="sub">
            {loading
              ? "Checking who matches your filters"
              : `Showing ${sorted.length} of ${total} students`}
          </span>
        </div>
        <div className="sort">
          <span>Sort by</span>
          <select value={filters.sort}
                  onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
            <option value="match">Best match</option>
            <option value="budget-low">Lowest budget</option>
            <option value="budget-high">Highest budget</option>
          </select>
        </div>
      </div>

      <div className="applied">
        <span className="tagx">
          {filters.genderPreference === "same"
            ? `${genderPlural(profile.gender)} only`
            : "any gender"}
        </span>
        <span className="tagx">±3k of {rupees(profile.budget)}</span>
        <span className="tagx">{profile.city}</span>
        <span className="tagx">{shortShare(filters.sharing || profile.sharing)}</span>
      </div>

      {error && <div className="notice error">{error}</div>}

      {loading && <Skeletons />}

      {!loading && !error && sorted.length === 0 && (
        <div className="empty-box">
          <h3>No roommates match these filters</h3>
          <p>
            {hidden.length > 0
              ? `Hidden: ${hidden.join(", ")}.`
              : "Nobody else has filled in a profile yet."}
          </p>
          <button className="btn-quiet"
                  onClick={() => setFilters({ ...filters, genderPreference: "any" })}>
            Try matching with anyone
          </button>
        </div>
      )}

      {!loading &&
        sorted.map((m) => (
          <ListingCard key={m.userId} m={m} enter={firstPaint}
                       saved={!!saved[m.userId]}
                       onToggleSave={onToggleSave} onOpen={onOpen} />
        ))}

      {!loading && sorted.length > 0 && hidden.length > 0 && (
        <p className="excluded" style={{ marginTop: 4 }}>
          Hidden: {hidden.join(", ")}.
        </p>
      )}

      {!loading && sorted.length > 0 && <TrustStrip />}

      {firstPaint && !loading && <Settle onDone={() => setFirstPaint(false)} />}
    </>
  );
}

/** Runs the stagger animation once, then stops re-triggering it. */
function Settle({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 700);
    return () => clearTimeout(t);
  }, [onDone]);
  return null;
}

function sortMatches(list, sort) {
  const copy = list.slice();
  if (sort === "budget-low") copy.sort((a, b) => a.budget - b.budget);
  else if (sort === "budget-high") copy.sort((a, b) => b.budget - a.budget);
  else copy.sort((a, b) => b.score - a.score);
  return copy;
}

export function ListingCard({ m, enter, saved, onToggleSave, onOpen }) {
  const band = m.score >= 70 ? "" : m.score >= 40 ? " mid" : " low";

  return (
    <button className={`listing${enter ? " enter" : ""}`} onClick={() => onOpen(m)}>
      <div className="cardav">
        <div className="avatar" style={{ background: tintFor(m.userId) }} aria-hidden="true">
          {initialsOf(m.name)}
        </div>
      </div>

      <div className="body">
        <div className="row1">
          <div className="person" style={{ margin: 0 }}>
            <span className="nm">{m.name}</span>
            {m.verified && (
              <span className="verified"><i>&#10003;</i>Verified student</span>
            )}
          </div>
          <div className="right-stack">
            <span className={`matchbadge${band}`}>{Math.round(m.score)}% match</span>
            <span className="heart" role="button" aria-pressed={saved}
                  aria-label="Save this roommate"
                  onClick={(e) => { e.stopPropagation(); onToggleSave(m.userId); }}>
              {saved ? "\u2665" : "\u2661"}
            </span>
          </div>
        </div>

        <p className="where">
          {m.area}, {m.city} &middot; {genderWord(m.gender)}
        </p>

        <div className="budget">
          <em>Budget</em>
          {rupees(m.budget)}
          <small> / month &middot; {shortShare(m.sharing)}</small>
        </div>

        <div className="tags" style={{ marginTop: 9 }}>
          {tagsFor(m).map((t) => <span className="tag" key={t}>{t}</span>)}
        </div>

        <div className="agree-row">
          {m.agreement && (
            <div className="strip grow" role="img"
                 aria-label={`Agreement across six questions with ${m.name}`}>
              {m.agreement.map((a) => (
                <i key={a.question} style={{ "--fill": `${a.closeness * 100}%` }} />
              ))}
            </div>
          )}
          <span className="agree-text">
            {m.reasons && m.reasons.length > 0
              ? `Agree on ${m.reasons.join(", ")}`
              : "Very different habits"}
          </span>
        </div>

        {m.modelConfidence !== undefined && (
          <div className="foot">
            Classifier: {m.modelSaysCompatible ? "compatible" : "not compatible"} (
            {Math.round(m.modelConfidence)}% confidence)
          </div>
        )}
      </div>
    </button>
  );
}

function Skeletons() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div className="sk-card" key={i}>
          <div className="sk sk-thumb" />
          <div className="sk-body">
            <span className="sk" style={{ width: "35%", height: 20 }} />
            <span className="sk" style={{ width: "48%" }} />
            <span className="sk" style={{ width: "30%" }} />
            <span className="sk" style={{ width: "62%", height: 18 }} />
          </div>
        </div>
      ))}
    </>
  );
}

function TrustStrip() {
  return (
    <div className="trust-strip">
      <div>Photos and contact details released only with on-chain consent</div>
      <div>Reviews are hash-verified and cannot be edited</div>
      <div>No brokerage, no listing fees</div>
    </div>
  );
}
