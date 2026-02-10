/**
 * Google Calendar API integration (OAuth in browser, no backend).
 * Requires VITE_GOOGLE_CLIENT_ID in .env and Google Calendar API enabled in Cloud Console.
 */

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const GSI_SCRIPT = 'https://accounts.google.com/gsi/client';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (token: string) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (document.querySelector('script[src="' + GSI_SCRIPT + '"]')) {
    return new Promise<void>((resolve) => {
      const check = () => {
        if (window.google?.accounts?.oauth2) resolve();
        else setTimeout(check, 100);
      };
      check();
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SCRIPT;
    script.async = true;
    script.onload = () => {
      const t = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(t);
          resolve();
        }
      }, 50);
      setTimeout(() => clearInterval(t), 5000);
    };
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });
}

function getClientId(): string | null {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID ?? null;
}

export function isGoogleCalendarConfigured(): boolean {
  return !!getClientId();
}

let cachedToken: string | null = null;

export function getStoredToken(): string | null {
  return cachedToken ?? sessionStorage.getItem('google_calendar_token');
}

function setStoredToken(token: string | null) {
  cachedToken = token;
  if (token) sessionStorage.setItem('google_calendar_token', token);
  else sessionStorage.removeItem('google_calendar_token');
}

/**
 * Request OAuth token via Google Identity Services (loads script if needed).
 */
export async function requestGoogleCalendarAuth(): Promise<string> {
  const clientId = getClientId();
  if (!clientId) throw new Error('Google Client ID not configured (VITE_GOOGLE_CLIENT_ID)');
  await loadGoogleScript();
  if (!window.google?.accounts?.oauth2) throw new Error('Google Identity Services not available');
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: CALENDAR_SCOPE,
      callback: (token: string) => {
        setStoredToken(token);
        resolve(token);
      },
    });
    client.requestAccessToken();
  });
}

/**
 * Create an event in the user's primary calendar.
 */
export async function createCalendarEvent(
  token: string,
  event: {
    summary: string;
    description?: string;
    start: string; // ISO datetime
    end: string;
    location?: string;
  }
): Promise<{ id: string; htmlLink: string } | null> {
  const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      end: { dateTime: event.end, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      location: event.location,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('Calendar API error', res.status, err);
    return null;
  }
  const data = await res.json();
  return { id: data.id, htmlLink: data.htmlLink ?? '' };
}

/**
 * Sync a CRM task/meeting to Google Calendar. Returns the event id/link or null.
 */
export async function syncTaskToGoogleCalendar(
  title: string,
  dueDate: string,
  dueTime: string | undefined,
  schoolName?: string,
  isMeeting?: boolean
): Promise<{ id: string; htmlLink: string } | null> {
  let token = getStoredToken();
  if (!token && isGoogleCalendarConfigured()) {
    token = await requestGoogleCalendarAuth();
  }
  if (!token) return null;

  const time = dueTime ?? '09:00';
  const [h, m] = time.split(':').map(Number);
  const start = new Date(dueDate);
  start.setHours(h, m, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + (isMeeting ? 1 : 0), end.getMinutes(), 0, 0);

  return createCalendarEvent(token, {
    summary: title,
    description: schoolName ? `CRM - ${schoolName}` : undefined,
    start: start.toISOString(),
    end: end.toISOString(),
  });
}

export function disconnectGoogleCalendar(): void {
  setStoredToken(null);
}

export interface CalendarEventFromAPI {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'google_event';
}

/**
 * Fetch events from Google Calendar for a date range (ISO strings for timeMin/timeMax).
 */
export async function fetchCalendarEvents(
  token: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEventFromAPI[]> {
  const url = new URL(`${CALENDAR_API}/calendars/primary/events`);
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('Calendar list error', res.status, err);
    return [];
  }
  const data = await res.json();
  const items = (data.items ?? []) as Array<{
    id: string;
    summary?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
  }>;
  return items.map((item) => {
    const startStr = item.start?.dateTime ?? item.start?.date;
    const endStr = item.end?.dateTime ?? item.end?.date;
    const start = startStr ? new Date(startStr) : new Date();
    const end = endStr ? new Date(endStr) : new Date(start.getTime() + 60 * 60 * 1000);
    return {
      id: item.id,
      title: item.summary ?? '(Sin título)',
      start,
      end,
      type: 'google_event' as const,
    };
  });
}
