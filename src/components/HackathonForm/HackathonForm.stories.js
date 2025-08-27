import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import HackathonForm from './HackathonForm';

export default {
  title: 'Components/HackathonForm',
  component: HackathonForm,
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

export const WithPrefilledData = {
  args: {},
  parameters: {
    mockData: {
      formData: {
        name: "HackTheMountains",
        platform: "Devpost",
        email: "youremail@example.com",
        team: "Solo",
        date: "2025-09-20",
        rounds: 3,
        status: "Planning",
        remarks: {
          round1: "Registration open",
          round2: "Project submission"
        },
        notifications: [
          { trigger: "2 days before" },
          { trigger: "1 hour before" }
        ]
      }
    }
  }
};

export const WithRoundRemarks = {
  args: {},
  parameters: {
    mockData: {
      formData: {
        name: "CodeFest 2025",
        platform: "HackerEarth",
        email: "youremail@example.com",
        team: "Team",
        date: "2025-10-15",
        rounds: 4,
        status: "Planning",
        remarks: {
          round1: "Application review",
          round2: "Video pitch",
          round3: "Semi-finals",
          round4: "Finals"
        },
        notifications: [
          { trigger: "1 day before" },
          { trigger: "30 minutes before" },
          { trigger: "Before each round" }
        ]
      }
    }
  }
};

export const WithNotifications = {
  args: {},
  parameters: {
    mockData: {
      formData: {
        name: "InnovateTech",
        platform: "Devpost",
        email: "youremail@example.com",
        team: "Solo",
        date: "2025-08-30",
        rounds: 2,
        status: "Planning",
        remarks: {
          round1: "Online qualifier",
          round2: "Onsite final"
        },
        notifications: [
          { trigger: "2 days before" },
          { trigger: "12 hours before" },
          { trigger: "1 hour before" },
          { trigger: "Before each round" },
          { trigger: "Custom: 3 days before" }
        ]
      }
    }
  }
};

export const ValidationError = {
  args: {},
  parameters: {
    mockData: {
      showValidationErrors: true
    }
  }
};
