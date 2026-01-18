const express = require('express');
const router = express.Router();
const { processMessage } = require('../services/messageProcessor');
const { sendMessageWithSplit, sendTypingIndicator, getUserProfile } = require('../services/facebook');
const { shouldBotRespond } = require('../services/botController');
const botConfig = require('../config/botConfig');

// Webhook verification
router.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Webhook endpoint for receiving messages
router.post('/webhook', async (req, res) => {
  let body = req.body;

  if (body.object === 'page') {

    for (const entry of body.entry) {
      let webhookEvent = entry.messaging[0];
      console.log('📨 Received webhook event:', JSON.stringify(webhookEvent, null, 2));

      let senderPsid = webhookEvent.sender.id;

      if (webhookEvent.message && webhookEvent.message.text) {
        const messageText = webhookEvent.message.text;
        console.log(`💬 Message from ${senderPsid}: "${messageText}"`);

        try {
          // Get user profile
          const userProfile = await getUserProfile(senderPsid);
          console.log(`👤 User: ${userProfile?.first_name || 'Unknown'}`);

          // Check if bot should respond
          if (!shouldBotRespond(senderPsid)) {
            console.log(`⏸️  Bot not responding (disabled or manual mode)`);
            // Still store the message in conversation history
            const { getConversation } = require('../services/messageProcessor');
            const conversation = getConversation(senderPsid);
            conversation.push({
              role: 'user',
              content: messageText
            });
            return; // Don't send AI response
          }

          // Show typing indicator
          await sendTypingIndicator(senderPsid, true);

          // Process the message with AI
          const aiResponse = await processMessage(senderPsid, messageText, userProfile);

          // Calculate natural delay
          const wordCount = aiResponse.split(' ').length;
          const baseDelay = wordCount * botConfig.delays.msPerWord;
          const randomVariation = Math.random() * botConfig.delays.randomVariation;
          const delay = Math.min(
            Math.max(baseDelay + randomVariation, botConfig.delays.minDelay),
            botConfig.delays.maxDelay
          );

          console.log(`⏱️  Waiting ${Math.round(delay / 1000)}s before replying (${wordCount} words)...`);
          await new Promise(resolve => setTimeout(resolve, delay));

          // Send the response
          await sendMessageWithSplit(senderPsid, aiResponse);
          console.log(`✅ Response sent to ${senderPsid}`);

        } catch (error) {
          console.error('❌ Error processing message:', error);
          try {
            await sendMessageWithSplit(senderPsid, "Sorry, I'm having trouble right now. Please try again later.");
          } catch (sendError) {
            console.error('❌ Error sending error message:', sendError);
          }
        } finally {
          await sendTypingIndicator(senderPsid, false);
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');

  } else {
    res.sendStatus(404);
  }
});

module.exports = router;