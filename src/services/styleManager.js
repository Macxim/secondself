const fs = require('fs').promises;
const path = require('path');

const STYLE_FILE = path.join(__dirname, '../../data/user-style.json');

/**
 * Save style profile to file
 */
async function saveStyleProfile(styleProfile) {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '../../data');
    await fs.mkdir(dataDir, { recursive: true });

    const data = {
      styleProfile,
      createdAt: new Date().toISOString(),
      version: 1
    };

    await fs.writeFile(STYLE_FILE, JSON.stringify(data, null, 2));
    console.log('💾 Style profile saved!');

  } catch (error) {
    console.error('❌ Error saving style profile:', error.message);
    throw error;
  }
}

/**
 * Load style profile from file
 */
async function loadStyleProfile() {
  try {
    const data = await fs.readFile(STYLE_FILE, 'utf8');
    const parsed = JSON.parse(data);
    console.log('📖 Style profile loaded');
    return parsed.styleProfile;

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️  No style profile found');
      return null;
    }
    console.error('❌ Error loading style profile:', error.message);
    throw error;
  }
}

/**
 * Check if style profile exists
 */
async function hasStyleProfile() {
  try {
    await fs.access(STYLE_FILE);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete style profile
 */
async function deleteStyleProfile() {
  try {
    await fs.unlink(STYLE_FILE);
    console.log('🗑️  Style profile deleted');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

module.exports = {
  saveStyleProfile,
  loadStyleProfile,
  hasStyleProfile,
  deleteStyleProfile
};