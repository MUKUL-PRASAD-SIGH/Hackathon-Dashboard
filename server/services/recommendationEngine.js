// Pure scoring functions for the recommendation engine. No DB access here so
// everything is unit-testable; routes/recommendations.js feeds in plain objects.

const DAY_MS = 24 * 60 * 60 * 1000;

const normalizeEmail = (email) => (email || '').toLowerCase().trim();
const normalizeSkill = (skill) => (skill || '').toLowerCase().trim();
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const skillSet = (skills) => new Set((skills || []).map(normalizeSkill).filter(Boolean));

/**
 * Summarise a user's tracked hackathons into a taste profile.
 * @param {Array} hackathons the user's own hackathons
 * @param {Object} user      user document (plain) with optional profile.skills
 */
const buildUserProfile = (hackathons = [], user = {}) => {
  const platformCounts = {};
  let won = 0;
  let solo = 0;
  let team = 0;

  for (const h of hackathons) {
    if (h.platform) platformCounts[h.platform] = (platformCounts[h.platform] || 0) + 1;
    if (h.status === 'Won' || h.status === 'Qualified') won += 1;
    if (h.team === 'Solo') solo += 1;
    if (h.team === 'Team') team += 1;
  }

  return {
    skills: skillSet(user.profile && user.profile.skills),
    platformCounts,
    total: hackathons.length,
    won,
    prefersTeam: team >= solo,
    trackedNames: new Set(hackathons.map(h => (h.name || '').toLowerCase().trim()))
  };
};

/**
 * Score one public hackathon (team looking for members) for a user. 0-100.
 * Returns { score, reasons } or null when the hackathon is not a valid pick
 * (own, already joined, full, or in the past).
 */
const scoreHackathon = (hackathon, profile, userEmail, now = Date.now()) => {
  const email = normalizeEmail(userEmail);
  if (normalizeEmail(hackathon.email) === email) return null;

  const members = hackathon.teamMembers || [];
  if (members.some(m => normalizeEmail(m.email) === email)) return null;

  const maxParticipants = hackathon.maxParticipants || 4;
  const teamSize = members.length + 1;
  const openSlots = maxParticipants - teamSize;
  if (openSlots <= 0) return null;

  const ts = new Date(hackathon.date).getTime();
  if (Number.isNaN(ts) || ts < now - DAY_MS) return null;

  const reasons = [];
  let score = 0;

  // Platform affinity: up to 35, saturating after 3 prior hackathons on it
  const prior = profile.platformCounts[hackathon.platform] || 0;
  if (prior > 0) {
    score += Math.min(prior, 3) * (35 / 3);
    reasons.push(`You've done ${prior} hackathon${prior > 1 ? 's' : ''} on ${hackathon.platform}`);
  }

  // Timing: sweet spot is 1-3 weeks out; too soon is hard to prepare for
  const daysAway = (ts - now) / DAY_MS;
  if (daysAway >= 7 && daysAway <= 21) {
    score += 25;
    reasons.push('Starts in the ideal 1-3 week prep window');
  } else if (daysAway > 21 && daysAway <= 60) {
    score += 15;
    reasons.push('Plenty of time to prepare');
  } else if (daysAway >= 2 && daysAway < 7) {
    score += 10;
    reasons.push('Starting soon');
  } else if (daysAway > 60) {
    score += 5;
  }

  // Team room: more open slots means a higher chance of being accepted
  score += clamp(openSlots, 1, 3) * (20 / 3);
  reasons.push(`${openSlots} open slot${openSlots > 1 ? 's' : ''} on the team`);

  // Skills mentioned in the hackathon title
  const name = (hackathon.name || '').toLowerCase();
  const matched = [...profile.skills].filter(s => s.length > 1 && name.includes(s));
  if (matched.length) {
    score += Math.min(matched.length, 2) * 7.5;
    reasons.push(`Matches your skills: ${matched.join(', ')}`);
  }

  // Active/planning teams are more likely to answer join requests
  if (hackathon.status === 'Planning' || hackathon.status === 'Participating') score += 5;

  // Already tracking something with this exact name? Not a fresh suggestion.
  if (profile.trackedNames.has((hackathon.name || '').toLowerCase().trim())) return null;

  return { score: Math.round(clamp(score, 0, 100)), reasons };
};

/**
 * Rank hackathons for a user, highest score first.
 */
const recommendHackathons = (hackathons, profile, userEmail, { limit = 6, now = Date.now() } = {}) =>
  hackathons
    .map(h => ({ hackathon: h, match: scoreHackathon(h, profile, userEmail, now) }))
    .filter(r => r.match)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, limit)
    .map(r => ({ ...r.hackathon, matchScore: r.match.score, matchReasons: r.match.reasons }));

const EXPERIENCE_RANK = { beginner: 1, intermediate: 2, expert: 3, advanced: 3 };

/**
 * Score a candidate teammate for a user. 0-100. Complementary skills score
 * higher than duplicates: a team needs coverage, not clones.
 */
const scoreTeammate = (candidate, profile, { friendEmails = new Set(), candidateWins = 0 } = {}) => {
  const theirSkills = skillSet(candidate.profile && candidate.profile.skills);
  const reasons = [];
  let score = 0;

  const shared = [...theirSkills].filter(s => profile.skills.has(s));
  const complementary = [...theirSkills].filter(s => !profile.skills.has(s));

  if (complementary.length) {
    score += Math.min(complementary.length, 4) * 10;
    reasons.push(`Brings new skills: ${complementary.slice(0, 4).join(', ')}`);
  }
  if (shared.length) {
    score += Math.min(shared.length, 2) * 5;
    reasons.push(`Shares your ${shared.slice(0, 2).join(', ')}`);
  }

  const exp = EXPERIENCE_RANK[(candidate.profile && candidate.profile.experience || '').toLowerCase().trim()];
  if (exp) {
    score += exp * 5;
    if (exp === 3) reasons.push('Experienced hacker');
  }

  if (candidateWins > 0) {
    score += Math.min(candidateWins, 3) * 5;
    reasons.push(`${candidateWins} hackathon win${candidateWins > 1 ? 's' : ''}`);
  }

  if (candidate.profile && (candidate.profile.github || candidate.profile.portfolio)) {
    score += 5;
    reasons.push('Has public work to review');
  }

  if (friendEmails.has(normalizeEmail(candidate.email))) {
    score += 10;
    reasons.push('Already in your friends list');
  }

  return { score: Math.round(clamp(score, 0, 100)), reasons };
};

const recommendTeammates = (candidates, profile, userEmail, { friendEmails = new Set(), limit = 6 } = {}) => {
  const self = normalizeEmail(userEmail);
  return candidates
    .filter(c => normalizeEmail(c.email) !== self)
    .map(c => ({ candidate: c, match: scoreTeammate(c, profile, { friendEmails, candidateWins: c.hackathonsWon || 0 }) }))
    .filter(r => r.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, limit)
    .map(({ candidate, match }) => ({
      id: String(candidate._id),
      name: candidate.name,
      email: candidate.email,
      skills: (candidate.profile && candidate.profile.skills) || [],
      experience: (candidate.profile && candidate.profile.experience) || '',
      bio: (candidate.profile && candidate.profile.bio) || '',
      avatar: (candidate.profile && candidate.profile.avatar) || '',
      matchScore: match.score,
      matchReasons: match.reasons
    }));
};

module.exports = {
  buildUserProfile,
  scoreHackathon,
  recommendHackathons,
  scoreTeammate,
  recommendTeammates
};
