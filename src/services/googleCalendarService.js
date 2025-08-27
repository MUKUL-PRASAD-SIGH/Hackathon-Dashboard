// Google Calendar Integration Service for Version 1.1.0
// This service handles synchronization between our app and Google Calendar


class GoogleCalendarService {
  constructor() {
    this.apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
    this.clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    this.discoveryDocs = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
    this.scopes = 'https://www.googleapis.com/auth/calendar';
    this.accessToken = null;
    this.gapi = null;
    this.gisInited = false;
    this.initialized = false;
  }


  // Initialize Google API and GIS
  async initialize() {
    console.log('[GoogleCalendarService] Starting initialization...');
    
    // Check if already initialized
    if (this.initialized) {
      console.log('[GoogleCalendarService] Already initialized');
      return true;
    }

    try {
      // 1. First, check if we have the required environment variables
      this._checkEnvironmentVariables();
      
      // 2. Load Google Identity Services (GIS)
      console.log('[GoogleCalendarService] Loading Google Identity Services...');
      await this.loadGIS();
      
      // 3. Load Google API client
      console.log('[GoogleCalendarService] Loading Google API client...');
      await this.loadGoogleAPI();
      
      // 4. Initialize the client
      console.log('[GoogleCalendarService] Initializing client...');
      await this.initClient();
      
      this.initialized = true;
      console.log('[GoogleCalendarService] Initialized successfully');
      return true;
      
    } catch (error) {
      console.error('[GoogleCalendarService] Initialization failed:', error);
      this.initialized = false;
      
      // Enhance the error with more context
      const enhancedError = new Error(`Failed to initialize Google Calendar Service: ${error.message}`);
      enhancedError.originalError = error;
      enhancedError.isAuthError = error.message.includes('auth') || error.message.includes('token');
      enhancedError.isConfigError = error.message.includes('API key') || error.message.includes('client_id');
      
      throw enhancedError;
    }
  }
  
