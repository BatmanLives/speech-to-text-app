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
let transcriptLinesArray = []; // Array to store transcript lines with timestamps
let startTime = null;
let durationInterval = null;
let showTimestamps = true;

// Tab recording
let recordingMode = 'none'; // 'microphone', 'tab', or 'none'
let displayStream = null;
let tabRecognition = null;

// DOM elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const saveCloudBtn = document.getElementById('saveCloudBtn');
const refreshSavedBtn = document.getElementById('refreshSavedBtn');
const languageSelect = document.getElementById('languageSelect');
const timestampToggle = document.getElementById('timestampToggle');
const statusIndicator = document.getElementById('statusIndicator');
const errorContainer = document.getElementById('errorContainer');
const errorMessage = document.getElementById('errorMessage');
const successContainer = document.getElementById('successContainer');
const successMessage = document.getElementById('successMessage');
const emptyState = document.getElementById('emptyState');
const transcriptContainer = document.getElementById('transcriptContainer');
const transcriptLines = document.getElementById('transcriptLines');
const interimTranscript = document.getElementById('interimTranscript');
const cursor = document.getElementById('cursor');
const stats = document.getElementById('stats');
const wordCount = document.getElementById('wordCount');
const charCount = document.getElementById('charCount');
const duration = document.getElementById('duration');
const connectionStatus = document.getElementById('connectionStatus');
const savedTranscripts = document.getElementById('savedTranscripts');

