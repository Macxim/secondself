require('dotenv').config();
const express = require('express');
const webhookRoutes = require('./src/routes/webhook');
const testRoutes = require('./src/routes/test');
const styleRoutes = require('./src/routes/style');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Second Self Server is running!',
    status: 'ok',
    endpoints: {
      webhook: '/webhook',
      testMessage: 'POST /test/message',
      getConversation: 'GET /test/conversation/:senderId',
      clearConversation: 'DELETE /test/conversation/:senderId',
      trainStyle: 'POST /style/train',
      testStyle: 'POST /style/test',
      getStyle: 'GET /style',
      deleteStyle: 'DELETE /style'
    }
  });
});

// Mount routes
app.use('/', webhookRoutes);
app.use('/', testRoutes);
app.use('/', styleRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📍 Webhook available at http://localhost:${PORT}/webhook`);
  console.log(`🧪 Test endpoint at http://localhost:${PORT}/test/message`);
  console.log(`🎨 Style training at http://localhost:${PORT}/style/train`);
});