  _checkEnvironmentVariables() {
    console.log('[GoogleCalendarService] Checking environment variables...');
    const requiredVars = [
      'REACT_APP_GOOGLE_API_KEY',
      'REACT_APP_GOOGLE_CLIENT_ID',
      'REACT_APP_GOOGLE_REDIRECT_URI'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
      console.error(`[GoogleCalendarService] ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    console.log('[GoogleCalendarService] All required environment variables are present');
  }


  // Load Google API script
  loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        window.gapi.load('client', () => {
          this.gapi = window.gapi;
          resolve(window.gapi);
        });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client', () => {
          this.gapi = window.gapi;
          resolve(window.gapi);
        });
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Loads Google Identity Services with enhanced error handling and debugging
   * This function handles script loading, initialization, and provides detailed error messages
   */
  loadGIS() {
    return new Promise((resolve, reject) => {
      // First, check if we can use the newer API
      if (window.google?.accounts?.oauth2?.initTokenClient) {
        console.log('[GIS] Using newer Google Identity Services API');
        this.gisInited = true;
        return resolve();
      }
      
      // Fallback to legacy API check
      if (window.google?.accounts?.oauth2?.requestAccessToken) {
        console.log('[GIS] Using legacy Google Identity Services API');
        this.gisInited = true;
        return resolve();
      }
      console.log('[GIS] Starting Google Identity Services initialization...');
      
      // Check if already loaded and initialized
      if (window.google?.accounts?.oauth2?.requestAccessToken) {
        console.log('[GIS] Google Identity Services already loaded and initialized');
        this.gisInited = true;
        return resolve();
      }

      // Check for common issues before proceeding
      console.log('[GIS] Checking environment...');
      console.log(`[GIS] Protocol: ${window.location.protocol}`);
      console.log(`[GIS] Hostname: ${window.location.hostname}`);
      
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        console.warn('[GIS] Warning: Loading over non-HTTPS connection. Some features may be restricted.');
      }

      // Check if script is already in the process of loading
      const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      
      if (existingScript) {
        console.log('[GIS] Script already in document, waiting for initialization...');
        
        let attempts = 0;
        const maxAttempts = 30; // 6 seconds total (30 * 200ms)
        
        const checkLoaded = () => {
          console.log(`[GIS] Check #${attempts + 1} for Google Identity Services...`);
          
          // Check both new and legacy APIs
          if (window.google?.accounts?.oauth2?.initTokenClient || 
              window.google?.accounts?.oauth2?.requestAccessToken) {
            console.log('[GIS] Successfully initialized from existing script');
            this.gisInited = true;
            return resolve();
          }
          
          attempts++;
          if (attempts >= maxAttempts) {
            const errorMsg = 'Google Identity Services failed to initialize after loading.';
            console.error(`[GIS] ${errorMsg} Check browser console for network errors.`);
            
            // Detailed diagnostics
            console.error('[GIS] Window.google state:', {
              exists: !!window.google,
              accounts: !!window.google?.accounts,
              oauth2: !!window.google?.accounts?.oauth2,
              hasInitTokenClient: !!window.google?.accounts?.oauth2?.initTokenClient,
              hasRequestAccessToken: !!window.google?.accounts?.oauth2?.requestAccessToken,
              googleObject: window.google ? Object.keys(window.google) : 'Not found'
            });
            
            // Check for common issues
            if (!window.google) {
              console.error('[GIS] Error: window.google is not defined');
            } else if (!window.google.accounts) {
              console.error('[GIS] Error: google.accounts is not available');
              console.error('[GIS] This often happens when the script is blocked by an ad blocker or browser extension');
            } else if (!window.google.accounts.oauth2) {
              console.error('[GIS] Error: google.accounts.oauth2 is not available');
              console.error('[GIS] This suggests the Google Identity Services script did not load correctly');
            } else if (!window.google.accounts.oauth2.initTokenClient && !window.google.accounts.oauth2.requestAccessToken) {
              console.error('[GIS] Error: Required methods (initTokenClient/requestAccessToken) are missing');
              console.error('[GIS] This could be due to a version mismatch or script loading issue');
            }
            
            // Provide detailed error message
            let errorMessage = 'Google Identity Services failed to load.\n\n' +
              'Common causes and solutions:\n' +
              '1. Ad blockers or browser extensions may be blocking the script\n' +
              '   - Try in an incognito/private window\n' +
              '   - Disable ad blockers/extensions and refresh\n' +
              '2. Network issues may be preventing script loading\n' +
              '   - Check your internet connection\n' +
              '   - Try a different network if possible\n\n' +
              '3. Browser compatibility issues\n' +
              '   - Try with a different browser\n' +
              '   - Ensure your browser is up to date\n\n' +
              'For developers:\n' +
              '- Check the browser console for detailed error messages\n' +
              '- Verify network requests to accounts.google.com are not blocked\n' +
              '- Check Content Security Policy (CSP) headers if applicable';
            
            return reject(new Error(errorMessage));
          }
          
          setTimeout(checkLoaded, 200);
        };
        
        // Start checking
        checkLoaded();
        return;
      }

      // If we get here, we need to load the script
      console.log('[GIS] Creating new script element with enhanced configuration...');
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.referrerPolicy = 'strict-origin-when-cross-origin';
      
      // Add data attributes for debugging
      script.setAttribute('data-gapi-loaded', 'false');
      script.setAttribute('data-load-time', new Date().toISOString());
      
      // Add nonce for CSP compatibility
      const cspMeta = document.querySelector('meta[http-equiv^="Content-Security-Policy"]');
      if (cspMeta) {
        const nonce = cspMeta.getAttribute('nonce') || cspMeta.getAttribute('data-nonce');
        if (nonce) {
          script.nonce = nonce;
          console.log('[GIS] Added CSP nonce to script');
        } else {
          console.warn('[GIS] CSP meta tag found but no nonce attribute');
        }
      } else {
        console.log('[GIS] No CSP meta tag found, proceeding without nonce');
      }
      script.setAttribute('data-initialized', 'false');
      
      // Set a timeout for the initial script load
      const loadTimeout = setTimeout(() => {
        console.error('[GIS] Timed out while loading script (15s)');
        console.error('[GIS] Script element state:', {
          readyState: script.readyState,
          complete: script.complete,
          parentNode: script.parentNode ? 'attached' : 'not attached'
        });
        
        reject(new Error(
          'Timed out while loading Google Identity Services.\n\n' +
          'Possible causes:\n' +
          '1. Network connectivity issues\n' +
          '2. DNS resolution failure for accounts.google.com\n' +
          '3. Browser extensions blocking the request\n\n' +
          'Please try:\n' +
          '1. Check your internet connection\n' +
          '2. Try accessing https://accounts.google.com in your browser\n' +
          '3. Disable any VPN or proxy services\n' +
          '4. Try in incognito mode with extensions disabled'));
      }, 15000); // 15 second timeout
      
      script.onerror = (error) => {
        console.error('[GIS] Script onerror event fired:', error);
        clearTimeout(loadTimeout);
        
        // Try to get more specific error information
        let errorDetails = 'Unknown error';
        try {
          errorDetails = error.message || error.toString();
        } catch (e) {
          console.error('[GIS] Error getting error details:', e);
        }
        
        console.error('[GIS] Script load failed with:', errorDetails);
        
        reject(new Error(
          'Failed to load Google Identity Services.\n\n' +
          'Error details: ' + errorDetails + '\n\n' +
          'Possible solutions:\n' +
          '1. Check your internet connection\n' +
          '2. Disable any ad blockers or privacy extensions\n' +
          '3. Try in incognito/private mode\n' +
          '4. Check browser console for network errors'
        ));
      };
      
      // Add the script to the document
      try {
        console.log('[GIS] Adding script to document...');
        const target = document.head || document.documentElement;
        target.appendChild(script);
        console.log('[GIS] Script element added to document');
      } catch (error) {
        console.error('[GIS] Failed to add script to document:', error);
        clearTimeout(loadTimeout);
        
        reject(new Error(
          'Failed to add Google Identity Services script to the page.\n\n' +
          'This might be due to:\n' +
          '1. Security restrictions (CSP)\n' +
          '2. Page structure issues\n' +
          '3. Browser extensions interfering\n\n' +
          'Please check browser console for detailed errors.'
        ));
      }
    });
  }


  // Initialize the API client (no auth)
  async initClient() {
    try {
      if (!this.apiKey) {
        throw new Error('Google API key is not configured. Please check your .env file.');
      }
      
      await this.gapi.client.init({
        apiKey: this.apiKey,
        discoveryDocs: this.discoveryDocs,
      });
      
      // Verify the client was initialized properly
      if (!this.gapi.client || !this.gapi.client.calendar) {
        throw new Error('Failed to initialize Google Calendar API client');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize client:', error);
      throw error; // Re-throw to be caught by initialize()
    }
  }


  // Sign in user using GIS and get access token with robust error handling
  async signIn() {
    try {
      // First ensure GIS is loaded and initialized
      if (!this.gisInited) {
        await this.loadGIS();
      }

      // Extra check to ensure Google's OAuth2 is available
      if (!window.google?.accounts?.oauth2?.requestAccessToken) {
        throw new Error('Google Identity Services not properly initialized. Please refresh the page and try again.');
      }

      return new Promise((resolve, reject) => {
        try {
          window.google.accounts.oauth2.requestAccessToken({
            client_id: this.clientId,
            scope: this.scopes,
            prompt: 'consent',
            callback: (tokenResponse) => {
              if (tokenResponse?.access_token) {
                this.accessToken = tokenResponse.access_token;
                if (this.gapi?.client) {
                  this.gapi.client.setToken({ access_token: this.accessToken });
                }
                resolve(tokenResponse);
              } else {
                const error = tokenResponse?.error || 'Unknown error during sign in';
                console.error('Google OAuth error:', error);
                reject(new Error(`Failed to sign in: ${error}`));
              }
            },
          });
        } catch (error) {
          console.error('Error in Google OAuth flow:', error);
          reject(new Error(`Authentication error: ${error.message || 'Unknown error'}`));
        }
      });
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error; // Re-throw to be handled by the caller
    }
  }

  // Sign out user (revoke token)
  async signOut() {
    if (!this.accessToken) return false;
    return new Promise((resolve) => {
      window.google.accounts.oauth2.revoke(this.accessToken, () => {
        this.accessToken = null;
        this.gapi.client.setToken(null);
        resolve(true);
      });
    });
  }

  // Check if user is signed in (simple check)
  isSignedIn() {
    return !!this.accessToken;
  }

  // Create calendar event from hackathon
  async createEvent(hackathon) {
    try {

      if (!this.isSignedIn()) {
        throw new Error('User not signed in');
      }

      const event = {
        'summary': `🏆 ${hackathon.name}`,
        'description': this.formatEventDescription(hackathon),
        'start': {
          'dateTime': new Date(hackathon.date).toISOString(),
          'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        'end': {
          'dateTime': new Date(new Date(hackathon.date).getTime() + 24 * 60 * 60 * 1000).toISOString(),
          'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        'reminders': {
          'useDefault': false,
          'overrides': this.createReminders(hackathon),
        },
        'colorId': this.getColorId(hackathon.status),
      };

      const response = await this.gapi.client.calendar.events.insert({
        'calendarId': 'primary',
        'resource': event,
      });

      return response.result;
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      throw error;
    }
  }

  // Format event description
  formatEventDescription(hackathon) {
    let description = `Platform: ${hackathon.platform}\n`;
    description += `Team: ${hackathon.team}\n`;
    description += `Rounds: ${hackathon.rounds}\n`;
    
    if (hackathon.remarks) {
      description += '\nRound Remarks:\n';
      Object.entries(hackathon.remarks).forEach(([round, remark]) => {
        description += `${round}: ${remark}\n`;
      });
    }

    if (hackathon.notifications && hackathon.notifications.length > 0) {
      description += '\nNotifications:\n';
      hackathon.notifications.forEach(notification => {
        description += `• ${notification.trigger}\n`;
      });
    }

    return description;
  }

  // Create reminders based on notification preferences
  createReminders(hackathon) {
    const reminders = [];
    
    if (hackathon.notifications) {
      hackathon.notifications.forEach(notification => {
        switch (notification.trigger) {
          case '2 days before':
            reminders.push({
              'method': 'email',
              'minutes': 2880, // 2 days
            });
            break;
          case '1 hour before':
            reminders.push({
              'method': 'popup',
              'minutes': 60,
            });
            break;
          case 'before each round':
            // Add reminders for each round
            for (let i = 1; i <= hackathon.rounds; i++) {
              reminders.push({
                'method': 'popup',
                'minutes': 30,
              });
            }
            break;
        }
      });
    }

    return reminders;
  }

  // Get color ID based on hackathon status
  getColorId(status) {
    const colorMap = {
      'Planning': '1',      // Blue
      'Participating': '2', // Green
      'Won': '3',          // Gold
      'Didn\'t qualify': '4', // Red
    };
    return colorMap[status] || '1';
  }

  // Sync all hackathons to calendar
  async syncAllHackathons(hackathons) {
    try {
      const results = [];
      for (const hackathon of hackathons) {
        try {
          const event = await this.createEvent(hackathon);
          results.push({
            hackathon: hackathon.name,
            success: true,
            eventId: event.id,
          });
        } catch (error) {
          results.push({
            hackathon: hackathon.name,
            success: false,
            error: error.message,
          });
        }
      }
      return results;
    } catch (error) {
      console.error('Failed to sync hackathons:', error);
      throw error;
    }
  }

  // Get user's calendar list
  async getCalendarList() {
    try {
      const response = await this.gapi.client.calendar.calendarList.list();
      return response.result.items;
    } catch (error) {
      console.error('Failed to get calendar list:', error);
      throw error;
    }
  }

  // Get events from a specific calendar
  async getEvents(calendarId = 'primary', timeMin = null, timeMax = null) {
    try {
      const params = {
        'calendarId': calendarId,
        'timeMin': timeMin || new Date().toISOString(),
        'timeMax': timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        'singleEvents': true,
        'orderBy': 'startTime',
      };

      const response = await this.gapi.client.calendar.events.list(params);
      return response.result.items;
    } catch (error) {
      console.error('Failed to get events:', error);
      throw error;
    }
  }
}

export default GoogleCalendarService;
