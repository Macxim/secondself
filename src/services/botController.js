// Bot state management
let botEnabled = true;
const disabledConversations = new Set();
const manualModeConversations = new Set();

/**
 * Check if bot should respond to a user
 */
function shouldBotRespond(senderId) {
  // If bot is globally disabled, don't respond
  if (!botEnabled) {
    return false;
  }

  // If this specific conversation is disabled, don't respond
  if (disabledConversations.has(senderId)) {
    return false;
  }

  // If this conversation is in manual mode, don't respond
  if (manualModeConversations.has(senderId)) {
    return false;
  }

  return true;
}

/**
 * Toggle bot globally
 */
function toggleBot(enabled) {
  botEnabled = enabled;
  console.log(`🤖 Bot ${enabled ? 'enabled' : 'disabled'} globally`);
  return botEnabled;
}

/**
 * Get bot status
 */
function isBotEnabled() {
  return botEnabled;
}

/**
 * Disable bot for specific conversation
 */
function disableConversation(senderId) {
  disabledConversations.add(senderId);
  console.log(`🔕 Bot disabled for ${senderId}`);
}

/**
 * Enable bot for specific conversation
 */
function enableConversation(senderId) {
  disabledConversations.delete(senderId);
  manualModeConversations.delete(senderId);
  console.log(`🔔 Bot enabled for ${senderId}`);
}

/**
 * Enter manual mode for a conversation
 */
function enterManualMode(senderId) {
  manualModeConversations.add(senderId);
  console.log(`✋ Manual mode for ${senderId}`);
}

/**
 * Exit manual mode for a conversation
 */
function exitManualMode(senderId) {
  manualModeConversations.delete(senderId);
  console.log(`🤖 Auto mode for ${senderId}`);
}

/**
 * Check if conversation is in manual mode
 */
function isManualMode(senderId) {
  return manualModeConversations.has(senderId);
}

/**
 * Get all conversation states
 */
function getConversationStates() {
  return {
    disabled: Array.from(disabledConversations),
    manual: Array.from(manualModeConversations)
  };
}

module.exports = {
  shouldBotRespond,
  toggleBot,
  isBotEnabled,
  disableConversation,
  enableConversation,
  enterManualMode,
  exitManualMode,
  isManualMode,
  getConversationStates
};