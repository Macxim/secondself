const express = require('express');
const router = express.Router();
const { getConversation, clearConversation } = require('../services/messageProcessor');
const {
  toggleBot,
  isBotEnabled,
  disableConversation,
  enableConversation,
  enterManualMode,
  exitManualMode,
  isManualMode,
  getConversationStates
} = require('../services/botController');
const { sendMessage } = require('../services/facebook');

// Get all active conversations
router.get('/dashboard/conversations', (req, res) => {
  const { conversations } = require('../services/messageProcessor');
  const states = getConversationStates();

  const conversationList = [];

  for (const [senderId, messages] of conversations.entries()) {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      conversationList.push({
        senderId,
        messageCount: messages.length,
        lastMessage: {
          role: lastMessage.role,
          content: lastMessage.content.substring(0, 100) + (lastMessage.content.length > 100 ? '...' : '')
        },
        isManualMode: isManualMode(senderId),
        isDisabled: states.disabled.includes(senderId)
      });
    }
  }

  res.json({
    conversations: conversationList,
    botEnabled: isBotEnabled()
  });
});

// Get specific conversation details
router.get('/dashboard/conversation/:senderId', (req, res) => {
  const { senderId } = req.params;
  const conversation = getConversation(senderId);

  res.json({
    senderId,
    messages: conversation,
    isManualMode: isManualMode(senderId),
    botEnabled: isBotEnabled()
  });
});

// Toggle bot globally
router.post('/dashboard/bot/toggle', (req, res) => {
  const { enabled } = req.body;
  const newState = toggleBot(enabled);

  res.json({
    success: true,
    botEnabled: newState
  });
});

// Get bot status
router.get('/dashboard/bot/status', (req, res) => {
  res.json({
    botEnabled: isBotEnabled(),
    states: getConversationStates()
  });
});

// Toggle conversation mode (auto/manual)
router.post('/dashboard/conversation/:senderId/mode', (req, res) => {
  const { senderId } = req.params;
  const { mode } = req.body; // 'auto' or 'manual'

  if (mode === 'manual') {
    enterManualMode(senderId);
  } else {
    exitManualMode(senderId);
  }

  res.json({
    success: true,
    senderId,
    mode,
    isManualMode: isManualMode(senderId)
  });
});

// Enable/disable specific conversation
router.post('/dashboard/conversation/:senderId/toggle', (req, res) => {
  const { senderId } = req.params;
  const { enabled } = req.body;

  if (enabled) {
    enableConversation(senderId);
  } else {
    disableConversation(senderId);
  }

  res.json({
    success: true,
    senderId,
    enabled
  });
});

// Send manual message
router.post('/dashboard/conversation/:senderId/send', async (req, res) => {
  const { senderId } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      error: 'Message text required'
    });
  }

  try {
    // Send message via Facebook
    await sendMessage(senderId, message);

    // Add to conversation history
    const conversation = getConversation(senderId);
    conversation.push({
      role: 'assistant',
      content: message,
      manual: true
    });

    res.json({
      success: true,
      senderId,
      message
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear conversation
router.delete('/dashboard/conversation/:senderId', (req, res) => {
  const { senderId } = req.params;
  clearConversation(senderId);

  res.json({
    success: true,
    senderId
  });
});

module.exports = router;