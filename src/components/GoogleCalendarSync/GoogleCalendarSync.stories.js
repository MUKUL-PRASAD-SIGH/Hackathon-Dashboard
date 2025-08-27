import GoogleCalendarSync from './GoogleCalendarSync';

export default {
  title: 'Components/GoogleCalendarSync',
  component: GoogleCalendarSync,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    onSyncComplete: { action: 'sync-complete' },
  },
};

// Mock hackathon data for stories
const mockHackathons = [
  {
    id: 1,
    name: 'HackTheMountains',
    platform: 'Devpost',
    email: 'test@example.com',
    team: 'Solo',
    date: '2025-01-15',
    rounds: 3,
    status: 'Planning',
    remarks: {
      round1: 'Registration open',
      round2: 'Project submission',
      round3: 'Final presentation'
    },
    notifications: [
      { trigger: '2 days before' },
      { trigger: 'before each round' }
    ]
  },
  {
    id: 2,
    name: 'CodeFest 2025',
    platform: 'HackerEarth',
    email: 'test@example.com',
    team: '2-4 members',
    date: '2025-02-20',
    rounds: 2,
    status: 'Participating',
    remarks: {
      round1: 'Ideation phase',
      round2: 'Development phase'
    },
    notifications: [
      { trigger: '1 hour before' }
    ]
  },
  {
    id: 3,
    name: 'Innovation Challenge',
    platform: 'Devpost',
    email: 'test@example.com',
    team: '5+ members',
    date: '2025-03-10',
    rounds: 4,
    status: 'Won',
    remarks: {
      round1: 'Initial screening',
      round2: 'Prototype development',
      round3: 'Final presentation',
      round4: 'Award ceremony'
    },
    notifications: [
      { trigger: '2 days before' },
      { trigger: 'before each round' }
    ]
  }
];

export const Default = {
  args: {
    hackathons: mockHackathons,
  },
};

export const NoHackathons = {
  args: {
    hackathons: [],
  },
};

export const SingleHackathon = {
  args: {
    hackathons: [mockHackathons[0]],
  },
};

export const MultipleHackathons = {
  args: {
    hackathons: mockHackathons,
  },
};

export const Loading = {
  args: {
    hackathons: mockHackathons,
  },
  parameters: {
    docs: {
      description: {
        story: 'This story shows the component in a loading state. In a real scenario, this would be controlled by the component\'s internal state.',
      },
    },
  },
};
