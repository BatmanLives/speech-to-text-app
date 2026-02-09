// WebSocket connection
let ws = null;
let sessionId = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Speech recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;
let finalTranscriptText = '';
let startTime = null;
let durationInterval = null;

// DOM elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const statusIndicator = document.getElementById('statusIndicator');
const errorContainer = document.getElementById('errorContainer');
const errorMessage = document.getElementById('errorMessage');
const successContainer = document.getElementById('successContainer');
const successMessage = document.getElementById('successMessage');
const emptyState = document.getElementById('emptyState');
const transcriptContainer = document.getElementById('transcriptContainer');
const finalTranscript = document.getElementById('finalTranscript');
const interimTranscript = document.getElementById('interimTranscript');
const cursor = document.getElementById('cursor');
const stats = document.getElementById('stats');
const wordCount = document.getElementById('wordCount');
const charCount = document.getElementById('charCount');
const duration = document.getElementById('duration');
const connectionStatus = document.getElementById('connectionStatus');

// Initialize WebSocket connection
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('Connected to server');
        reconnectAttempts = 0;
        updateConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleServerMessage(data);
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    };

    ws.onclose = () => {
        console.log('Disconnected from server');
        updateConnectionStatus('disconnected');
        
        // Attempt to reconnect
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            setTimeout(() => {
                console.log(`Reconnecting... attempt ${reconnectAttempts}`);
                connectWebSocket();
            }, 2000 * reconnectAttempts);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus('error');
    };
}

// Handle messages from server
function handleServerMessage(data) {
    switch (data.type) {
        case 'connected':
            sessionId = data.sessionId;
            console.log('Session ID:', sessionId);
            break;
        case 'ack':
            // Server acknowledged receipt
            break;
        case 'session_data':
            // Received session data
            console.log('Session data:', data);
            break;
        case 'cleared':
            showSuccess('Transcript cleared on server');
            break;
    }
}

// Update connection status indicator
function updateConnectionStatus(status) {
    const statusDot = connectionStatus.querySelector('div');
    const statusText = connectionStatus.querySelector('span');
    
    switch (status) {
        case 'connected':
            statusDot.className = 'w-2 h-2 rounded-full bg-green-500 pulse-ring';
            statusText.textContent = 'Connected';
            connectionStatus.className = 'mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100';
            break;
        case 'disconnected':
            statusDot.className = 'w-2 h-2 rounded-full bg-red-500';
            statusText.textContent = 'Disconnected';
            connectionStatus.className = 'mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-100';
            break;
        case 'error':
            statusDot.className = 'w-2 h-2 rounded-full bg-yellow-500';
            statusText.textContent = 'Connection Error';
            connectionStatus.className = 'mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100';
            break;
    }
}

// Send data to server via WebSocket
function sendToServer(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

// Initialize speech recognition
function initSpeechRecognition() {
    if (!SpeechRecognition) {
        showError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
        startBtn.disabled = true;
        return false;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                final += transcript + ' ';
            } else {
                interim += transcript;
            }
        }

        if (final) {
            finalTranscriptText += final;
            finalTranscript.textContent = finalTranscriptText;
            
            // Send to server
            sendToServer({
                type: 'transcript',
                text: final,
                isFinal: true,
                timestamp: Date.now()
            });
            
            updateStats();
        }
        interimTranscript.textContent = interim;
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        let errorMsg = '';
        
        if (event.error === 'no-speech') {
            errorMsg = 'No speech detected. Please try again.';
        } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            errorMsg = 'Microphone access denied. Please allow microphone permissions in your browser settings.';
        } else if (event.error === 'network') {
            errorMsg = 'Network error. Please check your internet connection.';
        } else {
            errorMsg = `Error: ${event.error}`;
        }
        
        showError(errorMsg);
        stopListening();
    };

    recognition.onend = () => {
        if (isListening) {
            try {
                recognition.start();
            } catch (e) {
                console.error('Failed to restart recognition:', e);
                stopListening();
            }
        }
    };

    return true;
}

// Start listening
async function startListening() {
    try {
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        
        hideError();
        isListening = true;
        startTime = Date.now();
        recognition.start();
        
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        statusIndicator.classList.remove('hidden');
        emptyState.classList.add('hidden');
        transcriptContainer.classList.remove('hidden');
        cursor.classList.remove('hidden');
        stats.classList.remove('hidden');
        
        // Start duration timer
        durationInterval = setInterval(updateDuration, 1000);
        
        showSuccess('Recording started');
    } catch (err) {
        console.error('Microphone error:', err);
        showError('Failed to access microphone. Please check your browser permissions.');
    }
}

// Stop listening
function stopListening() {
    isListening = false;
    if (recognition) {
        recognition.stop();
    }
    
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    statusIndicator.classList.add('hidden');
    cursor.classList.add('hidden');
    interimTranscript.textContent = '';
    
    // Stop duration timer
    if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
    }
    
    showSuccess('Recording stopped');
}

// Clear transcript
function clearTranscript() {
    finalTranscriptText = '';
    finalTranscript.textContent = '';
    interimTranscript.textContent = '';
    hideError();
    hideSuccess();
    
    // Send clear command to server
    sendToServer({
        type: 'clear'
    });
    
    if (!isListening) {
        emptyState.classList.remove('hidden');
        transcriptContainer.classList.add('hidden');
        stats.classList.add('hidden');
    }
    
    updateStats();
    showSuccess('Transcript cleared');
}

// Copy to clipboard
function copyToClipboard() {
    if (finalTranscriptText) {
        navigator.clipboard.writeText(finalTranscriptText).then(() => {
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Copied!
            `;
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
            }, 2000);
            showSuccess('Copied to clipboard');
        }).catch(err => {
            showError('Failed to copy to clipboard');
        });
    }
}

// Download transcript
function downloadTranscript() {
    if (finalTranscriptText) {
        const blob = new Blob([finalTranscriptText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcript_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showSuccess('Transcript downloaded');
    }
}

// Update statistics
function updateStats() {
    const words = finalTranscriptText.trim().split(/\s+/).filter(w => w.length > 0);
    wordCount.textContent = words.length;
    charCount.textContent = finalTranscriptText.length;
}

// Update duration
function updateDuration() {
    if (startTime) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        duration.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Show error message
function showError(msg) {
    errorMessage.textContent = msg;
    errorContainer.classList.remove('hidden');
    setTimeout(() => {
        hideError();
    }, 5000);
}

// Hide error message
function hideError() {
    errorContainer.classList.add('hidden');
}

// Show success message
function showSuccess(msg) {
    successMessage.textContent = msg;
    successContainer.classList.remove('hidden');
    setTimeout(() => {
        hideSuccess();
    }, 3000);
}

// Hide success message
function hideSuccess() {
    successContainer.classList.add('hidden');
}

// Event listeners
startBtn.addEventListener('click', startListening);
stopBtn.addEventListener('click', stopListening);
clearBtn.addEventListener('click', clearTranscript);
copyBtn.addEventListener('click', copyToClipboard);
downloadBtn.addEventListener('click', downloadTranscript);

// Initialize on page load
window.addEventListener('load', () => {
    connectWebSocket();
    if (initSpeechRecognition()) {
        console.log('Speech recognition initialized');
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (ws) {
        ws.close();
    }
    if (recognition && isListening) {
        recognition.stop();
    }
});
