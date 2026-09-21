import { ListingCard } from "./Search.jsx";

export default function Saved({ matches, saved, onToggleSave, onOpen, onBrowse }) {
  const ids = Object.keys(saved).filter((k) => saved[k]).map(Number);
  const list = matches.filter((m) => ids.includes(m.userId));

  if (list.length === 0) {
    return (
      <>
        <div className="results-head">
          <div>
            <h2>Saved</h2>
            <span className="sub">Nothing saved yet</span>
          </div>
        </div>
        <div className="empty-box">
          <h3>No saved roommates</h3>
          <p>
            Tap the heart on anyone in your search results to keep them here.
            {ids.length > 0 && " Saved students who no longer match your filters are hidden."}
          </p>
          <button className="btn-quiet" onClick={onBrowse}>Browse roommates</button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="results-head">
        <div>
          <h2>Saved</h2>
          <span className="sub">{list.length} kept for later</span>
        </div>
      </div>
      {list.map((m) => (
        <ListingCard key={m.userId} m={m} enter={false} saved
                     onToggleSave={onToggleSave} onOpen={onOpen} />
      ))}
    </>
  );
}
