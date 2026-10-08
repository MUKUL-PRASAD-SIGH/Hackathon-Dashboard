// "AI filter": turns a natural-language query such as
//   "devpost hackathons next month with open slots"
// into structured filters, then applies them to a list. It is a local,
// deterministic parser so it is instant, works offline and needs no API key.

const DAY_MS = 24 * 60 * 60 * 1000;

const PLATFORMS = ['Devpost', 'HackerEarth', 'Topcoder', 'CodeChef', 'HackerRank'];

const STATUS_PATTERNS = [
  [/\b(didn'?t qualify|did not qualify|lost|rejected|eliminated)\b/, "Didn't qualify"],
  [/\b(won|winner|winning|victories|victory)\b/, 'Won'],
  [/\bqualified\b/, 'Qualified'],
  [/\b(participating|ongoing|in progress|active|running)\b/, 'Participating'],
  [/\b(planning|planned|plan)\b/, 'Planning']
];

const EXPERIENCE_PATTERNS = [
  [/\b(beginner|beginners|newbie|junior)\b/, 'beginner'],
  [/\b(intermediate|mid)\b/, 'intermediate'],
  [/\b(expert|experts|senior|advanced|experienced)\b/, 'expert']
];

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'with', 'without', 'for', 'of', 'in', 'on', 'at', 'to', 'me', 'my',
  'show', 'find', 'list', 'get', 'give', 'all', 'any', 'hackathon', 'hackathons', 'hack', 'hacks',
  'event', 'events', 'people', 'person', 'users', 'user', 'teammate', 'teammates', 'members',
  'that', 'are', 'is', 'have', 'has', 'who', 'which', 'i', 'want', 'need', 'looking', 'by',
  'from', 'them', 'those', 'these', 'some', 'only', 'just', 'please', 'slot', 'slots', 'space',
  'open', 'full', 'not', 'team', 'teams', 'solo', 'about', 'related', 'around', 'like', 'using', 'based', 'where', 'what', 'when', 'do', 'does', 'can', 'could', 'would', 'should', 'be', 'been', 'was', 'were', 'it', 'its', 'this', 'next', 'week', 'weeks', 'month', 'months', 'day', 'days', 'many', 'more', 'most', 'top', 'best'
]);

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d, n) => new Date(d.getTime() + n * DAY_MS);

const mondayOf = (d) => {
  const x = startOfDay(d);
  const diff = (x.getDay() + 6) % 7;
  return addDays(x, -diff);
};

const UNIT_DAYS = { day: 1, days: 1, week: 7, weeks: 7, month: 30, months: 30 };

/**
 * Detect a date window in the query. Returns { from, to, label, consumed }
 * where from/to are Date|null (null = open ended) and consumed is the matched text.
 */
const parseDateRange = (text, now) => {
  const today = startOfDay(now);
  const rules = [
    [/\btoday\b/, () => [today, addDays(today, 1), 'today']],
    [/\btomorrow\b/, () => [addDays(today, 1), addDays(today, 2), 'tomorrow']],
    [/\bthis week(end)?\b/, () => {
      const start = mondayOf(today);
      return [start, addDays(start, 7), 'this week'];
    }],
    [/\bnext week\b/, () => {
      const start = addDays(mondayOf(today), 7);
      return [start, addDays(start, 7), 'next week'];
    }],
    [/\bthis month\b/, () => [
      new Date(today.getFullYear(), today.getMonth(), 1),
      new Date(today.getFullYear(), today.getMonth() + 1, 1),
      'this month'
    ]],
    [/\bnext month\b/, () => [
      new Date(today.getFullYear(), today.getMonth() + 1, 1),
      new Date(today.getFullYear(), today.getMonth() + 2, 1),
      'next month'
    ]],
    [/\b(?:in|within|next)\s+(\d{1,3})\s+(days?|weeks?|months?)\b/, (m) => {
      const span = parseInt(m[1], 10) * UNIT_DAYS[m[2]];
      return [today, addDays(today, span + 1), `next ${m[1]} ${m[2]}`];
    }],
    [/\b(upcoming|future|soon|coming up)\b/, () => [today, null, 'upcoming']],
    [/\b(past|previous|finished|completed|old|earlier|ended)\b/, () => [null, today, 'past']]
  ];

  for (const [re, build] of rules) {
    const m = text.match(re);
    if (m) {
      const [from, to, label] = build(m);
      return { from, to, label, consumed: m[0] };
    }
  }
  return null;
};

/**
 * Parse free text into a structured filter object.
 * @param {string} query
 * @param {Date} [now]
 */
