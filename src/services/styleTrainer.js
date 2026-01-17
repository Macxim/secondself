const { generateResponse } = require('./openai');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Analyze writing samples and create a style profile
 * @param {Array} samples - Array of message strings from the user
 */
async function analyzeWritingStyle(samples) {
  console.log(`📝 Analyzing ${samples.length} writing samples...`);

  const analysisPrompt = `Analyze these writing samples and create a detailed communication style profile. Focus on:
- Tone (formal/casual, friendly/professional, energetic/calm)
- Vocabulary level and word choices
- Sentence structure (short/long, simple/complex)
- Punctuation habits (lots of exclamation marks? emojis? proper punctuation?)
- Personality traits that come through
- Common phrases or expressions
- How they greet people and end conversations

Writing samples:
${samples.map((s, i) => `${i + 1}. "${s}"`).join('\n')}

Provide a concise style guide (2-3 paragraphs) that an AI could use to mimic this writing style.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing communication styles and creating detailed style profiles."
        },
        { role: "user", content: analysisPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    const styleProfile = response.choices[0].message.content;
    console.log('✅ Style profile created!');
    console.log('---');
    console.log(styleProfile);
    console.log('---');

    return styleProfile;

  } catch (error) {
    console.error('❌ Error analyzing style:', error.message);
    throw error;
  }
}

/**
 * Generate a test response using the style profile
 */
async function testStyle(styleProfile, testMessage) {
  const messages = [
    { role: 'user', content: testMessage }
  ];

  return await generateResponse(messages, styleProfile);
}

module.exports = {
  analyzeWritingStyle,
  testStyle
};