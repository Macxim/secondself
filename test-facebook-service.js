require('dotenv').config();

console.log('Testing Facebook service...');
console.log('PAGE_ACCESS_TOKEN:', process.env.FACEBOOK_PAGE_ACCESS_TOKEN ? '✅ Set' : '❌ Not set');

const facebook = require('./src/services/facebook');

console.log('✅ Facebook service loaded successfully');
console.log('Available functions:', Object.keys(facebook));