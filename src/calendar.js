const { google } = require('googleapis');

// Color mapping (Google Calendar color IDs)
const COLORS = {
  blue: '1',
  green: '2',
  purple: '3',
  red: '4',
  yellow: '5',
  orange: '6',
  turquoise: '7',
  gray: '8',
  bold_blue: '9',
  bold_green: '10',
  bold_red: '11'
};

function getCalendarClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
  
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

async function listEvents(calendarId, timeMin, timeMax) {
  const calendar = getCalendarClient();

  const params = {
    calendarId,
    timeMin: timeMin || new Date().toISOString(),
    timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 20
  };

  const response = await calendar.events.list(params);
  
  return response.data.items.map(event => ({
    id: event.id,
    title: event.summary,
    description: event.description,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    color: event.colorId
  }));
}

async function createEvent(calendarId, eventDetails) {
  if (typeof eventDetails === 'string') {
    eventDetails = arguments[1] || {};
  }
  const calendar = getCalendarClient();
  
  const event = {
    summary: eventDetails.title,
    description: eventDetails.description || '',
    start: {
      dateTime: eventDetails.startTime,
      timeZone: process.env.TIMEZONE || 'America/Denver'
    },
    end: {
      dateTime: eventDetails.endTime,
      timeZone: process.env.TIMEZONE || 'America/Denver'
    }
  };

  if (Array.isArray(eventDetails.attendees) && eventDetails.attendees.length > 0) {
    event.attendees = eventDetails.attendees.map(email => ({ email }));
  }

  if (eventDetails.reminders) {
    event.reminders = eventDetails.reminders;
  }
  
  if (eventDetails.colorId) {
    event.colorId = String(eventDetails.colorId);
  } else if (eventDetails.color && COLORS[eventDetails.color.toLowerCase()]) {
    event.colorId = COLORS[eventDetails.color.toLowerCase()];
  }
  
  const response = await calendar.events.insert({
    calendarId,
    resource: event
  });
  
  return {
    id: response.data.id,
    title: response.data.summary,
    start: response.data.start.dateTime,
    end: response.data.end.dateTime,
    link: response.data.htmlLink
  };
}

async function updateEvent(calendarId, eventId, updates) {
  const calendar = getCalendarClient();
  
  // First get the existing event
  const existing = await calendar.events.get({
    calendarId,
    eventId
  });
  
  const event = existing.data;
  
  // Apply updates
  if (updates.title) event.summary = updates.title;
  if (updates.description !== undefined) event.description = updates.description;
  if (updates.startTime) {
    event.start = {
      dateTime: updates.startTime,
      timeZone: process.env.TIMEZONE || 'America/Denver'
    };
  }
  if (updates.endTime) {
    event.end = {
      dateTime: updates.endTime,
      timeZone: process.env.TIMEZONE || 'America/Denver'
    };
  }
  if (updates.color && COLORS[updates.color.toLowerCase()]) {
    event.colorId = COLORS[updates.color.toLowerCase()];
  }
  
  const response = await calendar.events.update({
    calendarId,
    eventId,
    resource: event
  });
  
  return {
    id: response.data.id,
    title: response.data.summary,
    start: response.data.start.dateTime,
    end: response.data.end.dateTime
  };
}

async function deleteEvent(calendarId, eventId) {
  const calendar = getCalendarClient();
  
  await calendar.events.delete({
    calendarId,
    eventId
  });
  
  return { success: true };
}

async function findEvent(calendarId, searchQuery, timeMin, timeMax) {
  const calendar = getCalendarClient();
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  
  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMin || startOfToday.toISOString(),
    timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    q: searchQuery,
    maxResults: 10
  });
  
  return response.data.items.map(event => ({
    id: event.id,
    title: event.summary,
    description: event.description,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date
  }));
}

async function getNextEvent(calendarId) {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  
  let allEvents = [];
  
  try {
    const calendar = getCalendarClient();
    const response = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 5
    });
    
    allEvents = response.data.items.map(event => ({
      id: event.id,
      title: event.summary,
      description: event.description,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date
    }));
  } catch (error) {
    console.error('Error fetching calendar:', error.message);
  }
  
  // Sort by start time and return the first one
  allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
  
  if (allEvents.length === 0) {
    return { message: "Nothing scheduled for the rest of today." };
  }
  
  return {
    next: allEvents[0],
    remaining_count: allEvents.length - 1
  };
}

module.exports = {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  findEvent,
  getNextEvent
};
