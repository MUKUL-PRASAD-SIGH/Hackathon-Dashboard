const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildUserProfile,
  scoreHackathon,
  recommendHackathons,
  recommendTeammates
} = require('../services/recommendationEngine');

const NOW = new Date('2026-01-01T00:00:00Z').getTime();
const inDays = (d) => new Date(NOW + d * 86400000).toISOString();

const me = { email: 'me@x.com', profile: { skills: ['React', 'Node'] } };
const history = [
  { name: 'Old Hack', platform: 'Devpost', status: 'Won', team: 'Team' },
  { name: 'Older Hack', platform: 'Devpost', status: 'Participating', team: 'Team' }
];
const profile = buildUserProfile(history, me);

const hack = (over = {}) => ({
  name: 'Cool Hack', platform: 'Devpost', email: 'lead@x.com',
  date: inDays(10), teamMembers: [], maxParticipants: 4, status: 'Planning', ...over
});

test('buildUserProfile counts platforms, wins and team preference', () => {
  assert.equal(profile.platformCounts.Devpost, 2);
  assert.equal(profile.won, 1);
  assert.equal(profile.prefersTeam, true);
  assert.ok(profile.skills.has('react'));
});

test('scoreHackathon excludes own, joined, full, past and already-tracked hackathons', () => {
  assert.equal(scoreHackathon(hack({ email: 'ME@x.com' }), profile, me.email, NOW), null);
  assert.equal(scoreHackathon(hack({ teamMembers: [{ email: 'me@x.com' }] }), profile, me.email, NOW), null);
  assert.equal(scoreHackathon(hack({ maxParticipants: 1 }), profile, me.email, NOW), null);
  assert.equal(scoreHackathon(hack({ date: inDays(-10) }), profile, me.email, NOW), null);
  assert.equal(scoreHackathon(hack({ name: 'old hack' }), profile, me.email, NOW), null);
});

test('platform affinity and timing raise the score', () => {
  const known = scoreHackathon(hack(), profile, me.email, NOW);
  const unknown = scoreHackathon(hack({ platform: 'Topcoder' }), profile, me.email, NOW);
  assert.ok(known.score > unknown.score);
  assert.ok(known.reasons.some(r => r.includes('Devpost')));
});

test('skills in the hackathon title add a bonus', () => {
  const plain = scoreHackathon(hack(), profile, me.email, NOW);
  const skilled = scoreHackathon(hack({ name: 'React Builders' }), profile, me.email, NOW);
  assert.ok(skilled.score > plain.score);
});

test('recommendHackathons sorts by score and honours limit', () => {
  const list = [
    hack({ name: 'A', platform: 'Topcoder' }),
    hack({ name: 'B' }),
    hack({ name: 'C', email: 'me@x.com' })
  ];
  const out = recommendHackathons(list, profile, me.email, { limit: 1, now: NOW });
  assert.equal(out.length, 1);
  assert.equal(out[0].name, 'B');
  assert.equal(typeof out[0].matchScore, 'number');
});

test('recommendTeammates prefers complementary skills and drops self', () => {
  const candidates = [
    { _id: 1, name: 'Clone', email: 'clone@x.com', profile: { skills: ['React', 'Node'] } },
    { _id: 2, name: 'Designer', email: 'des@x.com', profile: { skills: ['Figma', 'UI', 'Branding'] } },
    { _id: 3, name: 'Me', email: 'me@x.com', profile: { skills: ['Go'] } }
  ];
  const out = recommendTeammates(candidates, profile, me.email);
  assert.deepEqual(out.map(o => o.name), ['Designer', 'Clone']);
  assert.ok(out[0].matchReasons[0].startsWith('Brings new skills'));
});

test('friends get a boost', () => {
  const c = { _id: 1, name: 'F', email: 'f@x.com', profile: { skills: ['Go'] } };
  const plain = recommendTeammates([c], profile, me.email)[0];
  const friend = recommendTeammates([c], profile, me.email, { friendEmails: new Set(['f@x.com']) })[0];
  assert.ok(friend.matchScore > plain.matchScore);
});
