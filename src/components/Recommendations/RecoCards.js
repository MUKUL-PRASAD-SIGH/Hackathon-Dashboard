import React from 'react';
import { Link } from 'react-router-dom';
import Recommendations, { MatchBadge, MatchReasons } from './Recommendations';
import { getRecommendedHackathons, getRecommendedTeammates } from '../../utils/recommendationApi';

export const HackathonRecoCard = ({ hackathon, onAction, actionLabel = 'View team' }) => {
  const openSlots = (hackathon.maxParticipants || 4) - ((hackathon.teamMembers || []).length + 1);
  return (
    <article className="reco-card">
      <div className="reco-card-head">
        <h4 className="reco-card-name">{hackathon.name}</h4>
        <MatchBadge score={hackathon.matchScore} />
      </div>
      <span className="reco-card-meta">
        {hackathon.platform} · {new Date(hackathon.date).toLocaleDateString()} · {openSlots} open slot{openSlots === 1 ? '' : 's'}
      </span>
      <MatchReasons reasons={hackathon.matchReasons} />
      <button type="button" className="reco-action" onClick={() => onAction(hackathon)}>
        {actionLabel}
      </button>
    </article>
  );
};

export const TeammateRecoCard = ({ person }) => (
  <article className="reco-card">
    <div className="reco-card-head">
      <h4 className="reco-card-name">{person.name}</h4>
      <MatchBadge score={person.matchScore} />
    </div>
    {person.experience && <span className="reco-card-meta">{person.experience}</span>}
    {person.skills.length > 0 && (
      <div className="reco-skills">
        {person.skills.slice(0, 5).map(s => <span key={s} className="reco-skill">{s}</span>)}
      </div>
    )}
    <MatchReasons reasons={person.matchReasons} />
    <Link to={`/profile/${person.id}`} className="reco-action">View profile</Link>
  </article>
);

export const RecommendedHackathons = ({ onAction, actionLabel, refreshKey }) => (
  <Recommendations
    title="Recommended hackathons for you"
    subtitle="Open teams ranked by your platform history, timing and skills"
    load={() => getRecommendedHackathons(6)}
    refreshKey={refreshKey}
    emptyText="No open teams match you yet. Add hackathons or check back when teams go public."
    renderItem={h => (
      <HackathonRecoCard key={h._id} hackathon={h} onAction={onAction} actionLabel={actionLabel} />
    )}
  />
);

export const RecommendedTeammates = ({ refreshKey }) => (
  <Recommendations
    title="Teammates you might click with"
    subtitle="Public profiles whose skills complement yours"
    load={() => getRecommendedTeammates(6)}
    refreshKey={refreshKey}
    emptyText="No public profiles yet. Make yours public from your profile to appear here too."
    renderItem={p => <TeammateRecoCard key={p.id} person={p} />}
  />
);
