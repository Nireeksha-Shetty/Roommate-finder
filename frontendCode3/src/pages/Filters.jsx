import { SHARING, shortShare, rupees, genderPlural } from "../api.js";

/**
 * The sidebar. Gender and sharing are sent to the backend as live query
 * params, so changing them re-runs the match without saving the profile.
 */
export default function Filters({ profile, filters, setFilters, excluded, open, onToggle }) {
  const current = filters.sharing || profile.sharing;

  const counts = [
    [excluded["my-gender"], "by your gender filter"],
    [excluded["their-gender"], "only want their own gender"],
    [excluded.city, "in another city"],
    [excluded.budget, "outside your budget"],
    [excluded.sharing, "want a different room size"]
  ].filter(([n]) => n > 0);

  return (
    <>
      <button className="filters-toggle" onClick={onToggle}>
        {open ? "Hide filters" : "Show filters"}
      </button>

      <aside className={`filters${open ? "" : " hide"}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h3>Filters</h3>
          <button className="reset"
                  onClick={() => setFilters({
                    genderPreference: profile.genderPreference || "same",
                    sharing: profile.sharing,
                    sort: "match"
                  })}>
            Reset
          </button>
        </div>

        <div className="fgroup">
          <span>Match me with</span>
          {[["same", `${genderPlural(profile.gender)} only`], ["any", "Anyone"]].map(
            ([value, label]) => (
              <label className="radio-line" key={value}>
                <input type="radio" name="fg"
                       checked={filters.genderPreference === value}
                       onChange={() => setFilters({ ...filters, genderPreference: value })} />
                {label}
              </label>
            )
          )}
        </div>

        <div className="fgroup">
          <span>People per room</span>
          {SHARING.map((value) => (
            <label className="radio-line" key={value}>
              <input type="radio" name="fs" checked={current === value}
                     onChange={() => setFilters({ ...filters, sharing: value })} />
              {shortShare(value)}
            </label>
          ))}
        </div>

        <div className="fgroup">
          <span>Your budget</span>
          <p style={{ fontSize: 13, color: "var(--slate)", margin: 0 }}>
            {rupees(profile.budget)} a month, matched within ±{rupees(3000)}. Change
            it under My profile.
          </p>
        </div>

        <div className="fgroup">
          <span>Hidden by your filters</span>
          <p style={{ fontSize: 12.5, color: "var(--slate)", margin: 0 }}>
            {counts.length === 0
              ? "Nothing hidden."
              : counts.map(([n, label]) => `${n} ${label}`).join(". ") + "."}
          </p>
        </div>
      </aside>
    </>
  );
}
