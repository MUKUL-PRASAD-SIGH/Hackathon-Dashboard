import React, { useEffect, useMemo, useState } from 'react';
import { fetchIdeas, submitIdea, voteIdea, fetchIdeaResults } from '../../utils/ideaVotingApi';
import './IdeaVoting.css';

const IdeaVotingCard = ({ hackathonId, initialExpanded = false, showToggle = true }) => {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [ideas, setIdeas] = useState([]);
  const [votesUsed, setVotesUsed] = useState(0);
  const [maxVotes, setMaxVotes] = useState(2);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', description: '' });
  const [resultsVisible, setResultsVisible] = useState(false);
  const [results, setResults] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const totalPoints = useMemo(
    () => (results?.totalPoints ?? ideas.reduce((sum, idea) => sum + (idea.voteScore || 0), 0)),
    [ideas, results]
  );
  const topIdeas = useMemo(() => {
    const source = results?.ideas || ideas;
    const sorted = [...source].sort((a, b) => (b.voteScore || 0) - (a.voteScore || 0));
    return sorted.slice(0, 3);
  }, [ideas, results]);

  const loadIdeas = async () => {
    setLoading(true);
    setError('');
    setResults(null);
    setResultsVisible(false);
    try {
      const data = await fetchIdeas(hackathonId);
      setIdeas(data.ideas || []);
      setVotesUsed(data.votesUsed || 0);
      setMaxVotes(data.maxVotes || 3);
    } catch (err) {
      setError(err.message || 'Failed to load ideas');
    } finally {
      setLoading(false);
    }
  };

  const isExpanded = showToggle ? expanded : true;

  useEffect(() => {
    if (isExpanded) loadIdeas();
  }, [isExpanded, hackathonId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Please enter an idea title');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await submitIdea(hackathonId, {
        title: form.title.trim(),
        description: form.description.trim()
      });
      setForm({ title: '', description: '' });
      await loadIdeas();
    } catch (err) {
      setError(err.message || 'Failed to submit idea');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (ideaId, rank) => {
    setVotingId(ideaId);
    setError('');
    try {
      await voteIdea(hackathonId, ideaId, rank);
      await loadIdeas();
    } catch (err) {
      setError(err.message || 'Failed to vote');
    } finally {
      setVotingId(null);
    }
  };

  const handleCalculateResults = async () => {
    setCalculating(true);
    setError('');
    try {
      const data = await fetchIdeaResults(hackathonId);
      setResults(data);
      setResultsVisible(true);
    } catch (err) {
      setError(err.message || 'Failed to calculate results');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="idea-voting-card">
      {showToggle && (
        <button
          type="button"
          className="idea-voting-toggle"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <span className="idea-voting-title">🧠 Anonymous Idea Voting</span>
          <span className="idea-voting-meta">
            Votes: {votesUsed}/{maxVotes}
          </span>
          <span className={`idea-voting-chevron ${expanded ? 'open' : ''}`}>▾</span>
        </button>
      )}

      {isExpanded && (
        <div className="idea-voting-body">
          {error && <div className="idea-voting-error">⚠️ {error}</div>}

          <div className="idea-voting-grid">
            <div className="idea-submit">
              <h5>Submit Ideas</h5>
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  placeholder="Idea title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  maxLength={120}
                  disabled={submitting}
                />
                <textarea
                  placeholder="Short description (optional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={500}
                  rows={2}
                  disabled={submitting}
                />
                <button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Idea'}
                </button>
              </form>
            </div>

            <div className="idea-list">
              <h5>Ideas</h5>
              {loading ? (
                <p className="idea-muted">Loading ideas…</p>
              ) : ideas.length === 0 ? (
                <p className="idea-muted">No ideas yet. Be the first!</p>
              ) : (
                ideas.map((idea) => {
                  const voteDisabled = idea.isOwner || idea.hasVoted || votesUsed >= maxVotes;
                  const nextRank = votesUsed >= 1 ? 2 : 1;
                  const pointsLabel = nextRank === 1 ? '10 pts' : '5 pts';
                  return (
                    <div key={idea.id} className="idea-row">
                      <div className="idea-content">
                        <div className="idea-title">{idea.title}</div>
                        {idea.description && <div className="idea-desc">{idea.description}</div>}
                      </div>
                      <div className="idea-actions">
                        <span className="idea-votes">
                          {idea.voteScore || 0} pts ({idea.voteCount} vote{idea.voteCount === 1 ? '' : 's'})
                        </span>
                        <button
                          type="button"
                          className="idea-vote-btn"
                          onClick={() => handleVote(idea.id, nextRank)}
                          disabled={voteDisabled || votingId === idea.id}
                          title={idea.isOwner ? 'Cannot vote for your own idea' : undefined}
                        >
                          {idea.hasVoted
                            ? 'Voted'
                            : votingId === idea.id
                              ? 'Voting…'
                              : `Vote (${pointsLabel})`}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="idea-results">
            <div className="idea-results-header">
              <strong>Results</strong>
              <div className="idea-results-actions">
                <button
                  type="button"
                  className="idea-results-btn"
                  onClick={handleCalculateResults}
                  disabled={calculating || ideas.length === 0}
                >
                  {calculating ? 'Calculating…' : 'Calculate Results'}
                </button>
                {resultsVisible && (
                  <span className="idea-muted">Total points: {totalPoints}</span>
                )}
              </div>
            </div>
            {!resultsVisible ? (
              <p className="idea-muted">Run “Calculate Results” to see the winner.</p>
            ) : (results?.ideas?.length || ideas.length) === 0 ? (
              <p className="idea-muted">No results yet.</p>
            ) : (
              <ol className="idea-results-list">
                {topIdeas.map((idea, index) => (
                  <li key={idea.id}>
                    <span className="idea-title">{idea.title}</span>
                    <span className="idea-votes">
                      {idea.voteScore || 0} pts ({idea.voteCount} vote{idea.voteCount === 1 ? '' : 's'})
                    </span>
                    {index === 0 && (idea.voteScore || 0) > 0 && (
                      <span className="idea-winner">Winner</span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IdeaVotingCard;
