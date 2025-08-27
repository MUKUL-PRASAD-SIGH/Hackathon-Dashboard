import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

export default {
  title: 'Components/Dashboard',
  component: Dashboard,
  decorators: [
    (Story) => (
      <BrowserRouter>
        <Story />
      </BrowserRouter>
    ),
  ],
  parameters: {
    layout: 'padded',
  },
};

export const Default = {
  args: {},
};

export const WithFilters = {
  args: {},
  parameters: {
    mockData: {
      filters: {
        platform: 'Devpost',
        team: 'Solo',
        status: 'Participating'
      }
    }
  }
};

export const WithSearch = {
  args: {},
  parameters: {
    mockData: {
      searchTerm: 'HackTheMountains'
    }
  }
};

export const EmptyResults = {
  args: {},
  parameters: {
    mockData: {
      hackathons: []
    }
  }
};

export const MultipleStatuses = {
  args: {},
  parameters: {
    mockData: {
      hackathons: [
        {
          id: 1,
          name: "HackTheMountains",
          platform: "Devpost",
          email: "youremail@example.com",
          team: "Solo",
          date: "2025-09-20",
          rounds: 3,
          remarks: { 
            round1: "Registration open", 
            round2: "Project submission", 
            round3: "Final presentation" 
          },
          status: "Participating",
          notifications: [
            { trigger: "2 days before" },
            { trigger: "1 hour before" },
            { trigger: "before each round" }
          ]
        },
        {
          id: 2,
          name: "CodeFest 2025",
          platform: "HackerEarth",
          email: "youremail@example.com",
          team: "Team",
          date: "2025-10-15",
          rounds: 2,
          remarks: { 
            round1: "Online qualifier", 
            round2: "Onsite final" 
          },
          status: "Planning",
          notifications: [
            { trigger: "1 day before" },
            { trigger: "30 minutes before" }
          ]
        },
        {
          id: 3,
          name: "InnovateTech",
          platform: "Devpost",
          email: "youremail@example.com",
          team: "Solo",
          date: "2025-08-30",
          rounds: 1,
          remarks: { 
            round1: "Single round competition" 
          },
          status: "Won",
          notifications: [
            { trigger: "1 day before" }
          ]
        },
        {
          id: 4,
          name: "TechCrunch Disrupt",
          platform: "Topcoder",
          email: "youremail@example.com",
          team: "Team",
          date: "2025-11-20",
          rounds: 4,
          remarks: { 
            round1: "Application review", 
            round2: "Video pitch", 
            round3: "Semi-finals", 
            round4: "Finals" 
          },
          status: "Didn't qualify",
          notifications: [
            { trigger: "2 days before" },
            { trigger: "1 hour before" }
          ]
        }
      ]
    }
  }
};
