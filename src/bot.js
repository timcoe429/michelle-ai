const Anthropic = require('@anthropic-ai/sdk');
const { postSlackMessage, sendSlackMessage, deleteSlackMessage } = require('./slack');
const { getConversation, addMessage } = require('./memory');
const calendar = require('./calendar');

const anthropic = new Anthropic();

// Define tools for Claude
const tools = [
  {
    name: "list_events",
    description: "List events from Northstar. Use this to see what's scheduled.",
    input_schema: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "Start date/time in ISO format (e.g., '2024-01-15T00:00:00'). Defaults to now."
        },
        end_date: {
          type: "string",
          description: "End date/time in ISO format. Defaults to 7 days from now."
        }
      }
    }
  },
  {
    name: "get_next_event",
    description: "Get the single next upcoming event. Use this when user asks 'what's next' or 'what do I have coming up'.",
    input_schema: {
      type: "object",
      properties: {
        include_all_calendars: {
          type: "boolean",
          description: "Whether to check all calendars (default true)"
        }
      }
    }
  },
  {
    name: "create_event",
    description: "Create a new calendar event.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Event title"
        },
        start_time: {
          type: "string",
          description: "Start time in ISO format (e.g., '2024-01-15T14:00:00-07:00')"
        },
        end_time: {
          type: "string",
          description: "End time in ISO format"
        },
        description: {
          type: "string",
          description: "Event description (optional)"
        },
        color: {
          type: "string",
          description: "Event color: blue, green, purple, red, yellow, orange, turquoise, gray (optional)"
        },
        attendees: {
          type: "array",
          items: { type: "string" },
          description: "Attendee emails to invite (optional, follow-ups only)"
        },
        is_followup: {
          type: "boolean",
          description: "Set true for follow-up calls to add invites/reminders and format title"
        }
      },
      required: ["title", "start_time", "end_time"]
    }
  },
  {
    name: "update_event",
    description: "Update an existing Northstar event. First use find_event to get the event ID.",
    input_schema: {
      type: "object",
      properties: {
        event_id: {
          type: "string",
          description: "The event ID to update"
        },
        title: {
          type: "string",
          description: "New title (optional)"
        },
        start_time: {
          type: "string",
          description: "New start time in ISO format (optional)"
        },
        end_time: {
          type: "string",
          description: "New end time in ISO format (optional)"
        },
        description: {
          type: "string",
          description: "New description (optional)"
        },
        color: {
          type: "string",
          description: "New color (optional)"
        }
      },
      required: ["event_id"]
    }
  },
  {
    name: "delete_event",
    description: "Delete a Northstar event. First use find_event to get the event ID.",
    input_schema: {
      type: "object",
      properties: {
        event_id: {
          type: "string",
          description: "The event ID to delete"
        }
      },
      required: ["event_id"]
    }
  },
  {
    name: "find_event",
    description: "Search for events by title/keyword. Returns event IDs needed for update/delete.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search term to find in event titles"
        },
        start_date: {
          type: "string",
          description: "Start of search range (ISO format). Defaults to now."
        },
        end_date: {
          type: "string",
          description: "End of search range (ISO format). Defaults to 30 days from now."
        }
      },
      required: ["query"]
    }
  }
];

function applyPrefixAndColor(title, userMessage) {
  const titleText = (title || '').trim();
  const combined = `${titleText} ${userMessage || ''}`.toLowerCase();
  const hasWorkKeyword = combined.includes('work') ||
    combined.includes('servicecore') ||
    combined.includes('docket') ||
    /\bsc\b/.test(combined);
  const hasPersonalKeyword = combined.includes('personal');
  if (hasWorkKeyword) {
    const prefixed = titleText.startsWith('SC - ') ? titleText : `SC - ${titleText}`;
    return { title: prefixed, colorId: '5' };
  }
  if (hasPersonalKeyword) {
    const prefixed = titleText.startsWith('P - ') ? titleText : `P - ${titleText}`;
    return { title: prefixed, colorId: '2' };
  }
  return { title: titleText, colorId: '7' };
}

// Execute a tool call
async function executeTool(toolName, toolInput, context = {}) {
  try {
    switch (toolName) {
      case 'list_events':
        return await calendar.listEvents(
          toolInput.start_date,
          toolInput.end_date
        );

      case 'get_next_event':
        return await calendar.getNextEvent();
      
      case 'create_event':
        const isFollowUp = Boolean(toolInput.is_followup);
        const topic = (toolInput.title || '').trim();
        let baseTitle = toolInput.title;
        let description = toolInput.description;
        let reminders = null;
        let attendees = null;

        if (isFollowUp) {
          const followUpTopic = topic || 'Follow Up';
          baseTitle = `Phone Call - ${followUpTopic}`;
          if (!description) {
            description = `I will call you at this time to discuss ${followUpTopic}.`;
          }
          reminders = {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 30 },
              { method: 'popup', minutes: 10 }
            ]
          };
          attendees = Array.isArray(toolInput.attendees) ? toolInput.attendees : null;
        }

        const detected = applyPrefixAndColor(baseTitle, context.userMessage);
        return await calendar.createEvent({
          title: detected.title,
          startTime: toolInput.start_time,
          endTime: toolInput.end_time,
          description: description,
          colorId: detected.colorId,
          attendees: attendees,
          reminders: reminders
        });

      case 'update_event':
        return await calendar.updateEvent(toolInput.event_id, {
          title: toolInput.title,
          startTime: toolInput.start_time,
          endTime: toolInput.end_time,
          description: toolInput.description,
          color: toolInput.color
        });
      
      case 'delete_event':
        return await calendar.deleteEvent(toolInput.event_id);
      
      case 'find_event':
        return await calendar.findEvent(
          toolInput.query,
          toolInput.start_date,
          toolInput.end_date
        );
      
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error);
    return { error: error.message };
  }
}

