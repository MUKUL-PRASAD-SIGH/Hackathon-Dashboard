import { parseQuery, filterHackathons, filterPeople, isEmptyFilter, describeFilter } from './aiFilter';

// Wednesday 2026-01-14
const NOW = new Date(2026, 0, 14, 10, 0, 0);
const d = (y, m, day) => new Date(y, m, day, 12).toISOString();

const hackathons = [
  { _id: '1', name: 'AI Sprint', platform: 'Devpost', status: 'Planning', team: 'Team', date: d(2026, 1, 10), teamMembers: [], maxParticipants: 4 },
  { _id: '2', name: 'Web3 Jam', platform: 'HackerEarth', status: 'Won', team: 'Solo', date: d(2025, 11, 1), teamMembers: [] },
  { _id: '3', name: 'Full House', platform: 'Devpost', status: 'Participating', team: 'Team', date: d(2026, 0, 16),
    teamMembers: [{ name: 'a', email: 'a@x.com' }, { name: 'b', email: 'b@x.com' }, { name: 'c', email: 'c@x.com' }], maxParticipants: 4 },
  { _id: '4', name: 'Rust Rally', platform: 'Topcoder', status: 'Planning', team: 'Solo', date: d(2026, 0, 20), teamMembers: [] }
];

describe('parseQuery', () => {
  test('empty query yields an empty filter', () => {
    expect(isEmptyFilter(parseQuery('', NOW))).toBe(true);
    expect(isEmptyFilter(parseQuery('   ', NOW))).toBe(true);
  });

  test('extracts platform, status and keywords', () => {
    const f = parseQuery('show my devpost hackathons that I won about AI', NOW);
    expect(f.platform).toBe('Devpost');
    expect(f.status).toBe('Won');
    expect(f.keywords).toEqual(['ai']);
  });

  test('handles relative date windows', () => {
    const nm = parseQuery('next month', NOW).dateRange;
    expect(nm.from).toEqual(new Date(2026, 1, 1));
    expect(nm.to).toEqual(new Date(2026, 2, 1));
    const week = parseQuery('this week', NOW).dateRange;
    expect(week.from).toEqual(new Date(2026, 0, 12));
    const n = parseQuery('in 10 days', NOW).dateRange;
    expect(n.to).toEqual(new Date(2026, 0, 25));
  });

  test('detects solo, open slots and sort order', () => {
    expect(parseQuery('solo', NOW).team).toBe('Solo');
    expect(parseQuery('teams with open slots', NOW).openSlots).toBe(true);
    expect(parseQuery('teams with open slots', NOW).team).toBeNull();
    expect(parseQuery('earliest upcoming', NOW).sort).toBe('date-asc');
  });

  test('describeFilter summarises what was understood', () => {
    expect(describeFilter(parseQuery('devpost planning', NOW))).toBe('platform: Devpost · status: Planning');
    expect(describeFilter(parseQuery('', NOW))).toBe('');
  });
});

describe('filterHackathons', () => {
  const run = (q) => filterHackathons(hackathons, parseQuery(q, NOW)).map(h => h._id);

  test('no filter returns the original list', () => {
    expect(filterHackathons(hackathons, parseQuery('', NOW))).toBe(hackathons);
  });
  test('platform + status', () => {
    expect(run('devpost planning')).toEqual(['1']);
    expect(run('won')).toEqual(['2']);
  });
  test('date windows', () => {
    expect(run('next month')).toEqual(['1']);
    expect(run('this week')).toEqual(['3']);
    expect(run('past')).toEqual(['2']);
  });
  test('solo filter', () => {
    expect(run('solo')).toEqual(['2', '4']);
  });
  test('open slots excludes full teams', () => {
    expect(run('devpost with open slots')).toEqual(['1']);
  });
  test('keywords must all match', () => {
    expect(run('rust')).toEqual(['4']);
    expect(run('rust web3')).toEqual([]);
  });
  test('upcoming sorted soonest first', () => {
    expect(run('upcoming soonest')).toEqual(['3', '4', '1']);
  });
});

describe('filterPeople', () => {
  const people = [
    { name: 'Ana', skills: ['React', 'Figma'], experience: 'Expert' },
    { name: 'Bo', skills: ['Python'], experience: 'Beginner', bio: 'ML fan' }
  ];
  test('matches skills and experience', () => {
    expect(filterPeople(people, parseQuery('react expert', NOW)).map(p => p.name)).toEqual(['Ana']);
    expect(filterPeople(people, parseQuery('beginner', NOW)).map(p => p.name)).toEqual(['Bo']);
    expect(filterPeople(people, parseQuery('python ml', NOW)).map(p => p.name)).toEqual(['Bo']);
  });
});
