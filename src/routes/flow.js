const express = require('express');
const router = express.Router();
const {
  initializeUser,
  getUserFlow,
  updateStage,
  getInitialDM,
  getAllFlows,
  executeFollowUps,
  STAGES,
  ENTRY_TYPES
} = require('../services/salesFlow');
const { sendMessageWithSplit } = require('../services/facebook');

// Start a new flow for a user
router.post('/flow/start', async (req, res) => {
  const { senderId, firstName, entryType, metadata } = req.body;

  if (!senderId || !firstName || !entryType) {
    return res.status(400).json({
      error: 'Missing required fields: senderId, firstName, entryType'
    });
  }

  try {
    // Initialize the flow
    const flow = await initializeUser(senderId, entryType, firstName, metadata);

    // Get the initial DM
    const initialDM = getInitialDM(entryType, firstName, metadata);

    // Send response immediately (don't wait for Facebook)
    res.json({
      success: true,
      flow,
      messageSent: initialDM,
      status: 'Message queued for delivery'
    });

    // Send message in background
    setImmediate(async () => {
      try {
        await sendMessageWithSplit(senderId, initialDM);
        await updateStage(senderId, STAGES.WAITING_INITIAL_REPLY, 'Sent initial DM');
        console.log(`✅ Initial DM sent to ${firstName}`);
      } catch (error) {
        console.error(`❌ Error sending initial DM to ${firstName}:`, error.message);
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get flow status for a user
router.get('/flow/:senderId', (req, res) => {
  const { senderId } = req.params;
  const flow = getUserFlow(senderId);

  if (!flow) {
    return res.status(404).json({
      error: 'No flow found for this user'
    });
  }

  res.json(flow);
});

// Manually update flow stage
router.post('/flow/:senderId/stage', async (req, res) => {
  const { senderId } = req.params;
  const { stage, notes } = req.body;

  try {
    const flow = await updateStage(senderId, stage, notes);

    if (!flow) {
      return res.status(404).json({
        error: 'No flow found for this user'
      });
    }

    res.json({
      success: true,
      flow
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all flows
router.get('/flows', (req, res) => {
  const flows = getAllFlows();

  res.json({
    count: flows.length,
    flows
  });
});

// Get available stages and entry types
router.get('/flow/config', (req, res) => {
  res.json({
    stages: STAGES,
    entryTypes: ENTRY_TYPES
  });
});

// Trigger automated follow-ups
router.post('/flow/process-followups', async (req, res) => {
  try {
    const processedCount = await executeFollowUps();
    res.json({
      success: true,
      processedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;