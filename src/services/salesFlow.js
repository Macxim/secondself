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
  WAITING_BOOKING: 'waiting_booking',
  WAITING_INTAKE: 'waiting_intake',
  COMPLETED: 'completed',
  CLOSED: 'closed'
};

const SCRIPTS = {
  OFFER_DOC_LINK: '[OFFER DOC LINK]',
  PAYMENT_LINK: '[PAYMENT LINK]',
  BOOKING_LINK: '[BOOKING LINK]',
  INTAKE_LINK: '[INTAKE LINK]'
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
    followUpCount: 0,
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
async function updateStage(senderId, newStage, notes = '', resetFollowUp = true) {
  const flow = userFlows.get(senderId);
  if (!flow) return null;

  flow.stage = newStage;
  flow.updatedAt = new Date().toISOString();
  if (resetFollowUp) {
    flow.followUpCount = 0;
  }
  flow.history.push({
    stage: newStage,
    timestamp: new Date().toISOString(),
    notes
  });

  userFlows.set(senderId, flow);
  await saveFlows();

  console.log(`📊 ${flow.firstName} moved to: ${newStage} (Follow-up count: ${flow.followUpCount})`);
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
          message: `Perfect, here you go\n\n${SCRIPTS.OFFER_DOC_LINK}\n\nIf it looks like a fit, reply GAMEPLAN, and I'll send the link to grab a spot.`,
          nextStage: STAGES.WAITING_DOC_REPLY
        };
      }
      break;


    case STAGES.WAITING_DOC_REPLY:
      console.log(`🔍 In WAITING_DOC_REPLY stage`);
      if (lowerMessage.includes('gameplan') || isPositiveResponse(lowerMessage)) {
        console.log(`✅ Ready for payment link!`);
        return {
          message: `Awesome, here you go\n${SCRIPTS.PAYMENT_LINK}\nAfter you check out, book your 1:1 on the confirmation page.\nOnce it's done, let me know and I'll send your intake form + next steps.`,
          nextStage: STAGES.WAITING_PAYMENT
        };
      }
      break;


    case STAGES.WAITING_PAYMENT:
      console.log(`🔍 In WAITING_PAYMENT stage`);
      if (lowerMessage.includes('paid') || lowerMessage.includes('done') || lowerMessage.includes('completed') || lowerMessage.includes('purchased')) {
        console.log(`✅ Payment confirmed!`);
        return {
          message: `You're in, congratulations! ✅\n\nNext step: book your call here: ${SCRIPTS.BOOKING_LINK}\n\nThen complete the intake form here: ${SCRIPTS.INTAKE_LINK} (at least 24h before your call).`,
          nextStage: STAGES.WAITING_BOOKING
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
    const followUpCount = flow.followUpCount || 0;

    let followUp = null;

    // 1. Initial DM Follow-ups
    if (flow.stage === STAGES.WAITING_INITIAL_REPLY) {
      if (followUpCount === 0 && hoursSinceUpdate >= 48) {
        followUp = {
          message: `Hey ${flow.firstName}, I put together a quick doc that shows the new way coaches are getting consistent clients from Facebook.\nWant me to send it?`,
          nextStage: STAGES.WAITING_INITIAL_REPLY,
          followUpCount: 1
        };
      } else if (followUpCount === 1 && hoursSinceUpdate >= 48) { // 48h after first follow-up (96h total)
        followUp = {
          message: `Hey ${flow.firstName}, you probably got busy, just bumping this so you don't miss it.\nWant me to send the doc?`,
          nextStage: STAGES.WAITING_INITIAL_REPLY,
          followUpCount: 2
        };
      } else if (followUpCount === 2 && hoursSinceUpdate >= 48) { // 144h total
        followUp = {
          message: `Hey ${flow.firstName}, quick heads up, we closed the Gameplan spots for now 😊\nCan you let me know whether it was timing, budget, or just not a fit?`,
          nextStage: STAGES.CLOSED,
          followUpCount: 3
        };
      }
    }

    // 2. Doc Follow-ups
    else if (flow.stage === STAGES.WAITING_DOC_REPLY) {
      if (followUpCount === 0 && hoursSinceUpdate >= 24) {
        followUp = {
          message: `Hey ${flow.firstName}, I am curious, what did you think of the Gameplan?`,
          nextStage: STAGES.WAITING_DOC_REPLY,
          followUpCount: 1
        };
      } else if (followUpCount === 1 && hoursSinceUpdate >= 24) {
        followUp = {
          message: `Hey ${flow.firstName}, mind me following up on this?`,
          nextStage: STAGES.WAITING_DOC_REPLY,
          followUpCount: 2
        };
      } else if (followUpCount === 2 && hoursSinceUpdate >= 24) {
        followUp = {
          message: `Quick favor? If the doc was off base, can you hit reply and tell me was it timing, or did it just not feel relevant right now?`,
          nextStage: STAGES.CLOSED,
          followUpCount: 3
        };
      }
    }

    // 3. Link Follow-ups
    else if (flow.stage === STAGES.WAITING_PAYMENT) {
      if (followUpCount === 0 && hoursSinceUpdate >= 24) {
        followUp = {
          message: `${flow.firstName}, have you been able to secure your spot?`,
          nextStage: STAGES.WAITING_PAYMENT,
          followUpCount: 1
        };
      } else if (followUpCount === 1 && hoursSinceUpdate >= 24) {
        followUp = {
          message: `Quick one, ${flow.firstName}, do you want me to hold a Gameplan spot for you this month?`,
          nextStage: STAGES.WAITING_PAYMENT,
          followUpCount: 2
        };
      } else if (followUpCount === 2 && hoursSinceUpdate >= 24) {
        followUp = {
          message: `Hey ${flow.firstName}, do you need a little more time? I'll have to pull this link down soon.\nShould I keep it open, or close it out?`,
          nextStage: STAGES.CLOSED,
          followUpCount: 3
        };
      }
    }

    // 4. Paid Reminders (Booking/Intake)
    else if (flow.stage === STAGES.WAITING_BOOKING) {
      if (followUpCount === 0 && hoursSinceUpdate >= 24) {
        followUp = {
          message: `Quick reminder, please book your call here: ${SCRIPTS.BOOKING_LINK}`,
          nextStage: STAGES.WAITING_BOOKING,
          followUpCount: 1
        };
      }
    }

    if (followUp) {
      needsFollowUp.push({
        senderId: flow.senderId,
        firstName: flow.firstName,
        ...followUp
      });
    }
  }

  return needsFollowUp;
}

/**
 * Execute all pending follow-ups
 */
async function executeFollowUps() {
  const { sendMessageWithSplit } = require('./facebook');
  const fellows = getUsersNeedingFollowUp();

  console.log(`🤖 Found ${fellows.length} users needing follow-up`);

  for (const follow of fellows) {
    try {
      console.log(`📨 Sending follow-up to ${follow.firstName} (${follow.senderId})`);
      await sendMessageWithSplit(follow.senderId, follow.message);

      // Update the flow
      const flow = userFlows.get(follow.senderId);
      flow.followUpCount = follow.followUpCount;
      await updateStage(follow.senderId, follow.nextStage, `Automated Follow-up #${follow.followUpCount}`, false);

    } catch (error) {
      console.error(`❌ Failed to send follow-up to ${follow.firstName}:`, error.message);
    }
  }

  return fellows.length;
}

// Initialize on load
loadFlows();

module.exports = {
  STAGES,
  ENTRY_TYPES,
  SCRIPTS,
  initializeUser,
  getUserFlow,
  updateStage,
  getNextMessage,
  getInitialDM,
  getAllFlows,
  getUsersNeedingFollowUp,
  executeFollowUps,
  loadFlows,
  saveFlows
};