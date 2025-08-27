import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Header from './Header';

export default {
  title: 'Components/Header',
  component: Header,
  decorators: [
    (Story) => (
      <BrowserRouter>
        <Story />
      </BrowserRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {},
};

export const WithActiveCalendar = {
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div style={{ padding: '0' }}>
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
  parameters: {
    initialRoute: '/',
  },
};

export const WithActiveDashboard = {
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div style={{ padding: '0' }}>
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
  parameters: {
    initialRoute: '/dashboard',
  },
};

export const WithActiveAddHackathon = {
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div style={{ padding: '0' }}>
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
  parameters: {
    initialRoute: '/add-hackathon',
  },
};
