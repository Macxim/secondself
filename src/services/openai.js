const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate an AI response based on conversation history
 */
async function generateResponse(messages, userStyle = null) {
  try {
    const systemPrompt = userStyle
      ? `You are responding to messages on behalf of someone. Their communication style: ${userStyle}. Match their tone, vocabulary, and style exactly. Keep responses natural and conversational.

CRITICAL FORMATTING RULES:
- DO NOT use markdown formatting (*bold*, **bold**, _italic_, etc)
- DO NOT use special characters like asterisks for emphasis
- Write in plain text only
- Use natural emphasis through word choice, not formatting
- Keep messages concise (under 300 characters when possible)
- If you need to list things, use simple numbers or dashes, not bullets with markdown`
      : `You are a helpful assistant responding to messages. Keep responses natural, friendly, and conversational.

CRITICAL FORMATTING RULES:
- DO NOT use markdown formatting
- Write in plain text only
- Keep messages concise`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      temperature: 0.9,
      max_tokens: 200, // Reduced to keep messages shorter
    });

    return completion.choices[0].message.content;

  } catch (error) {
    console.error('❌ OpenAI API Error:', error.message);
    throw error;
  }
}

module.exports = {
  generateResponse
};