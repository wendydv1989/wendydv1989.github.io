# Wendy Voice Assistant PWA

A "Her"-style voice assistant Progressive Web App with wake word detection, speech-to-text, AI conversation, and text-to-speech.

## Features

- **Wake Word Detection**: Always listening for "Wendy" to start conversations
- **Speech-to-Text**: OpenAI Whisper API for accurate transcription
- **AI Chat**: Integration with Clawdbot gateway for intelligent responses
- **Text-to-Speech**: ElevenLabs (Rachel voice) with OpenAI TTS fallback
- **Continuous Conversation**: Automatic return to listening after responses
- **PWA Support**: Installable on mobile devices
- **Beautiful UI**: Minimalist dark theme with pulsing orb animations

## Setup

1. **API Keys Required**:
   - OpenAI API key for Whisper STT and TTS fallback
   - ElevenLabs API key (optional, for premium TTS)

2. **Installation**:
   - Open the PWA in your browser
   - Click the settings gear (⚙️) in the top right
   - Enter your API keys and save
   - Grant microphone permissions when prompted

3. **Mobile Installation**:
   - Open in mobile browser
   - Use "Add to Home Screen" option
   - App will work offline for the interface

## Usage

1. **Wake Word**: Say "Wendy" to start a conversation
2. **Manual**: Click the orb or "Start Listening" button
3. **Conversation**: Speak naturally after activation
4. **Continuous**: App automatically returns to listening after each response

## Voice States

- **Idle**: Orange orb - listening for wake word
- **Listening**: Blue orb with pulse - recording your voice
- **Thinking**: Purple orb - processing and getting AI response
- **Speaking**: Green orb - playing TTS response

## Technical Details

- **STT**: OpenAI Whisper-1 model
- **AI Gateway**: http://100.87.212.85:18789/v1/chat/completions
- **TTS**: ElevenLabs eleven_flash_v2_5 model (Rachel voice)
- **TTS Fallback**: OpenAI TTS-1-HD model (Nova voice)
- **Wake Word**: Browser SpeechRecognition API
- **Framework**: Vanilla JavaScript PWA
- **Hosting**: GitHub Pages

## Development

```bash
# Serve locally
python3 -m http.server 8000

# Or with Node.js
npx serve .
```

Visit http://localhost:8000 and test with your API keys.

## Deployment

Hosted on GitHub Pages at: https://wendydv1989.github.io/voice/

## Browser Support

- Chrome/Chromium (recommended)
- Firefox (limited SpeechRecognition support)
- Safari (iOS - limited wake word support)

## Privacy

- All voice data is processed through OpenAI Whisper API
- Conversation history stored locally only
- API keys stored in browser localStorage
- No data persisted on servers beyond API calls

## License

MIT License - Feel free to fork and customize!