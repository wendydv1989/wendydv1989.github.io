const WENDY_VERSION = "1.0.1";
// Wendy Voice Assistant PWA
class WendyVoiceAssistant {
    constructor() {
        this.isListening = false;
        this.isProcessing = false;
        this.isMuted = false;
        this.conversationHistory = [];
        this.settings = {
            openaiKey: '',
            elevenlabsKey: '',
            gatewayUrl: 'http://100.87.212.85:18789/v1/chat/completions',
            gatewayToken: 'f71f130991e65e809ef3e7690a3317221bc7686631e4e210a9ccb662103314a4'
        };
        
        this.audioContext = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        
        this.initializeElements();
        this.loadSettings();
        this.setupEventListeners();
        this.initializeAudio();
        this.setupWakeWordDetection();
        
        // Register service worker for PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js');
        document.getElementById('versionNum').textContent = WENDY_VERSION;
        }
    }
    
    initializeElements() {
        this.orb = document.getElementById('orb');
        this.status = document.getElementById('status');
        this.toggleButton = document.getElementById('toggleButton');
        this.muteButton = document.getElementById('muteButton');
        this.conversation = document.getElementById('conversation');
        this.settingsPanel = document.getElementById('settings');
        this.settingsToggle = document.getElementById('settingsToggle');
        this.openaiKeyInput = document.getElementById('openaiKey');
        this.elevenlabsKeyInput = document.getElementById('elevenlabsKey');
        this.saveSettingsBtn = document.getElementById('saveSettings');
    }
    
    loadSettings() {
        const saved = localStorage.getItem('wendySettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
            this.openaiKeyInput.value = this.settings.openaiKey;
            this.elevenlabsKeyInput.value = this.settings.elevenlabsKey;
        }
    }
    
    saveSettings() {
        this.settings.openaiKey = this.openaiKeyInput.value;
        this.settings.elevenlabsKey = this.elevenlabsKeyInput.value;
        localStorage.setItem('wendySettings', JSON.stringify(this.settings));
        this.showStatus('Settings saved!');
        setTimeout(() => this.updateStatus(), 2000);
    }
    
    setupEventListeners() {
        this.toggleButton.addEventListener('click', () => this.toggleListening());
        this.muteButton.addEventListener('click', () => this.toggleMute());
        this.settingsToggle.addEventListener('click', () => this.toggleSettings());
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        this.orb.addEventListener('click', () => this.handleOrbClick());
    }
    
    toggleSettings() {
        this.settingsPanel.classList.toggle('open');
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        document.getElementById('muteText').textContent = this.isMuted ? '🔇' : '🔊';
        this.showStatus(this.isMuted ? 'Audio muted' : 'Audio unmuted');
    }
    
    async initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.setupMediaRecorder(stream);
            this.showStatus('Microphone ready');
        } catch (error) {
            console.error('Audio initialization failed:', error);
            this.showStatus('Microphone access denied');
        }
    }
    
    setupMediaRecorder(stream) {
        this.mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };
        
        this.mediaRecorder.onstop = () => {
            this.processAudio();
        };
    }
    
    setupWakeWordDetection() {
        // Simple browser-based wake word detection
        // This is a basic implementation - in production you'd use Porcupine
        this.isWakeWordListening = true;
        this.startWakeWordListening();
    }
    
    async startWakeWordListening() {
        if (!this.isWakeWordListening) return;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            
            recognition.onresult = (event) => {
                const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
                if (transcript.includes('wendy') && !this.isListening && !this.isProcessing) {
                    this.showStatus('Wake word detected!');
                    this.startConversation();
                }
            };
            
            recognition.onerror = (event) => {
                console.error('Wake word detection error:', event.error);
                // Restart after a delay
                setTimeout(() => this.startWakeWordListening(), 3000);
            };
            
            recognition.onend = () => {
                // Restart wake word detection
                if (this.isWakeWordListening && !this.isListening) {
                    setTimeout(() => this.startWakeWordListening(), 1000);
                }
            };
            
            recognition.start();
            this.updateStatus();
        } catch (error) {
            console.error('Wake word setup failed:', error);
            this.showStatus('Wake word detection unavailable');
        }
    }
    
    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startConversation();
        }
    }
    
    async startConversation() {
        if (this.isProcessing) return;
        
        this.isListening = true;
        this.isWakeWordListening = false;
        this.updateStatus();
        this.updateOrb('listening');
        this.showStatus('Listening...');
        
        this.audioChunks = [];
        this.mediaRecorder.start();
        
        // Auto-stop after 10 seconds or when silence detected
        setTimeout(() => {
            if (this.isListening) {
                this.stopListening();
            }
        }, 10000);
    }
    
    stopListening() {
        if (!this.isListening) return;
        
        this.isListening = false;
        this.mediaRecorder.stop();
        this.updateOrb('thinking');
        this.showStatus('Processing...');
        this.updateStatus();
    }
    
    async processAudio() {
        this.isProcessing = true;
        
        try {
            // Convert audio to blob
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            
            // Transcribe with OpenAI Whisper
            const transcript = await this.transcribeAudio(audioBlob);
            
            if (!transcript || transcript.trim() === '') {
                this.showStatus('No speech detected');
                this.resetToWakeWord();
                return;
            }
            
            this.addMessageToConversation('user', transcript);
            
            // Get AI response
            const response = await this.getAIResponse(transcript);
            this.addMessageToConversation('assistant', response);
            
            // Convert to speech and play
            await this.speakResponse(response);
            
            // Continue listening after response
            setTimeout(() => {
                this.resetToWakeWord();
            }, 1000);
            
        } catch (error) {
            console.error('Processing error:', error);
            this.showStatus('Processing failed');
            this.resetToWakeWord();
        }
        
        this.isProcessing = false;
    }
    
    async transcribeAudio(audioBlob) {
        if (!this.settings.openaiKey) {
            throw new Error('OpenAI API key required');
        }
        
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-1');
        formData.append('language', 'en');
        
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.settings.openaiKey}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Transcription failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        return result.text;
    }
    
    async getAIResponse(message) {
        const messages = [
            ...this.conversationHistory.slice(-10), // Keep last 10 messages for context
            { role: 'user', content: message }
        ];
        
        const response = await fetch(this.settings.gatewayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.settings.gatewayToken}`
            },
            body: JSON.stringify({
                model: 'openclaw',
                messages: messages
            })
        });
        
        if (!response.ok) {
            throw new Error(`AI response failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        return result.choices[0].message.content;
    }
    
    async speakResponse(text) {
        if (this.isMuted) return;
        
        this.updateOrb('speaking');
        this.showStatus('Speaking...');
        
        try {
            let audioBlob;
            
            // Try ElevenLabs first, fallback to OpenAI
            if (this.settings.elevenlabsKey) {
                audioBlob = await this.synthesizeWithElevenLabs(text);
            } else {
                audioBlob = await this.synthesizeWithOpenAI(text);
            }
            
            await this.playAudio(audioBlob);
            
        } catch (error) {
            console.error('TTS error:', error);
            this.showStatus('TTS failed');
        }
    }
    
    async synthesizeWithElevenLabs(text) {
        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': this.settings.elevenlabsKey
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_flash_v2_5',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);
        }
        
        return await response.blob();
    }
    
    async synthesizeWithOpenAI(text) {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.settings.openaiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1-hd',
                input: text,
                voice: 'nova',
                response_format: 'mp3'
            })
        });
        
        if (!response.ok) {
            throw new Error(`OpenAI TTS failed: ${response.statusText}`);
        }
        
        return await response.blob();
    }
    
    async playAudio(audioBlob) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.src = URL.createObjectURL(audioBlob);
            
            audio.onended = () => {
                URL.revokeObjectURL(audio.src);
                resolve();
            };
            
            audio.onerror = reject;
            audio.play().catch(reject);
        });
    }
    
    addMessageToConversation(role, content) {
        this.conversationHistory.push({ role, content });
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.textContent = content;
        
        this.conversation.appendChild(messageDiv);
        this.conversation.scrollTop = this.conversation.scrollHeight;
    }
    
    resetToWakeWord() {
        this.isWakeWordListening = true;
        this.updateOrb('idle');
        this.updateStatus();
        this.startWakeWordListening();
    }
    
    updateOrb(state) {
        this.orb.className = 'orb';
        if (state !== 'idle') {
            this.orb.classList.add(state);
        }
    }
    
    updateStatus() {
        const buttonText = document.getElementById('buttonText');
        
        if (this.isListening) {
            buttonText.textContent = 'Stop Listening';
            this.showStatus('Listening...');
        } else if (this.isProcessing) {
            buttonText.textContent = 'Processing...';
            this.showStatus('Processing...');
        } else {
            buttonText.textContent = 'Start Listening';
            this.showStatus('Say "Wendy" to wake me up');
        }
    }
    
    showStatus(message) {
        this.status.textContent = message;
    }
    
    handleOrbClick() {
        if (!this.isListening && !this.isProcessing) {
            this.startConversation();
        }
    }
}

// Initialize the assistant when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const assistant = new WendyVoiceAssistant();
    
    // Make it globally accessible for debugging
    window.wendy = assistant;
});