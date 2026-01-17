// Simple in-memory conversation store
// Conversations expire after 30 minutes of inactivity

const conversations = new Map();
const CONVERSATION_TTL = 30 * 60 * 1000; // 30 minutes

function getConversation(userId) {
  const convo = conversations.get(userId);
  
  if (!convo) {
    return [];
  }
  
  // Check if conversation has expired
  if (Date.now() - convo.lastActivity > CONVERSATION_TTL) {
    conversations.delete(userId);
    return [];
  }
  
  return convo.messages;
}

function addMessage(userId, role, content) {
  let convo = conversations.get(userId);
  
  if (!convo) {
    convo = {
      messages: [],
      lastActivity: Date.now()
    };
    conversations.set(userId, convo);
  }
  
  convo.messages.push({ role, content });
  convo.lastActivity = Date.now();
  
  // Keep only last 20 messages to avoid context getting too long
  if (convo.messages.length > 20) {
    convo.messages = convo.messages.slice(-20);
  }
}

function clearConversation(userId) {
  conversations.delete(userId);
}

// Cleanup expired conversations every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, convo] of conversations.entries()) {
    if (now - convo.lastActivity > CONVERSATION_TTL) {
      conversations.delete(userId);
    }
  }
}, 10 * 60 * 1000);

module.exports = {
  getConversation,
  addMessage,
  clearConversation
};
