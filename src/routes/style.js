const express = require('express');
const router = express.Router();
const { analyzeWritingStyle, testStyle } = require('../services/styleTrainer');
const { saveStyleProfile, loadStyleProfile, hasStyleProfile, deleteStyleProfile } = require('../services/styleManager');
const { reloadStyleProfile } = require('../services/messageProcessor');

// Train the AI on writing samples
router.post('/style/train', async (req, res) => {
  const { samples } = req.body;

  if (!samples || !Array.isArray(samples) || samples.length < 3) {
    return res.status(400).json({
      error: 'Please provide at least 3 writing samples in an array'
    });
  }

  try {
    // Analyze the writing style
    const styleProfile = await analyzeWritingStyle(samples);

    // Save it
    await saveStyleProfile(styleProfile);

    // Clear the cache so new profile is used
    reloadStyleProfile();

    res.json({
      success: true,
      message: 'Style profile created and saved!',
      styleProfile
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test the current style with a sample message
router.post('/style/test', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      error: 'Please provide a test message'
    });
  }

  try {
    const styleProfile = await loadStyleProfile();

    if (!styleProfile) {
      return res.status(404).json({
        error: 'No style profile found. Train one first using POST /style/train'
      });
    }

    const response = await testStyle(styleProfile, message);

    res.json({
      success: true,
      testMessage: message,
      aiResponse: response,
      usingStyle: true
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get current style profile
router.get('/style', async (req, res) => {
  try {
    const exists = await hasStyleProfile();

    if (!exists) {
      return res.json({
        exists: false,
        message: 'No style profile found'
      });
    }

    const styleProfile = await loadStyleProfile();

    res.json({
      exists: true,
      styleProfile
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete style profile
router.delete('/style', async (req, res) => {
  try {
    await deleteStyleProfile();
    reloadStyleProfile();

    res.json({
      success: true,
      message: 'Style profile deleted'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;