// Get current date info for context
function getDateContext() {
  const now = new Date();
  const timezone = process.env.TIMEZONE || 'America/Denver';
  
  return `Current date and time: ${now.toLocaleString('en-US', { timeZone: timezone, dateStyle: 'full', timeStyle: 'short' })}. Timezone: ${timezone}.`;
}

function buildSystemPrompt() {
  return `You are Michelle, the user's calendar assistant. You're smart, helpful, and you think for yourself.

## WHO YOU ARE

You manage the user's schedule. Everything goes on the Northstar calendar.

When the user asks a question, answer it. When they ask you to do something, do it. Use good judgment.

## WHEN CREATING EVENTS

Everything goes on Northstar. Apply these automatically:
- Work/ServiceCore/Docket/SC mentioned → "SC - " prefix + yellow
- Personal mentioned → "P - " prefix + green
- Everything else → no prefix + blue

Follow-up calls:
- Detect follow-ups from "follow up", "call with", a specific person, or an email
- Set is_followup true and include attendees (email list)
- Format title as "Phone Call - [topic]"
- Description: "I will call you at this time to discuss [topic]."
- Reminders: email 30 min before, popup 10 min before

## WHEN MOVING EVENTS

Use update_event on the existing event. Don't create a new one and leave the old one behind.

## THE USER HAS ADHD

- Lists are fine for schedules
- Be direct, no fluff
- Help decide WHEN to do things, not just WHAT
- Suggest buffer time between back-to-back events

## GUARDRAILS

These keep you from getting confused:
- If you're unsure about a date, state your assumption and ask
- If you can't find an event, say so
- If moving multiple events, list them first and confirm

## CRITICAL RULES

### ALWAYS CHECK THE CALENDAR
- NEVER answer questions about scheduled events from memory or conversation context
- Before responding to ANY question about what's scheduled, what time something is, or what's on the calendar: CALL the calendar tool first
- This includes: "what do I have", "when is my meeting", "what's my schedule", "am I free at X"
- Even if you think you know the answer from earlier in the conversation, CHECK AGAIN
- Getting times wrong breaks trust - always verify
${getDateContext()}`;
}

async function handleMessage(event) {
  const userId = event.user;
  const userMessage = event.text;
  const channel = event.channel;
  
  console.log(`Message from ${userId}: ${userMessage}`);

  let thinkingTs = null;
  try {
    thinkingTs = await postSlackMessage(channel, '_thinking..._');
  } catch (error) {
    console.error('Error sending thinking indicator:', error);
  }
  
  // Get conversation history (30 min memory, fresh start if expired)
  const history = getConversation(userId);
  
  // Add user message to history
  addMessage(userId, 'user', userMessage);
  
  // Build messages array for Claude
  const messages = [
    ...history,
    { role: 'user', content: userMessage }
  ];
  
  try {
    const systemPrompt = buildSystemPrompt();
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      tools: tools,
      messages: messages
    });
    
    // Handle tool use loop
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');
      const toolResults = [];
      
      for (const toolUse of toolUseBlocks) {
        console.log(`Executing tool: ${toolUse.name}`, toolUse.input);
        const result = await executeTool(toolUse.name, toolUse.input, { userMessage });
        console.log(`Tool result:`, result);
        
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result)
        });
      }
      
      // Continue conversation with tool results
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
      
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        tools: tools,
        messages: messages
      });
    }
    
    // Extract text response
    const textContent = response.content.find(block => block.type === 'text');
    const replyText = textContent ? textContent.text : "I couldn't process that request.";
    
    // Add assistant response to history
    addMessage(userId, 'assistant', replyText);

    if (thinkingTs) {
      try {
        await deleteSlackMessage(channel, thinkingTs);
      } catch (error) {
        console.error('Error deleting thinking indicator:', error);
      }
    }
    
    // Send response to Slack
    await sendSlackMessage(channel, replyText);
    
  } catch (error) {
    console.error('Error processing message:', error);
    if (thinkingTs) {
      try {
        await deleteSlackMessage(channel, thinkingTs);
      } catch (deleteError) {
        console.error('Error deleting thinking indicator:', deleteError);
      }
    }
    await sendSlackMessage(channel, "Sorry, I encountered an error processing your request. Please try again.");
  }
}

module.exports = { handleMessage };
