const fs = require('fs').promises;
const path = require('path');

const FLOWS_FILE = path.join(__dirname, '../../data/sales-flows.json');

// Flow stages
const STAGES = {
  INITIAL_DM: 'initial_dm',
  WAITING_INITIAL_REPLY: 'waiting_initial_reply',
  SENT_DOC: 'sent_doc',
  WAITING_DOC_REPLY: 'waiting_doc_reply',
  SENT_LINK: 'sent_link',
  WAITING_PAYMENT: 'waiting_payment',
  PAID: 'paid',
  BOOKED: 'booked',
  COMPLETED: 'completed',
  CLOSED: 'closed'
};

// Entry types (A, B, C from your script)
const ENTRY_TYPES = {
  PROFILE_ENGAGER: 'profile_engager',      // A
  GROUP_MEMBER: 'group_member',            // B
  EVENT_ATTENDEE: 'event_attendee'         // C
};

// In-memory storage (we'll persist to file)
let userFlows = new Map();

/**
 * Load flows from disk
 */
async function loadFlows() {
  try {
    const data = await fs.readFile(FLOWS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    userFlows = new Map(Object.entries(parsed));
    console.log(`📖 Loaded ${userFlows.size} user flows`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️  No existing flows found, starting fresh');
      userFlows = new Map();
    } else {
      console.error('❌ Error loading flows:', error.message);
    }
  }
}

/**
 * Save flows to disk
 */
async function saveFlows() {
  try {
    const dataDir = path.join(__dirname, '../../data');
    await fs.mkdir(dataDir, { recursive: true });

    const data = Object.fromEntries(userFlows);
    await fs.writeFile(FLOWS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error saving flows:', error.message);
  }
}

/**
 * Initialize a new user in the flow
 */
async function initializeUser(senderId, entryType, firstName, metadata = {}) {
  const flow = {
    senderId,
    firstName,
    entryType,
    stage: STAGES.INITIAL_DM,
    metadata: {
      topic: metadata.topic || 'getting clients',
      ...metadata
    },
    history: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  userFlows.set(senderId, flow);
  await saveFlows();

  console.log(`✨ Initialized flow for ${firstName} (${entryType})`);
  return flow;
}

/**
 * Get user's current flow state
 */
function getUserFlow(senderId) {
  return userFlows.get(senderId);
}

/**
 * Update user's flow stage
 */
async function updateStage(senderId, newStage, notes = '') {
  const flow = userFlows.get(senderId);
  if (!flow) return null;

  flow.stage = newStage;
  flow.updatedAt = new Date().toISOString();
  flow.history.push({
    stage: newStage,
    timestamp: new Date().toISOString(),
    notes
  });

  userFlows.set(senderId, flow);
  await saveFlows();

  console.log(`📊 ${flow.firstName} moved to: ${newStage}`);
  return flow;
}

/**
 * Get the next message based on user's stage and input
 */
function getNextMessage(senderId, userMessage) {
  const flow = getUserFlow(senderId);
  if (!flow) {
    console.log(`❌ No flow found for ${senderId}`);
    return null;
  }

  const lowerMessage = userMessage.toLowerCase().trim();
  console.log(`🔍 Checking message: "${userMessage}" in stage: ${flow.stage}`);

  // Check for common questions first (Safe Replies)
  if (lowerMessage.includes('how much') || lowerMessage.includes('price') || lowerMessage.includes('cost')) {
    console.log(`💰 Detected price question`);
    return {
      message: "It's just $250. Want me to send the details?",
      nextStage: flow.stage // Stay in same stage
    };
  }

  if (lowerMessage.includes('what do i get') || lowerMessage.includes('what is it') || lowerMessage.includes('what does it include')) {
    console.log(`📦 Detected "what is it" question`);
    return {
      message: "It's a 7-day sprint, a custom 1-1 plan + simple weekly client path + support while you set it up. Want the details?",
      nextStage: flow.stage
    };
  }

  if (lowerMessage.includes('not now') || lowerMessage.includes('not interested') || lowerMessage.includes('no thanks')) {
    console.log(`❌ Detected negative response`);
    return {
      message: "No worries, that's cool. Want me to tag you for the next event?",
      nextStage: STAGES.CLOSED
    };
  }

  // Handle stage-specific responses
  console.log(`📊 Checking stage-specific responses for: ${flow.stage}`);

  switch (flow.stage) {
    case STAGES.WAITING_INITIAL_REPLY:
      console.log(`🔍 In WAITING_INITIAL_REPLY stage`);
      if (isPositiveResponse(lowerMessage)) {
        console.log(`✅ Positive response detected! Sending doc...`);
        return {
          message: `Perfect, here you go\n\n[OFFER DOC LINK]\n\nIf it looks like a fit, reply GAMEPLAN, and I'll send the link to grab a spot.`,
          nextStage: STAGES.SENT_DOC
        };
      } else {
        console.log(`❓ Not recognized as positive: "${lowerMessage}"`);
      }
      break;

    case STAGES.SENT_DOC:
      console.log(`🔍 In SENT_DOC stage, moving to WAITING_DOC_REPLY`);
      // Auto-transition to waiting for doc reply
      return {
        message: null, // Don't send a message, just update stage
        nextStage: STAGES.WAITING_DOC_REPLY,
        silent: true
      };

    case STAGES.WAITING_DOC_REPLY:
      console.log(`🔍 In WAITING_DOC_REPLY stage`);
      if (lowerMessage.includes('gameplan') || isPositiveResponse(lowerMessage)) {
        console.log(`✅ Ready for payment link!`);
        return {
          message: `Awesome, here you go\nhttps://link.fastpaydirect.com/payment-link/67890327cd7a105351d622d1\nAfter you check out, book your 1:1 on the confirmation page.\nOnce it's done, let me know and I'll send your intake form + next steps.`,
          nextStage: STAGES.SENT_LINK
        };
      }
      break;

    case STAGES.SENT_LINK:
      console.log(`🔍 In SENT_LINK stage, moving to WAITING_PAYMENT`);
      return {
        message: null,
        nextStage: STAGES.WAITING_PAYMENT,
        silent: true
      };

    case STAGES.WAITING_PAYMENT:
      console.log(`🔍 In WAITING_PAYMENT stage`);
      if (lowerMessage.includes('paid') || lowerMessage.includes('done') || lowerMessage.includes('completed') || lowerMessage.includes('purchased')) {
        console.log(`✅ Payment confirmed!`);
        return {
          message: `You're in, congratulations! ✅\n\nNext step: book your call here: https://calendly.com/marketingwithamanda/the-profit-accelerator-call\n\nThen complete the intake form here: [INTAKE LINK] (at least 24h before your call).`,
          nextStage: STAGES.PAID
        };
      }
      break;
  }

  // If no specific match, return null (will use AI response)
  console.log(`❌ No scripted response found, falling back to AI`);
  return null;
}

/**
 * Helper: Check if message is positive
 */
function isPositiveResponse(message) {
  const positiveWords = [
    'yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'alright',
    'sounds good', 'interested', 'please', 'send', 'share',
    'i want', 'id like', 'i would', 'tell me', 'show me',
    'lets do it', 'go ahead', 'absolutely', 'definitely'
  ];

  const lowerMessage = message.toLowerCase();
  return positiveWords.some(word => lowerMessage.includes(word));
}

/**
 * Get initial DM based on entry type
 */
function getInitialDM(entryType, firstName, metadata = {}) {
  const topic = metadata.topic || 'getting clients';

  switch (entryType) {
    case ENTRY_TYPES.PROFILE_ENGAGER:
      return `Hey ${firstName}, saw you on my post about ${topic}.\nThere's a new way coaches are using Facebook to get clients consistently.\nShould I send you a quick overview?`;

    case ENTRY_TYPES.GROUP_MEMBER:
      return `Hey ${firstName}, I thought of you.\nI am doing a 7-Day Gameplan for 12 coaches this month to help them get consistent clients from Facebook (without ads or complicated tech).\nShould I share the details?`;

    case ENTRY_TYPES.EVENT_ATTENDEE:
      return `Hey ${firstName}, thanks for joining Peaceful Launch.\nIf you want a quick custom plan for your business (and support while you set it up)\nI am doing a $250 Peaceful Clients 7 day Gameplan for 12 coaches this month\nShould I share the details?`;

    default:
      return `Hey ${firstName}, I thought of you.\nI am doing a 7-Day Gameplan for 12 coaches this month to help them get consistent clients from Facebook (without ads or complicated tech).\nShould I share the details?`;
  }
}

/**
 * Get all users in flow
 */
function getAllFlows() {
  return Array.from(userFlows.values());
}

/**
 * Get users needing follow-up
 */
function getUsersNeedingFollowUp() {
  const now = new Date();
  const needsFollowUp = [];

  for (const flow of userFlows.values()) {
    const lastUpdate = new Date(flow.updatedAt);
    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

    // Check if they need a follow-up based on stage and time
    if (flow.stage === STAGES.WAITING_INITIAL_REPLY && hoursSinceUpdate >= 48) {
      needsFollowUp.push({ ...flow, followUpType: 'initial_1' });
    } else if (flow.stage === STAGES.WAITING_DOC_REPLY && hoursSinceUpdate >= 24) {
      needsFollowUp.push({ ...flow, followUpType: 'doc_1' });
    } else if (flow.stage === STAGES.WAITING_PAYMENT && hoursSinceUpdate >= 24) {
      needsFollowUp.push({ ...flow, followUpType: 'link_1' });
    }
  }

  return needsFollowUp;
}

// Initialize on load
loadFlows();

module.exports = {
  STAGES,
  ENTRY_TYPES,
  initializeUser,
  getUserFlow,
  updateStage,
  getNextMessage,
  getInitialDM,
  getAllFlows,
  getUsersNeedingFollowUp,
  loadFlows,
  saveFlows
};