export const parseQuery = (query, now = new Date()) => {
  const original = (query || '').trim();
  let text = original.toLowerCase();
  const filter = {
    platform: null,
    status: null,
    team: null,
    experience: null,
    dateRange: null,
    openSlots: false,
    sort: null,
    keywords: [],
    summary: []
  };
  if (!text) return filter;

  const consume = (fragment) => {
    text = text.replace(fragment, ' ');
  };

  const platform = PLATFORMS.find(p => text.includes(p.toLowerCase()));
  if (platform) {
    filter.platform = platform;
    filter.summary.push(`platform: ${platform}`);
    consume(platform.toLowerCase());
  }

  for (const [re, status] of STATUS_PATTERNS) {
    const m = text.match(re);
    if (m) {
      filter.status = status;
      filter.summary.push(`status: ${status}`);
      consume(m[0]);
      break;
    }
  }

  for (const [re, level] of EXPERIENCE_PATTERNS) {
    const m = text.match(re);
    if (m) {
      filter.experience = level;
      filter.summary.push(`experience: ${level}`);
      consume(m[0]);
      break;
    }
  }

  if (/\bsolo\b/.test(text)) {
    filter.team = 'Solo';
    filter.summary.push('format: solo');
  } else if (/\b(team|teams|group)\b/.test(text) && !/\bteam\s*(size|member)/.test(text)
    && !/\b(open|free|space|slots?|room|vacanc\w*|not full)\b/.test(text)) {
    filter.team = 'Team';
    filter.summary.push('format: team');
  }

  if (/\b(open slots?|free slots?|slots? (open|available|left)|has (space|room)|with (space|room)|not full|vacanc\w*|looking for (members|teammates)|spots? (open|available|left)|available spots?)\b/.test(text)) {
    filter.openSlots = true;
    filter.summary.push('has open slots');
    consume(/open slots?|free slots?|slots? (open|available|left)|has (space|room)|with (space|room)|not full|vacanc\w*|looking for (members|teammates)|spots? (open|available|left)|available spots?/);
  }

  const range = parseDateRange(text, now);
  if (range) {
    filter.dateRange = { from: range.from, to: range.to, label: range.label };
    filter.summary.push(`when: ${range.label}`);
    consume(range.consumed);
  }

  if (/\b(soonest|earliest|nearest|closest)\b/.test(text)) {
    filter.sort = 'date-asc';
    filter.summary.push('sorted: soonest first');
  } else if (/\b(latest|newest|furthest|most recent)\b/.test(text)) {
    filter.sort = 'date-desc';
    filter.summary.push('sorted: latest first');
  }

  filter.keywords = text
    .replace(/\b(soonest|earliest|nearest|closest|latest|newest|furthest|most recent)\b/g, ' ')
    .split(/[^a-z0-9+#.]+/)
    .map(w => w.replace(/^\.+|\.+$/g, ''))
    .filter(w => w.length > 1 && !STOPWORDS.has(w));

  if (filter.keywords.length) filter.summary.push(`keywords: ${filter.keywords.join(', ')}`);
  return filter;
};

export const isEmptyFilter = (f) => !f || (
  !f.platform && !f.status && !f.team && !f.experience && !f.dateRange &&
  !f.openSlots && !f.sort && f.keywords.length === 0
);

const haystackOfHackathon = (h) => [
  h.name, h.platform, h.status, h.team, h.email,
  ...(h.teamMembers || []).flatMap(m => [m.name, m.email, m.role]),
  ...Object.values(h.remarks && typeof h.remarks === 'object' ? h.remarks : {})
].filter(Boolean).join(' ').toLowerCase();

const inRange = (dateValue, range) => {
  if (!range) return true;
  const t = new Date(dateValue).getTime();
  if (Number.isNaN(t)) return false;
  if (range.from && t < range.from.getTime()) return false;
  if (range.to && t >= range.to.getTime()) return false;
  return true;
};

const sortByDate = (list, sort, dateOf) => {
  if (!sort) return list;
  const dir = sort === 'date-desc' ? -1 : 1;
  return [...list].sort((a, b) => (new Date(dateOf(a)) - new Date(dateOf(b))) * dir);
};

/**
 * Apply a parsed filter to hackathons (own list or public worlds).
 */
export const filterHackathons = (hackathons, filter) => {
  if (isEmptyFilter(filter)) return hackathons;

  const result = hackathons.filter(h => {
    if (filter.platform && h.platform !== filter.platform) return false;
    if (filter.status && h.status !== filter.status) return false;
    if (filter.team && h.team && h.team !== filter.team) return false;
    if (!inRange(h.date, filter.dateRange)) return false;
    if (filter.openSlots) {
      const size = (h.teamMembers ? h.teamMembers.length : 0) + 1;
      if (size >= (h.maxParticipants || 4)) return false;
    }
    if (filter.keywords.length) {
      const hay = haystackOfHackathon(h);
      if (!filter.keywords.every(k => hay.includes(k))) return false;
    }
    return true;
  });

  return sortByDate(result, filter.sort, h => h.date);
};

/**
 * Apply a parsed filter to teammate recommendations / user profiles.
 * Matches against skills, name, bio and experience.
 */
export const filterPeople = (people, filter) => {
  if (isEmptyFilter(filter)) return people;
  return people.filter(p => {
    if (filter.experience && (p.experience || '').toLowerCase() !== filter.experience) return false;
    if (filter.keywords.length) {
      const hay = [p.name, p.email, p.bio, p.experience, ...(p.skills || [])]
        .filter(Boolean).join(' ').toLowerCase();
      if (!filter.keywords.every(k => hay.includes(k))) return false;
    }
    return true;
  });
};

export const describeFilter = (filter) =>
  isEmptyFilter(filter) ? '' : filter.summary.join(' · ');
