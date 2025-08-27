// Google Calendar API integration
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '507618059169-vp8etph9vp3g7dod8tp822fc6frj130i.apps.googleusercontent.com';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar';

class GoogleCalendarService {
  constructor() {
    this.gapi = null;
    this.isInitialized = false;
    this.isSignedIn = false;
  }

  // Initialize Google API
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load Google API
      await this.loadGoogleAPI();
      
      // Initialize gapi
      await new Promise((resolve, reject) => {
        this.gapi.load('client:auth2', async () => {
          try {
            await this.gapi.client.init({
              clientId: GOOGLE_CLIENT_ID,
              discoveryDocs: [DISCOVERY_DOC],
              scope: SCOPES
            });

            this.isInitialized = true;
            this.isSignedIn = this.gapi.auth2.getAuthInstance().isSignedIn.get();
            console.log('✅ Google Calendar API initialized');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('❌ Google Calendar API initialization failed:', error);
      throw error;
    }
  }

  // Load Google API script
  loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        this.gapi = window.gapi;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        this.gapi = window.gapi;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Sign in to Google
  async signIn() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      await authInstance.signIn();
      this.isSignedIn = true;
      console.log('✅ Google Calendar signed in');
      return true;
    } catch (error) {
      console.error('❌ Google Calendar sign in failed:', error);
      throw error;
    }
  }

  // Sign out from Google
  async signOut() {
    if (!this.isInitialized) return;

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      this.isSignedIn = false;
      console.log('✅ Google Calendar signed out');
    } catch (error) {
      console.error('❌ Google Calendar sign out failed:', error);
      throw error;
    }
  }

  // Create calendar event from hackathon
  async createHackathonEvent(hackathon) {
    if (!this.isSignedIn) {
      await this.signIn();
    }

    try {
      const event = {
        summary: `🏆 ${hackathon.name}`,
        description: `Hackathon on ${hackathon.platform}\nTeam: ${hackathon.team}\nRounds: ${hackathon.rounds}`,
        start: {
          dateTime: new Date(hackathon.date).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(new Date(hackathon.date).getTime() + 24 * 60 * 60 * 1000).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        colorId: this.getColorByStatus(hackathon.status)
      };

      const response = await this.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event
      });

      console.log('✅ Calendar event created:', response.result);
      return response.result;
    } catch (error) {
      console.error('❌ Failed to create calendar event:', error);
      throw error;
    }
  }

  // Update calendar event
  async updateHackathonEvent(eventId, hackathon) {
    if (!this.isSignedIn) {
      await this.signIn();
    }

    try {
      const event = {
        summary: `🏆 ${hackathon.name}`,
        description: `Hackathon on ${hackathon.platform}\nTeam: ${hackathon.team}\nRounds: ${hackathon.rounds}\nStatus: ${hackathon.status}`,
        start: {
          dateTime: new Date(hackathon.date).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(new Date(hackathon.date).getTime() + 24 * 60 * 60 * 1000).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        colorId: this.getColorByStatus(hackathon.status)
      };

      const response = await this.gapi.client.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: event
      });

      console.log('✅ Calendar event updated:', response.result);
      return response.result;
    } catch (error) {
      console.error('❌ Failed to update calendar event:', error);
      throw error;
    }
  }

  // Delete calendar event
  async deleteHackathonEvent(eventId) {
    if (!this.isSignedIn) {
      await this.signIn();
    }

    try {
      await this.gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });

      console.log('✅ Calendar event deleted');
      return true;
    } catch (error) {
      console.error('❌ Failed to delete calendar event:', error);
      throw error;
    }
  }

  // Get color by hackathon status
  getColorByStatus(status) {
    const colors = {
      'Planning': '7', // Blue
      'Participating': '9', // Purple
      'Won': '10', // Green
      'Qualified': '5', // Yellow
      "Didn't qualify": '11' // Red
    };
    return colors[status] || '1'; // Default
  }

  // Check if signed in
  isUserSignedIn() {
    return this.isSignedIn;
  }
}

export default new GoogleCalendarService();