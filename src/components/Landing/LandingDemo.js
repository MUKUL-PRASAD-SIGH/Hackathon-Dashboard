import React, { useMemo, useState } from 'react';
import { parseQuery, filterHackathons, describeFilter } from '../../utils/aiFilter';
import './LandingDemo.css';

const DAY_MS = 24 * 60 * 60 * 1000;
const inDays = (n) => new Date(Date.now() + n * DAY_MS).toISOString();

// Dates are relative to "now" so the demo never goes stale
const buildSamples = () => [
  { id: 1, name: 'Campus AI Sprint', platform: 'Devpost', status: 'Planning', team: 'Team', date: inDays(9), teamMembers: [], maxParticipants: 4, score: 92, reason: 'Matches your Devpost history' },
  { id: 2, name: 'Web3 Weekend Jam', platform: 'HackerEarth', status: 'Participating', team: 'Solo', date: inDays(3), teamMembers: [], maxParticipants: 1, score: 61, reason: 'Starting soon' },
  { id: 3, name: 'Green Tech Challenge', platform: 'Devpost', status: 'Planning', team: 'Team', date: inDays(38), teamMembers: [{ name: 'A', email: 'a@x.com' }], maxParticipants: 4, score: 78, reason: '3 open slots on the team' },
  { id: 4, name: 'CodeChef Rust Rally', platform: 'CodeChef', status: 'Won', team: 'Solo', date: inDays(-20), teamMembers: [], maxParticipants: 1, score: 40, reason: 'Past win' },
  { id: 5, name: 'Topcoder Data Dash', platform: 'Topcoder', status: 'Planning', team: 'Team', date: inDays(16), teamMembers: [{ name: 'A', email: 'a@x.com' }, { name: 'B', email: 'b@x.com' }, { name: 'C', email: 'c@x.com' }], maxParticipants: 4, score: 55, reason: 'Ideal prep window' }
];

const EXAMPLES = ['devpost with open slots', 'solo hackathons', 'upcoming soonest', 'won'];

const LandingDemo = () => {
  const [query, setQuery] = useState('devpost with open slots');
  const samples = useMemo(buildSamples, []);
  const filter = useMemo(() => parseQuery(query), [query]);
  const results = useMemo(
    () => filterHackathons(samples, filter).slice().sort((a, b) => b.score - a.score),
    [samples, filter]
  );

  return (
    <div className="ld">
      <div className="ld-input-row">
        <span className="ld-badge">✦ AI</span>
        <input
          className="ld-input"
          aria-label="Try the AI filter"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe the hackathon you want…"
        />
      </div>
      <div className="ld-examples">
        {EXAMPLES.map(ex => (
          <button type="button" key={ex} className="ld-chip" onClick={() => setQuery(ex)}>{ex}</button>
        ))}
      </div>
      <p className="ld-understood">
        {describeFilter(filter) ? `Understood: ${describeFilter(filter)}` : 'Type anything — dates, platforms, status, open slots…'}
      </p>

      <div className="ld-results">
        {results.length === 0 && <p className="ld-empty">No sample hackathons match that. Try another query.</p>}
        {results.map(h => (
          <div className="ld-card" key={h.id}>
            <div>
              <strong>{h.name}</strong>
              <span className="ld-meta">{h.platform} · {new Date(h.date).toLocaleDateString()} · {h.status}</span>
              <span className="ld-reason">{h.reason}</span>
            </div>
            <span className="ld-score">{h.score}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LandingDemo;
