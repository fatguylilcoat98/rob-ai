/*
 * Rob-AI - Frontend Application
 * Direct assistant for business strategy and LinkedIn content
 * No applause. Just results.
 */

class RobAI {
  constructor() {
    this.userId = this.getUserId();
    this.currentLanguage = 'es'; // Default to Spanish
    this.isVoiceEnabled = false;
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];

    // DOM Elements
    this.app = document.getElementById('app');
    this.chatMessages = document.getElementById('chatMessages');
    this.messageInput = document.getElementById('messageInput');
    this.sendButton = document.getElementById('sendButton');
    this.chatForm = document.getElementById('chatForm');
    this.typingIndicator = document.getElementById('typingIndicator');
    this.charCount = document.getElementById('charCount');

    // Control buttons
    this.langToggle = document.getElementById('langToggle');
    this.voiceToggle = document.getElementById('voiceToggle');
    this.voiceInputBtn = document.getElementById('voiceInputBtn');
    this.deleteDataBtn = document.getElementById('deleteData');

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateCharCount();
    this.detectUserLanguage();
    this.messageInput.focus(); // Focus immediately for instant chat

    // Load voices for speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices(); // Trigger loading
      window.addEventListener('voiceschanged', () => {
        this.voicesLoaded = true;
      });
    }
  }

  getUserId() {
    let userId = localStorage.getItem('rob-user-id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('rob-user-id', userId);
    }
    return userId;
  }

  detectUserLanguage() {
    // Detect browser language
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang.startsWith('en')) {
      this.setLanguage('en');
    } else {
      this.setLanguage('es'); // Default to Spanish
    }
  }

  setLanguage(lang) {
    this.currentLanguage = lang;
    document.body.className = `lang-${lang}`;

    // Update placeholders
    if (lang === 'en') {
      this.messageInput.placeholder = 'Type your question here...';
      this.langToggle.textContent = 'EN';
    } else {
      this.messageInput.placeholder = 'Escribe tu pregunta aquí...';
      this.langToggle.textContent = 'ES';
    }

    // Update voice button text visibility
    const esTexts = document.querySelectorAll('.btn-text-es');
    const enTexts = document.querySelectorAll('.btn-text-en');

    if (lang === 'en') {
      esTexts.forEach(el => el.style.display = 'none');
      enTexts.forEach(el => el.style.display = 'inline');
    } else {
      esTexts.forEach(el => el.style.display = 'inline');
      enTexts.forEach(el => el.style.display = 'none');
    }

    // Update voice recognition language if currently recording
    if (this.recognition && this.isRecording) {
      console.log(`Switching speech recognition to ${lang}`);
      this.stopSpeechRecognition();
      // Small delay to ensure proper restart
      setTimeout(() => {
        this.startSpeechRecognition();
      }, 100);
    }

    console.log(`Language switched to ${lang}, voice will use ${lang === 'en' ? 'en-US' : 'es-ES'}`);
  }

  setupEventListeners() {
    // Language toggle
    this.langToggle.addEventListener('click', () => {
      const newLang = this.currentLanguage === 'es' ? 'en' : 'es';
      this.setLanguage(newLang);
    });

    // Voice toggle
    this.voiceToggle.addEventListener('click', () => {
      this.isVoiceEnabled = !this.isVoiceEnabled;
      this.voiceToggle.classList.toggle('active', this.isVoiceEnabled);

      if (this.isVoiceEnabled) {
        this.requestMicrophonePermission();
      }
    });

    // Voice input - always available
    this.voiceInputBtn.addEventListener('click', () => {
      this.toggleVoiceInput();
    });

    // Delete data
    this.deleteDataBtn.addEventListener('click', () => {
      this.deleteUserData();
    });

    // Chat form
    this.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendMessage();
    });

    // Message input
    this.messageInput.addEventListener('input', () => {
      this.updateCharCount();
      this.updateSendButton();
      this.autoResize();
    });

    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!this.sendButton.disabled) {
          this.sendMessage();
        }
      }
    });
  }

  updateCharCount() {
    const length = this.messageInput.value.length;
    this.charCount.textContent = `${length}/1000`;

    if (length > 900) {
      this.charCount.style.color = 'var(--accent-color)';
    } else {
      this.charCount.style.color = 'var(--text-muted)';
    }
  }

  updateSendButton() {
    const hasText = this.messageInput.value.trim().length > 0;
    this.sendButton.disabled = !hasText;
  }

  autoResize() {
    this.messageInput.style.height = 'auto';
    this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
  }

  async requestMicrophonePermission() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      console.error('Microphone permission denied:', error);
      this.isVoiceEnabled = false;
      this.voiceToggle.classList.remove('active');
      this.showError(
        this.currentLanguage === 'en'
          ? 'Microphone access denied. Please enable in your browser settings.'
          : 'Acceso al micrófono denegado. Por favor habilítalo en la configuración del navegador.'
      );
    }
  }

  toggleVoiceInput() {
    if (this.isRecording) {
      this.stopSpeechRecognition();
    } else {
      this.startSpeechRecognition();
    }
  }

  startSpeechRecognition() {
    // Check for speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.showError(
        this.currentLanguage === 'en'
          ? 'Speech recognition not supported in this browser.'
          : 'Reconocimiento de voz no soportado en este navegador.'
      );
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    // Set language based on current UI language - seamless switching
    this.recognition.lang = this.currentLanguage === 'en' ? 'en-US' : 'es-ES';

    let finalTranscript = '';

    this.recognition.onstart = () => {
      this.isRecording = true;
      this.voiceInputBtn.classList.add('recording');
      console.log(`Speech recognition started in ${this.recognition.lang}`);
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Show live transcription in input field
      this.messageInput.value = finalTranscript + interimTranscript;
      this.updateCharCount();
      this.updateSendButton();
      this.autoResize();
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.stopSpeechRecognition();

      // More specific error messages
      let errorMessage;
      if (event.error === 'not-allowed') {
        errorMessage = this.currentLanguage === 'en'
          ? 'Microphone access denied. Please allow microphone access.'
          : 'Acceso al micrófono denegado. Por favor permite el acceso al micrófono.';
      } else {
        errorMessage = this.currentLanguage === 'en'
          ? 'Speech recognition error. Please try again.'
          : 'Error de reconocimiento de voz. Intenta de nuevo.';
      }
      this.showError(errorMessage);
    };

    this.recognition.onend = () => {
      if (this.isRecording) {
        // Recognition ended unexpectedly, restart with current language
        this.recognition.lang = this.currentLanguage === 'en' ? 'en-US' : 'es-ES';
        try {
          this.recognition.start();
        } catch (error) {
          console.error('Failed to restart recognition:', error);
          this.stopSpeechRecognition();
        }
      }
    };

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.showError(
        this.currentLanguage === 'en'
          ? 'Could not start speech recognition.'
          : 'No se pudo iniciar el reconocimiento de voz.'
      );
    }
  }

  stopSpeechRecognition() {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    this.isRecording = false;
    this.voiceInputBtn.classList.remove('recording');
  }

  async sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message) return;

    // Add user message to chat
    this.addMessage(message, 'user');

    // Clear input
    this.messageInput.value = '';
    this.updateCharCount();
    this.updateSendButton();
    this.autoResize();

    // Show typing indicator
    this.showTyping();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          userId: this.userId
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Hide typing indicator
        this.hideTyping();

        // Add Rob's response
        this.addMessage(data.response, 'rob');

        // Play voice response if enabled
        if (this.isVoiceEnabled) {
          this.speakResponse(data.response);
        }

      } else {
        throw new Error(data.error || 'Unknown error');
      }

    } catch (error) {
      console.error('Chat error:', error);
      this.hideTyping();

      const errorMessage = this.currentLanguage === 'en'
        ? 'Sorry, I\'m having technical issues. Try again in a moment.'
        : 'Disculpa, tengo problemas técnicos. Intenta de nuevo en un momento.';

      this.addMessage(errorMessage, 'rob');
    }
  }

  addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (sender === 'rob') {
      // Format Rob's responses (support for basic markdown-like formatting)
      const formattedText = this.formatRobResponse(text);
      contentDiv.innerHTML = formattedText;

      // Add speaker button for Rob's messages
      const speakerBtn = document.createElement('button');
      speakerBtn.className = 'speaker-btn';
      speakerBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 10V14H7L12 19V5L7 10H3ZM16.5 12C16.5 10.23 15.5 8.71 14 7.97V16.02C15.5 15.29 16.5 13.77 16.5 12ZM14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z"/>
        </svg>
      `;
      speakerBtn.title = this.currentLanguage === 'en' ? 'Play voice' : 'Reproducir voz';

      speakerBtn.addEventListener('click', () => {
        this.playRobVoice(text, speakerBtn);
      });

      contentDiv.appendChild(speakerBtn);
    } else {
      contentDiv.textContent = text;
    }

    messageDiv.appendChild(contentDiv);
    this.chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    this.scrollToBottom();
  }

  formatRobResponse(text) {
    // Basic formatting for Rob's responses
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
      .replace(/\n\n/g, '</p><p>')                       // Paragraphs
      .replace(/\n/g, '<br>')                            // Line breaks
      .replace(/^/, '<p>')                               // Start paragraph
      .replace(/$/, '</p>');                             // End paragraph
  }

  showTyping() {
    this.typingIndicator.style.display = 'flex';
    this.scrollToBottom();
  }

  hideTyping() {
    this.typingIndicator.style.display = 'none';
  }

  scrollToBottom() {
    setTimeout(() => {
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }, 100);
  }

  async playRobVoice(text, button) {
    // Show loading state
    button.disabled = true;
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z">
          <animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" values="0 12 12;360 12 12"/>
        </path>
      </svg>
    `;

    try {
      // Clean text for voice synthesis (remove HTML tags)
      const cleanText = text.replace(/<[^>]*>/g, '').replace(/\*\*/g, '').trim();

      // Use OpenAI voice API with language-specific voice
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          language: this.currentLanguage,
          voice: this.currentLanguage === 'en' ? 'onyx' : 'alloy', // Strong male voice for English, clear for Spanish
          model: 'tts-1'
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.play().then(() => {
          console.log('OpenAI voice playback started');
        }).catch(error => {
          console.error('Audio playback failed:', error);
          this.fallbackToWebSpeech(cleanText);
        });

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.resetSpeakerButton(button);
        };

        audio.onerror = () => {
          console.error('Audio error, falling back to web speech');
          this.fallbackToWebSpeech(cleanText);
          this.resetSpeakerButton(button);
        };
      } else {
        console.log('OpenAI API not available, using web speech');
        this.fallbackToWebSpeech(cleanText);
        this.resetSpeakerButton(button);
      }
    } catch (error) {
      console.error('Voice synthesis failed:', error);
      this.fallbackToWebSpeech(cleanText);
      this.resetSpeakerButton(button);
    }
  }

  fallbackToWebSpeech(text) {
    if ('speechSynthesis' in window) {
      // Clean text for speech synthesis
      const cleanText = text.replace(/<[^>]*>/g, '').replace(/\*\*/g, '');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = this.currentLanguage === 'en' ? 'en-US' : 'es-ES';
      utterance.rate = 0.9;
      utterance.pitch = 0.8;

      // Try to use a male voice
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice =>
        voice.lang.startsWith(this.currentLanguage) &&
        (voice.name.includes('Male') || voice.name.includes('David') || voice.name.includes('Alex'))
      );

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      speechSynthesis.speak(utterance);
    }
  }

  resetSpeakerButton(button) {
    button.disabled = false;
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 10V14H7L12 19V5L7 10H3ZM16.5 12C16.5 10.23 15.5 8.71 14 7.97V16.02C15.5 15.29 16.5 13.77 16.5 12ZM14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z"/>
      </svg>
    `;
  }

  async speakResponse(text) {
    try {
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          language: this.currentLanguage
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.play().catch(error => {
          console.error('Audio playback failed:', error);
        });

        // Clean up
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
        };
      }
    } catch (error) {
      console.error('Voice synthesis failed:', error);
    }
  }

  async deleteUserData() {
    const confirmMessage = this.currentLanguage === 'en'
      ? 'Are you sure you want to delete all your conversation data? This cannot be undone.'
      : '¿Estás seguro de que quieres eliminar todos tus datos de conversación? Esto no se puede deshacer.';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/data/${this.userId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        // Clear local storage
        localStorage.removeItem('rob-user-id');

        // Show success message
        const successMessage = this.currentLanguage === 'en'
          ? 'Your data has been deleted. The page will reload.'
          : 'Tus datos han sido eliminados. La página se recargará.';

        alert(successMessage);

        // Reload page
        window.location.reload();
      } else {
        throw new Error(data.error || 'Failed to delete data');
      }

    } catch (error) {
      console.error('Data deletion failed:', error);

      const errorMessage = this.currentLanguage === 'en'
        ? 'Failed to delete data. Please try again.'
        : 'Error al eliminar datos. Por favor intenta de nuevo.';

      this.showError(errorMessage);
    }
  }

  showError(message) {
    this.addMessage(message, 'rob');
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new RobAI();
});