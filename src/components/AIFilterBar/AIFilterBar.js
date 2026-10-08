import React, { useEffect, useMemo, useState } from 'react';
import { parseQuery, describeFilter, isEmptyFilter } from '../../utils/aiFilter';
import './AIFilterBar.css';

/**
 * Natural-language filter input. Debounces typing, shows how the query was
 * understood, and reports the parsed filter via onChange.
 *
 * Props: placeholder, examples (string[]), onChange(filter), resultCount
 */
const AIFilterBar = ({ placeholder, examples = [], onChange, resultCount }) => {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(id);
  }, [query]);

  const filter = useMemo(() => parseQuery(debounced), [debounced]);

  useEffect(() => {
    onChange(filter);
    // onChange identity is not part of the contract; only react to the parsed filter
  }, [filter]);

  return (
    <div className="ai-filter">
      <div className="ai-filter-input-row">
        <span className="ai-filter-badge" aria-hidden="true">✦ AI</span>
        <input
          type="text"
          className="ai-filter-input"
          aria-label="AI filter"
          placeholder={placeholder || 'Describe what you are looking for…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" className="ai-filter-clear" onClick={() => setQuery('')} title="Clear filter">
            ✕
          </button>
        )}
      </div>

      {!isEmptyFilter(filter) ? (
        <div className="ai-filter-understood">
          <span>Understood: {describeFilter(filter)}</span>
          {typeof resultCount === 'number' && (
            <strong>{resultCount} match{resultCount === 1 ? '' : 'es'}</strong>
          )}
        </div>
      ) : examples.length > 0 && (
        <div className="ai-filter-examples">
          Try:
          {examples.map(ex => (
            <button type="button" key={ex} className="ai-filter-chip" onClick={() => setQuery(ex)}>
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIFilterBar;
