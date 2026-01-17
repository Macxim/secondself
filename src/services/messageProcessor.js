const { generateResponse } = require('./openai');
const { loadStyleProfile } = require('./styleManager');

// In-memory storage for conversations and user profiles
const conversations = new Map();
const userProfiles = new Map();

// Cache the style profile
let cachedStyleProfile = null;

/**
 * Get or load the style profile
 */
async function getStyleProfile() {
  if (cachedStyleProfile === null) {
    cachedStyleProfile = await loadStyleProfile();
  }
  return cachedStyleProfile;
}

/**
 * Reload the style profile
 */
function reloadStyleProfile() {
  cachedStyleProfile = null;
  console.log('🔄 Style profile cache cleared');
}

/**
 * Store user profile
 */
function setUserProfile(senderId, profile) {
  userProfiles.set(senderId, profile);
}

/**
 * Get user profile
 */
function getUserProfileFromCache(senderId) {
  return userProfiles.get(senderId);
}

/**
 * Process an incoming message and generate a response
 */
async function processMessage(senderId, messageText, userProfile = null) {
  console.log(`📩 Processing message from ${senderId}: "${messageText}"`);

  // Store user profile if provided
  if (userProfile) {
    setUserProfile(senderId, userProfile);
  }

  // Get or create conversation history
  if (!conversations.has(senderId)) {
    conversations.set(senderId, []);
  }

  const conversationHistory = conversations.get(senderId);

  // Add the user's message to history
  conversationHistory.push({
    role: 'user',
    content: messageText
  });

  // Keep only last 10 messages
  if (conversationHistory.length > 10) {
    conversationHistory.shift();
    conversationHistory.shift();
  }

  try {
    // Get the user's style profile
    let styleProfile = await getStyleProfile();

    // Add user context to style profile
    const profile = getUserProfileFromCache(senderId);
    if (profile && styleProfile) {
      styleProfile = `${styleProfile}\n\nIMPORTANT: The person you're talking to is named ${profile.first_name}. Use their name naturally in conversation, especially when greeting them.`;
    }

    // Generate AI response with style
    const aiResponse = await generateResponse(conversationHistory, styleProfile);

    // Add AI response to history
    conversationHistory.push({
      role: 'assistant',
      content: aiResponse
    });

    console.log(`🤖 AI Response: "${aiResponse}"`);

    return aiResponse;

  } catch (error) {
    console.error('❌ Error processing message:', error);
    return "Sorry, I'm having trouble responding right now. Please try again in a moment.";
  }
}

/**
 * Get conversation history for a user
 */
function getConversation(senderId) {
  return conversations.get(senderId) || [];
}

/**
 * Clear conversation history for a user
 */
function clearConversation(senderId) {
  conversations.delete(senderId);
  console.log(`🗑️  Cleared conversation for ${senderId}`);
}

// Export conversations map for dashboard access
module.exports.conversations = conversations;

module.exports = {
  processMessage,
  getConversation,
  clearConversation,
  reloadStyleProfile,
  setUserProfile,
  conversations
};