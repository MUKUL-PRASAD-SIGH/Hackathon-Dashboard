import React, { useEffect, useState } from 'react';
import './Recommendations.css';

/**
 * Generic "recommended for you" strip.
 *
 * Props:
 *  title, subtitle
 *  load():           async () => items[]
 *  renderItem(item): node (must set its own key)
 *  emptyText
 *  refreshKey:       change to reload
 */
const Recommendations = ({ title, subtitle, load, renderItem, emptyText, refreshKey }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    load()
      .then(result => { if (!cancelled) setItems(result); })
      .catch(err => { if (!cancelled) setError(err.message || 'Could not load recommendations'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // load is recreated by parents on each render; reload only when refreshKey changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return (
    <section className="reco" aria-label={title}>
      <header className="reco-header">
        <h3 className="reco-title">✦ {title}</h3>
        {subtitle && <p className="reco-subtitle">{subtitle}</p>}
      </header>

      {loading && <p className="reco-state">Finding matches…</p>}
      {!loading && error && <p className="reco-state reco-state--error">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="reco-state">{emptyText || 'No recommendations yet.'}</p>
      )}
      {!loading && !error && items.length > 0 && (
        <div className="reco-grid">{items.map(renderItem)}</div>
      )}
    </section>
  );
};

export const MatchBadge = ({ score }) => (
  <span className={`reco-score ${score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low'}`}>
    {score}% match
  </span>
);

export const MatchReasons = ({ reasons = [] }) => (
  <ul className="reco-reasons">
    {reasons.slice(0, 3).map(r => <li key={r}>{r}</li>)}
  </ul>
);

export default Recommendations;
