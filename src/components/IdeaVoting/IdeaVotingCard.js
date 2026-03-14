import React, { useEffect, useMemo, useState } from 'react';
import { fetchIdeas, submitIdea, voteIdea } from '../../utils/ideaVotingApi';
import './IdeaVoting.css';

const IdeaVotingCard = ({ hackathonId }) => {
  const [expanded, setExpanded] = useState(false);
  const [ideas, setIdeas] = useState([]);
  const [votesUsed, setVotesUsed] = useState(0);
  const [maxVotes, setMaxVotes] = useState(3);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', description: '' });

  const ideasSubmitted = useMemo(
    () => ideas.filter((idea) => idea.isOwner).length,
    [ideas]
  );

  const loadIdeas = async () => {
    setLoading(true);
    setError('');
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

  useEffect(() => {
    if (expanded) loadIdeas();
  }, [expanded, hackathonId]);

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

  const handleVote = async (ideaId) => {
    setVotingId(ideaId);
    setError('');
    try {
      await voteIdea(hackathonId, ideaId);
      await loadIdeas();
    } catch (err) {
      setError(err.message || 'Failed to vote');
    } finally {
      setVotingId(null);
    }
  };

  return (
    <div className="idea-voting-card">
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

      {expanded && (
        <div className="idea-voting-body">
          {error && <div className="idea-voting-error">⚠️ {error}</div>}

          <div className="idea-voting-grid">
            <div className="idea-submit">
              <h5>Submit Ideas ({ideasSubmitted}/2)</h5>
              {ideasSubmitted >= 2 ? (
                <p className="idea-muted">You have used all idea slots.</p>
              ) : (
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
              )}
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
                  return (
                    <div key={idea.id} className="idea-row">
                      <div className="idea-content">
                        <div className="idea-title">{idea.title}</div>
                        {idea.description && <div className="idea-desc">{idea.description}</div>}
                      </div>
                      <div className="idea-actions">
                        <span className="idea-votes">{idea.voteCount} vote{idea.voteCount === 1 ? '' : 's'}</span>
                        <button
                          type="button"
                          className="idea-vote-btn"
                          onClick={() => handleVote(idea.id)}
                          disabled={voteDisabled || votingId === idea.id}
                          title={idea.isOwner ? 'Cannot vote for your own idea' : undefined}
                        >
                          {idea.hasVoted ? 'Voted' : votingId === idea.id ? 'Voting…' : 'Vote'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdeaVotingCard;
