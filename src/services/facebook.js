const axios = require('axios');

const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

/**
 * Get user profile information (name, etc)
 */
async function getUserProfile(userId) {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v21.0/${userId}?fields=first_name,last_name,profile_pic&access_token=${PAGE_ACCESS_TOKEN}`
    );

    return response.data;
  } catch (error) {
    console.error('❌ Error getting user profile:', error.message);
    return null;
  }
}

/**
 * Send a text message to a user via Facebook Messenger
 */
async function sendMessage(recipientId, messageText) {
  const requestBody = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      requestBody
    );

    console.log('✅ Message sent successfully:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Error sending message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send typing indicator
 */
async function sendTypingIndicator(recipientId, isTyping = true) {
  const senderAction = isTyping ? 'typing_on' : 'typing_off';

  try {
    await axios.post(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: recipientId },
        sender_action: senderAction
      }
    );
  } catch (error) {
    console.error('❌ Error sending typing indicator:', error.message);
  }
}

/**
 * Split long messages into chunks (Facebook has 2000 char limit)
 */
function splitMessage(text, maxLength = 1900) {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks = [];
  let currentChunk = '';

  // Split by paragraphs first
  const paragraphs = text.split('\n\n');

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed limit, save current chunk
    if (currentChunk.length + paragraph.length + 2 > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // If single paragraph is too long, split by sentences
      if (paragraph.length > maxLength) {
        const sentences = paragraph.split('. ');
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 2 > maxLength) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence + '. ';
          } else {
            currentChunk += sentence + '. ';
          }
        }
      } else {
        currentChunk = paragraph + '\n\n';
      }
    } else {
      currentChunk += paragraph + '\n\n';
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Send a message, splitting if necessary
 */
async function sendMessageWithSplit(recipientId, messageText) {
  const chunks = splitMessage(messageText);

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) {
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    await sendMessage(recipientId, chunks[i]);
  }
}

module.exports = {
  sendMessage,
  sendMessageWithSplit,
  sendTypingIndicator,
  getUserProfile
};