import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import CalendarView from './CalendarView';

export default {
  title: 'Components/CalendarView',
  component: CalendarView,
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

export const WithMockData = {
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
        }
      ]
    }
  }
};

export const EmptyCalendar = {
  args: {},
  parameters: {
    mockData: {
      hackathons: []
    }
  }
};

export const SingleHackathon = {
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
        }
      ]
    }
  }
};
