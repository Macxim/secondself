const { generateResponse } = require('./openai');
const { loadStyleProfile } = require('./styleManager');
const { getUserFlow, getNextMessage, updateStage, STAGES } = require('./salesFlow');

// In-memory storage for conversations and user profiles
const conversations = new Map();
const userProfiles = new Map();

// Cache the style profile
let cachedStyleProfile = null;

async function getStyleProfile() {
  if (cachedStyleProfile === null) {
    cachedStyleProfile = await loadStyleProfile();
  }
  return cachedStyleProfile;
}

function reloadStyleProfile() {
  cachedStyleProfile = null;
  console.log('🔄 Style profile cache cleared');
}

function setUserProfile(senderId, profile) {
  userProfiles.set(senderId, profile);
}

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

  // Check if user is in a sales flow
  const flow = getUserFlow(senderId);

  if (flow) {
    console.log(`📊 User in flow: ${flow.stage}`);

    // Get scripted response based on flow
    const scriptedResponse = getNextMessage(senderId, messageText);

    if (scriptedResponse) {
      console.log(`📝 Using scripted response for stage: ${flow.stage}`);

      // Update stage
      await updateStage(senderId, scriptedResponse.nextStage, `User said: ${messageText}`);

      // If it's a silent update (no message to send), use AI
      if (scriptedResponse.silent || !scriptedResponse.message) {
        console.log(`🤫 Silent stage update, using AI for response`);
        // Continue to AI response below
      } else {
        // Add to conversation history
        if (!conversations.has(senderId)) {
          conversations.set(senderId, []);
        }
        const conversationHistory = conversations.get(senderId);
        conversationHistory.push({ role: 'user', content: messageText });
        conversationHistory.push({ role: 'assistant', content: scriptedResponse.message, scripted: true });

        return scriptedResponse.message;
      }
    }
  }

  // If no scripted response, use AI
  console.log(`🤖 No scripted response, using AI`);

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

    // Add flow context if exists
    if (flow) {
      styleProfile += `\n\nCONTEXT: This person is in your sales flow at stage: ${flow.stage}. Keep conversation aligned with moving them forward in the process.`;
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

function getConversation(senderId) {
  return conversations.get(senderId) || [];
}

function clearConversation(senderId) {
  conversations.delete(senderId);
  console.log(`🗑️  Cleared conversation for ${senderId}`);
}

module.exports = {
  processMessage,
  getConversation,
  clearConversation,
  reloadStyleProfile,
  setUserProfile,
  conversations
};