# Speech to Text Web App

A real-time speech-to-text web application with WebSocket support for live transcription streaming.

## Features

- 🎤 Real-time speech recognition
- 🔄 WebSocket-based server synchronization
- 📊 Live statistics (word count, character count, duration)
- 💾 Download transcripts as text files
- 📋 Copy to clipboard
- 🔌 Auto-reconnect on connection loss
- 📱 Responsive design
- ⚡ Low latency streaming

## Tech Stack

- **Backend**: Node.js, Express, WebSocket (ws)
- **Frontend**: Vanilla JavaScript, Tailwind CSS
- **API**: Web Speech API (Speech Recognition)

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Modern browser (Chrome, Edge, or Safari recommended)

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **For development (with auto-reload):**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Usage

1. Click "Start Listening" button
2. Allow microphone permissions when prompted
3. Start speaking - your words will appear in real-time
4. Click "Stop Listening" when done
5. Use "Copy" to copy transcript or "Download" to save as file
6. Click "Clear" to start a new transcription

## API Endpoints

### REST Endpoints

- `GET /` - Serve the main application
- `GET /api/health` - Health check endpoint
  ```json
  {
    "status": "healthy",
    "activeSessions": 2,
    "uptime": 3600
  }
  ```
- `GET /api/stats` - Get server statistics
  ```json
  {
    "totalSessions": 2,
    "sessions": [...]
  }
  ```

### WebSocket Messages

**Client → Server:**
```json
{
  "type": "transcript",
  "text": "hello world",
  "isFinal": true,
  "timestamp": 1234567890
}
```

**Server → Client:**
```json
{
  "type": "ack",
  "sessionId": "session_123",
  "wordCount": 42
}
```

## Configuration

You can configure the server port by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## Browser Compatibility

- ✅ Chrome (recommended)
- ✅ Edge
- ✅ Safari
- ❌ Firefox (limited Web Speech API support)

## Deployment

### Deploy to Heroku

1. Create a Heroku app:
   ```bash
   heroku create your-app-name
   ```

2. Push to Heroku:
   ```bash
   git push heroku main
   ```

3. Open the app:
   ```bash
   heroku open
   ```

### Deploy to Railway

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Initialize and deploy:
   ```bash
   railway init
   railway up
   ```

### Deploy to Render

1. Create a new Web Service on Render
2. Connect your repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Deploy

## Project Structure

```
speech-to-text-app/
├── server.js              # Express server with WebSocket
├── package.json           # Dependencies and scripts
├── public/
│   ├── index.html        # Main HTML page
│   └── app.js            # Frontend JavaScript
└── README.md             # This file
```

## Troubleshooting

**Microphone not working:**
- Check browser permissions
- Make sure you're using HTTPS in production
- Ensure no other application is using the microphone

**WebSocket connection fails:**
- Check firewall settings
- Verify the server is running
- Check browser console for errors

**Recognition stops unexpectedly:**
- Check network connection
- Verify browser compatibility
- Look for errors in console

## Future Enhancements

- [ ] Multi-language support
- [ ] Custom vocabulary
- [ ] Export to different formats (PDF, DOCX)
- [ ] User authentication
- [ ] Session persistence
- [ ] Cloud storage integration
- [ ] Real-time collaboration

## License

MIT

## Support

For issues and questions, please open an issue on the repository.
