import React, { useEffect, useState } from 'react';
import { fetchIdeas } from '../../utils/ideaVotingApi';
import './IdeaVoting.css';

const IdeaVotingHistory = ({ hackathonId }) => {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadIdeas = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchIdeas(hackathonId);
      const sorted = [...(data.ideas || [])].sort(
        (a, b) => b.voteCount - a.voteCount
      );
      setIdeas(sorted);
    } catch (err) {
      setError(err.message || 'Failed to load idea history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIdeas();
  }, [hackathonId]);

  return (
    <div className="idea-history">
      <div className="idea-history-header">
        <strong>Idea Voting History</strong>
        <button type="button" onClick={loadIdeas} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {error && <div className="idea-voting-error">⚠️ {error}</div>}
      {loading && ideas.length === 0 ? (
        <p className="idea-muted">Loading ideas…</p>
      ) : ideas.length === 0 ? (
        <p className="idea-muted">No ideas yet.</p>
      ) : (
        <ul className="idea-history-list">
          {ideas.map((idea) => (
            <li key={idea.id}>
              <span className="idea-title">{idea.title}</span>
              <span className="idea-votes">{idea.voteCount} vote{idea.voteCount === 1 ? '' : 's'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default IdeaVotingHistory;