// Tab recording DOM elements
const recordTabBtn = document.getElementById('recordTabBtn');
const tabRecordingModal = document.getElementById('tabRecordingModal');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalStartBtn = document.getElementById('modalStartBtn');

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
    recognition.lang = languageSelect.value || 'en-US';

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
            const timestamp = new Date();
            const timeString = timestamp.toLocaleTimeString();
            
            // Add to transcript lines with timestamp
            transcriptLinesArray.push({
                text: final.trim(),
                timestamp: timeString,
                fullTimestamp: timestamp
            });
            
            finalTranscriptText += final;
            renderTranscriptLines();
            
            // Send to server
            sendToServer({
                type: 'transcript',
                text: final,
                timestamp: timestamp.toISOString(),
                isFinal: true
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
    // Check if tab recording is active
    if (recordingMode === 'tab') {
        showError('Please stop tab recording first');
        return;
    }

    try {
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());

        hideError();
        isListening = true;
        recordingMode = 'microphone';
        startTime = Date.now();
        recognition.start();

        // Disable tab recording button
        recordTabBtn.disabled = true;
        recordTabBtn.classList.add('opacity-50', 'cursor-not-allowed');

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
    recordingMode = 'none';

    if (recognition) {
        recognition.stop();
    }

    // Re-enable tab recording button
    recordTabBtn.disabled = false;
    recordTabBtn.classList.remove('opacity-50', 'cursor-not-allowed');

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
    transcriptLinesArray = [];
    transcriptLines.innerHTML = '';
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
        let content = '';
        
        if (showTimestamps && transcriptLinesArray.length > 0) {
            // Download with timestamps
            content = transcriptLinesArray.map(line => 
                `[${line.timestamp}] ${line.text}`
            ).join('\n\n');
        } else {
            content = finalTranscriptText;
        }
        
        const blob = new Blob([content], { type: 'text/plain' });
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

// Render transcript lines with timestamps
function renderTranscriptLines() {
    transcriptLines.innerHTML = '';
    
    transcriptLinesArray.forEach((line, index) => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'mb-3';
        
        if (showTimestamps) {
            const timestampSpan = document.createElement('span');
            timestampSpan.className = 'text-xs text-blue-600 font-mono mr-2';
            timestampSpan.textContent = `[${line.timestamp}]`;
            lineDiv.appendChild(timestampSpan);
        }
        
        const textSpan = document.createElement('span');
        textSpan.className = 'text-lg text-gray-800';
        textSpan.textContent = line.text;
        lineDiv.appendChild(textSpan);
        
        transcriptLines.appendChild(lineDiv);
    });
    
    // Auto-scroll to bottom
    const transcriptBox = document.getElementById('transcriptBox');
    transcriptBox.scrollTop = transcriptBox.scrollHeight;
}

// Save transcript to cloud storage (localStorage for now)
function saveToCloud() {
    if (!finalTranscriptText) {
        showError('No transcript to save');
        return;
    }
    
    const transcriptData = {
        id: Date.now(),
        text: finalTranscriptText,
        lines: transcriptLinesArray,
        language: languageSelect.value,
        date: new Date().toISOString(),
        wordCount: finalTranscriptText.trim().split(/\s+/).filter(w => w.length > 0).length,
        duration: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0,
        source: recordingMode === 'tab' ? 'tab' : 'microphone'
    };
    
    // Get existing transcripts
    const saved = JSON.parse(localStorage.getItem('savedTranscripts') || '[]');
    saved.unshift(transcriptData); // Add to beginning
    
    // Keep only last 50 transcripts
    if (saved.length > 50) {
        saved.pop();
    }
    
    localStorage.setItem('savedTranscripts', JSON.stringify(saved));
    showSuccess('Transcript saved to cloud!');
    loadSavedTranscripts();
}

// Load saved transcripts from cloud storage
function loadSavedTranscripts() {
    const saved = JSON.parse(localStorage.getItem('savedTranscripts') || '[]');
    
    if (saved.length === 0) {
        savedTranscripts.innerHTML = '<p class="text-gray-500 text-sm">No saved transcripts yet. Click "Save to Cloud" to save your first transcript!</p>';
        return;
    }
    
    savedTranscripts.innerHTML = '';
    
    saved.forEach((transcript, index) => {
        const div = document.createElement('div');
        div.className = 'border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors';
        
        const date = new Date(transcript.date);
        const dateString = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        div.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div>
                    <p class="font-semibold text-gray-800">Transcript #${saved.length - index}</p>
                    <p class="text-xs text-gray-500">${dateString}</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="loadTranscript(${transcript.id})" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Load
                    </button>
                    <button onclick="deleteTranscript(${transcript.id})" class="text-red-600 hover:text-red-800 text-sm font-medium">
                        Delete
                    </button>
                </div>
            </div>
            <p class="text-sm text-gray-600 mb-2 line-clamp-2">${transcript.text.substring(0, 150)}${transcript.text.length > 150 ? '...' : ''}</p>
            <div class="flex gap-4 text-xs text-gray-500">
                <span>📝 ${transcript.wordCount} words</span>
                <span>⏱️ ${Math.floor(transcript.duration / 60)}:${(transcript.duration % 60).toString().padStart(2, '0')}</span>
                <span>🌍 ${transcript.language}</span>
                <span>${transcript.source === 'tab' ? '🖥️ Browser Tab' : '🎤 Microphone'}</span>
            </div>
        `;
        
        savedTranscripts.appendChild(div);
    });
}

// Load a specific transcript
window.loadTranscript = function(id) {
    const saved = JSON.parse(localStorage.getItem('savedTranscripts') || '[]');
    const transcript = saved.find(t => t.id === id);
    
    if (transcript) {
        transcriptLinesArray = transcript.lines || [];
        finalTranscriptText = transcript.text;
        renderTranscriptLines();
        updateStats();
        
        emptyState.classList.add('hidden');
        transcriptContainer.classList.remove('hidden');
        stats.classList.remove('hidden');
        
        showSuccess('Transcript loaded!');
    }
};

// Delete a specific transcript
window.deleteTranscript = function(id) {
    if (confirm('Are you sure you want to delete this transcript?')) {
        const saved = JSON.parse(localStorage.getItem('savedTranscripts') || '[]');
        const filtered = saved.filter(t => t.id !== id);
        localStorage.setItem('savedTranscripts', JSON.stringify(filtered));
        loadSavedTranscripts();
        showSuccess('Transcript deleted');
    }
};

// ========== TAB RECORDING FUNCTIONS ==========

// Show tab recording modal
function showTabRecordingModal() {
    tabRecordingModal.classList.remove('hidden');
}

// Close modal
function closeModal() {
    tabRecordingModal.classList.add('hidden');
}

// Start tab recording
async function startTabRecording() {
    try {
        hideError();

        // Request display media with audio
        displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true, // Required even though we only want audio
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });

        // Check if audio track exists
        const audioTrack = displayStream.getAudioTracks()[0];
        if (!audioTrack) {
            throw new Error('No audio track available. Make sure to check "Share audio" when selecting the tab.');
        }

        // Create audio context and route audio to speech recognition
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(displayStream);
        const dest = audioContext.createMediaStreamDestination();
        source.connect(dest);

        // Initialize tab recognition with the audio stream
        tabRecognition = new SpeechRecognition();
        tabRecognition.continuous = true;
        tabRecognition.interimResults = true;
        tabRecognition.lang = languageSelect.value || 'en-US';

        // Set up recognition handlers
        tabRecognition.onresult = (event) => {
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
                const timestamp = new Date();
                const timeString = timestamp.toLocaleTimeString();

                transcriptLinesArray.push({
                    text: final.trim(),
                    timestamp: timeString,
                    fullTimestamp: timestamp
                });

                finalTranscriptText += final;
                renderTranscriptLines();

                // Send to server
                sendToServer({
                    type: 'transcript',
                    text: final,
                    timestamp: timestamp.toISOString(),
                    isFinal: true,
                    source: 'tab'
                });

                updateStats();
            }
            interimTranscript.textContent = interim;
        };

        tabRecognition.onerror = (event) => {
            console.error('Tab speech recognition error:', event.error);
            let errorMsg = '';

            if (event.error === 'no-speech') {
                errorMsg = 'No speech detected in tab audio.';
            } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
                errorMsg = 'Microphone access denied.';
            } else if (event.error === 'network') {
                errorMsg = 'Network error.';
            } else {
                errorMsg = `Error: ${event.error}`;
            }

            showError(errorMsg);
        };

        tabRecognition.onend = () => {
            if (recordingMode === 'tab') {
                try {
                    tabRecognition.start();
                } catch (e) {
                    console.error('Failed to restart tab recognition:', e);
                    stopTabRecording();
                }
            }
        };

        // Detect when tab is closed or sharing stopped
        displayStream.getVideoTracks()[0].onended = () => {
            showError('Tab sharing stopped');
            stopTabRecording();
        };

        // Start recognition
        recordingMode = 'tab';
        startTime = Date.now();
        tabRecognition.start();

        // Update UI
        startBtn.disabled = true;
        startBtn.classList.add('opacity-50', 'cursor-not-allowed');
        recordTabBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        statusIndicator.classList.remove('hidden');
        emptyState.classList.add('hidden');
        transcriptContainer.classList.remove('hidden');
        cursor.classList.remove('hidden');
        stats.classList.remove('hidden');

        // Change status indicator to orange for tab mode
        statusIndicator.querySelector('span').textContent = 'Recording from tab...';
        statusIndicator.classList.add('text-orange-100');

        // Start duration timer
        durationInterval = setInterval(updateDuration, 1000);

        showSuccess('Recording tab audio');

    } catch (err) {
        console.error('Tab recording error:', err);
        if (err.name === 'NotAllowedError') {
            showError('Tab selection cancelled or permission denied');
        } else if (err.message.includes('No audio track')) {
            showError(err.message);
        } else {
            showError('Failed to start tab recording: ' + err.message);
        }

        // Cleanup
        if (displayStream) {
            displayStream.getTracks().forEach(track => track.stop());
            displayStream = null;
        }
        recordingMode = 'none';
    }
}

// Stop tab recording
function stopTabRecording() {
    recordingMode = 'none';

    if (tabRecognition) {
        tabRecognition.stop();
        tabRecognition = null;
    }

    if (displayStream) {
        displayStream.getTracks().forEach(track => track.stop());
        displayStream = null;
    }

    // Update UI
    startBtn.disabled = false;
    startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    recordTabBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    statusIndicator.classList.add('hidden');
    statusIndicator.classList.remove('text-orange-100');
    cursor.classList.add('hidden');
    interimTranscript.textContent = '';

    // Stop duration timer
    if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
    }

    showSuccess('Tab recording stopped');
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
stopBtn.addEventListener('click', () => {
    if (recordingMode === 'tab') {
        stopTabRecording();
    } else {
        stopListening();
    }
});
clearBtn.addEventListener('click', clearTranscript);
copyBtn.addEventListener('click', copyToClipboard);
downloadBtn.addEventListener('click', downloadTranscript);
saveCloudBtn.addEventListener('click', saveToCloud);
refreshSavedBtn.addEventListener('click', loadSavedTranscripts);

// Tab recording listeners
recordTabBtn.addEventListener('click', showTabRecordingModal);
modalCancelBtn.addEventListener('click', closeModal);
modalStartBtn.addEventListener('click', () => {
    closeModal();
    startTabRecording();
});

// Close modal on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !tabRecordingModal.classList.contains('hidden')) {
        closeModal();
    }
});

// Language selection
languageSelect.addEventListener('change', () => {
    if (isListening) {
        // Restart recognition with new language
        stopListening();
        setTimeout(() => {
            recognition.lang = languageSelect.value;
            startListening();
        }, 500);
    } else if (recognition) {
        recognition.lang = languageSelect.value;
    }
    showSuccess(`Language changed to ${languageSelect.options[languageSelect.selectedIndex].text}`);
});

// Timestamp toggle
timestampToggle.addEventListener('change', (e) => {
    showTimestamps = e.target.checked;
    renderTranscriptLines();
    showSuccess(showTimestamps ? 'Timestamps enabled' : 'Timestamps disabled');
});

// Initialize on page load
window.addEventListener('load', () => {
    connectWebSocket();
    if (initSpeechRecognition()) {
        console.log('Speech recognition initialized');
    }
    loadSavedTranscripts();

    // Check browser compatibility for tab recording
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        recordTabBtn.disabled = true;
        recordTabBtn.classList.add('opacity-50', 'cursor-not-allowed');
        recordTabBtn.title = 'Not supported in this browser. Please use Chrome or Edge.';
        console.warn('getDisplayMedia not supported - tab recording disabled');
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
    if (tabRecognition && recordingMode === 'tab') {
        tabRecognition.stop();
    }
    if (displayStream) {
        displayStream.getTracks().forEach(track => track.stop());
    }
});
