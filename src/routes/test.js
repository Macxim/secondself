const express = require('express');
const router = express.Router();
const { processMessage, getConversation, clearConversation } = require('../services/messageProcessor');

// Test endpoint to simulate receiving a message
router.post('/test/message', async (req, res) => {
  const { senderId, message } = req.body;

  if (!senderId || !message) {
    return res.status(400).json({
      error: 'Missing senderId or message in request body'
    });
  }

  try {
    const response = await processMessage(senderId, message);

    res.json({
      success: true,
      userMessage: message,
      aiResponse: response,
      conversationLength: getConversation(senderId).length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get conversation history
router.get('/test/conversation/:senderId', (req, res) => {
  const { senderId } = req.params;
  const conversation = getConversation(senderId);

  res.json({
    senderId,
    messageCount: conversation.length,
    conversation
  });
});

// Clear conversation
router.delete('/test/conversation/:senderId', (req, res) => {
  const { senderId } = req.params;
  clearConversation(senderId);

  res.json({
    success: true,
    message: `Conversation cleared for ${senderId}`
  });
});

module.exports = router;