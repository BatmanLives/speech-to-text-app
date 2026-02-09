const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store transcription sessions
const sessions = new Map();

// WebSocket connection handling
wss.on('connection', (ws) => {
  const sessionId = generateSessionId();
  console.log(`New client connected: ${sessionId}`);

  sessions.set(sessionId, {
    ws,
    transcript: '',
    startTime: Date.now(),
    wordCount: 0
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const session = sessions.get(sessionId);

      switch (data.type) {
        case 'transcript':
          // Store transcript data
          if (data.isFinal) {
            session.transcript += data.text + ' ';
            session.wordCount = session.transcript.trim().split(/\s+/).length;
          }
          
          // Broadcast back to confirm receipt
          ws.send(JSON.stringify({
            type: 'ack',
            sessionId,
            wordCount: session.wordCount
          }));
          break;

        case 'get_session':
          // Send current session data
          ws.send(JSON.stringify({
            type: 'session_data',
            transcript: session.transcript,
            wordCount: session.wordCount,
            duration: Date.now() - session.startTime
          }));
          break;

        case 'clear':
          session.transcript = '';
          session.wordCount = 0;
          ws.send(JSON.stringify({
            type: 'cleared'
          }));
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${sessionId}`);
    sessions.delete(sessionId);
  });

  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connected',
    sessionId,
    message: 'Connected to speech-to-text server'
  }));
});

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    activeSessions: sessions.size,
    uptime: process.uptime()
  });
});

app.get('/api/stats', (req, res) => {
  const stats = {
    totalSessions: sessions.size,
    sessions: Array.from(sessions.values()).map((session, index) => ({
      id: index,
      wordCount: session.wordCount,
      duration: Date.now() - session.startTime
    }))
  };
  res.json(stats);
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Helper function
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎤 Speech-to-Text Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📈 Stats: http://localhost:${PORT}/api/stats`);
});
