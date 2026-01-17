require('dotenv').config();
const express = require('express');
const path = require('path');
const webhookRoutes = require('./src/routes/webhook');
const testRoutes = require('./src/routes/test');
const styleRoutes = require('./src/routes/style');
const dashboardRoutes = require('./src/routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public')); // Serve static files

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Messenger AI Clone Server is running!',
    status: 'ok',
    dashboard: '/dashboard.html',
    endpoints: {
      webhook: '/webhook',
      testMessage: 'POST /test/message',
      getConversation: 'GET /test/conversation/:senderId',
      clearConversation: 'DELETE /test/conversation/:senderId',
      trainStyle: 'POST /style/train',
      testStyle: 'POST /style/test',
      getStyle: 'GET /style',
      deleteStyle: 'DELETE /style',
      dashboard: 'GET /dashboard.html'
    }
  });
});

// Mount routes
app.use('/', webhookRoutes);
app.use('/', testRoutes);
app.use('/', styleRoutes);
app.use('/', dashboardRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📍 Webhook available at http://localhost:${PORT}/webhook`);
  console.log(`🧪 Test endpoint at http://localhost:${PORT}/test/message`);
  console.log(`🎨 Style training at http://localhost:${PORT}/style/train`);
  console.log(`📊 Dashboard at http://localhost:${PORT}/dashboard.html`);
});