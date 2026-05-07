/*
 * Rob-AI - Frontend Application
 * Direct assistant for business strategy and LinkedIn content
 * No applause. Just results.
 */

class RobAI {
  constructor() {
    this.userId = this.getUserId();
    this.currentLanguage = 'en'; // Default to English
    this.isVoiceEnabled = false;
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];

    // Authentication state
    this.isAuthenticated = false;
    this.currentUser = null;

    // Authorized users - ONLY these two can access
    this.authorizedUsers = {
      'admin': 'Rob2024!Secure',
      'Jose': 'Business2024!'
    };

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
    try {
      console.log('🚀 Initializing Rob-AI...');

      // Check authentication first
      this.checkAuthentication();

      if (!this.isAuthenticated) {
        console.log('🔐 User not authenticated, showing login screen');
        this.showLoginScreen();
        return;
      }

      console.log('✅ User authenticated, initializing app');
      // Only initialize chat if authenticated
      this.initializeApp();
    } catch (error) {
      console.error('❌ Initialization error:', error);
      // Fallback: show login screen even if there's an error
      this.showLoginScreen();
    }
  }

  checkAuthentication() {
    const authData = localStorage.getItem('rob-auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        const now = Date.now();

        // Check if session hasn't expired (24 hours)
        if (parsed.expires > now && this.authorizedUsers[parsed.username]) {
          this.isAuthenticated = true;
          this.currentUser = parsed.username;
          console.log(`🔓 Persistent login restored for ${parsed.username}`);
          return;
        }
      } catch (e) {
        console.log('Invalid auth data');
      }
    }

    // Clear invalid auth
    localStorage.removeItem('rob-auth');
    this.isAuthenticated = false;
    this.currentUser = null;
  }

  initializeApp() {
    // Ensure DOM elements are available
    if (!this.app) {
      console.error('Main app element not found');
      return;
    }

    this.setupEventListeners();
    this.updateCharCount();
    this.detectUserLanguage();

    // Focus input if available
    if (this.messageInput) {
      this.messageInput.focus();
    }

    // Load voices for speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices(); // Trigger loading
      window.addEventListener('voiceschanged', () => {
        this.voicesLoaded = true;
      });
    }

    // Show the main app
    this.app.style.display = 'block';
    this.hideLoginScreen();
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
      this.setLanguage('en'); // Default to English
    }
  }

  setLanguage(lang) {
    this.currentLanguage = lang;
    document.body.className = `lang-${lang}`;

    // Update placeholders (with null checks)
    if (lang === 'en') {
      if (this.messageInput) this.messageInput.placeholder = 'Type your question here...';
      if (this.langToggle) this.langToggle.textContent = 'EN';
    } else {
      if (this.messageInput) this.messageInput.placeholder = 'Escribe tu pregunta aquí...';
      if (this.langToggle) this.langToggle.textContent = 'ES';
    }

    // Update voice button text visibility
    const esTexts = document.querySelectorAll('.btn-text-es, .auth-text-es, .warning-es');
    const enTexts = document.querySelectorAll('.btn-text-en, .auth-text-en, .warning-en');

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

  showLoginScreen() {
    // Hide main app (with null check)
    if (this.app) {
      this.app.style.display = 'none';
    }

    // Create login overlay if it doesn't exist
    let loginOverlay = document.getElementById('loginOverlay');
    if (!loginOverlay) {
      loginOverlay = this.createLoginOverlay();
      document.body.appendChild(loginOverlay);
    }

    loginOverlay.style.display = 'flex';
  }

  hideLoginScreen() {
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) {
      loginOverlay.style.display = 'none';
    }
  }

  createLoginOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'loginOverlay';
    overlay.innerHTML = `
      <div class="login-container">
        <div class="login-header">
          <div class="login-avatar">
            <div class="login-avatar-core">R</div>
          </div>
          <h1>ROB-AI ACCESS</h1>
          <p class="login-subtitle">AUTHORIZED PERSONNEL ONLY</p>
        </div>

        <form class="login-form" id="authForm">
          <div class="login-error" id="loginError" style="display: none;"></div>

          <div class="input-group">
            <input
              type="text"
              id="authUsername"
              placeholder="Username"
              required
              autocomplete="username"
              class="auth-input">
          </div>

          <div class="input-group">
            <input
              type="password"
              id="authPassword"
              placeholder="Password"
              required
              autocomplete="current-password"
              class="auth-input">
          </div>

          <button type="submit" class="auth-submit">
            <span class="auth-text-es">ACCESO SEGURO</span>
            <span class="auth-text-en" style="display: none;">SECURE ACCESS</span>
          </button>
        </form>

        <div class="login-footer">
          <p class="warning-text">
            <span class="warning-es">⚠️ Acceso no autorizado está prohibido</span>
            <span class="warning-en" style="display: none;">⚠️ Unauthorized access prohibited</span>
          </p>
        </div>
      </div>
    `;

    // Add event listener for form submission
    overlay.querySelector('#authForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.attemptLogin();
    });

    return overlay;
  }

  attemptLogin() {
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value;
    const errorEl = document.getElementById('loginError');

    // Clear previous errors
    errorEl.style.display = 'none';

    // Check credentials
    if (this.authorizedUsers[username] && this.authorizedUsers[username] === password) {
      // Successful login
      this.authenticateUser(username);
    } else {
      // Failed login
      this.showLoginError(
        this.currentLanguage === 'en'
          ? 'Invalid credentials. Access denied.'
          : 'Credenciales inválidas. Acceso denegado.'
      );

      // Clear password field
      document.getElementById('authPassword').value = '';
    }
  }

  authenticateUser(username) {
    // Set authentication state
    this.isAuthenticated = true;
    this.currentUser = username;

    // Create persistent session (expires in 24 hours)
    const authData = {
      username: username,
      expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      timestamp: Date.now()
    };

    localStorage.setItem('rob-auth', JSON.stringify(authData));

    console.log(`🔒 User ${username} authenticated successfully (persistent login enabled)`);

    // Initialize the app
    this.initializeApp();
  }

  showLoginError(message) {
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = message;
    errorEl.style.display = 'block';

    // Auto-hide error after 5 seconds
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }

  logout() {
    // Clear authentication
    this.isAuthenticated = false;
    this.currentUser = null;
    localStorage.removeItem('rob-auth');
    console.log('🔓 User logged out and persistent session cleared');

    console.log('User logged out');

    // Show login screen
    this.showLoginScreen();
  }

  setupEventListeners() {
    // Language toggle (with null check)
    if (this.langToggle) {
      this.langToggle.addEventListener('click', () => {
        const newLang = this.currentLanguage === 'es' ? 'en' : 'es';
        this.setLanguage(newLang);
      });
    }

    // Voice toggle (with null check)
    if (this.voiceToggle) {
      this.voiceToggle.addEventListener('click', () => {
        this.isVoiceEnabled = !this.isVoiceEnabled;
        this.voiceToggle.classList.toggle('active', this.isVoiceEnabled);

        if (this.isVoiceEnabled) {
          this.requestMicrophonePermission();
          console.log('🔊 Voice responses enabled');
        } else {
          // Stop any current speech when disabling
          this.stopCurrentSpeech();
          console.log('🔇 Voice responses disabled - stopping current speech');
        }
      });
    }

    // Voice input (with null check)
    if (this.voiceInputBtn) {
      this.voiceInputBtn.addEventListener('click', () => {
        this.toggleVoiceInput();
      });
    }

    // Delete data (with null check)
    if (this.deleteDataBtn) {
      this.deleteDataBtn.addEventListener('click', () => {
        this.deleteUserData();
      });
    }

    // Chat form (with null check)
    if (this.chatForm) {
      this.chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }

    // Message input (with null checks)
    if (this.messageInput) {
      this.messageInput.addEventListener('input', () => {
        this.updateCharCount();
        this.updateSendButton();
        this.autoResize();
      });

      this.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (this.sendButton && !this.sendButton.disabled) {
            this.sendMessage();
          }
        }
      });
    }
  }

  updateCharCount() {
    if (!this.messageInput || !this.charCount) return;

    const length = this.messageInput.value.length;
    this.charCount.textContent = `${length}/1000`;

    if (length > 900) {
      this.charCount.style.color = 'var(--accent-color)';
    } else {
      this.charCount.style.color = 'var(--text-muted)';
    }
  }

  updateSendButton() {
    if (!this.messageInput || !this.sendButton) return;

    const hasText = this.messageInput.value.trim().length > 0;
    this.sendButton.disabled = !hasText;
  }

  autoResize() {
    if (!this.messageInput) return;

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
          userId: this.userId,
          language: this.currentLanguage,
          preferredLanguage: this.currentLanguage === 'en' ? 'English' : 'Spanish',
          systemInstruction: this.currentLanguage === 'en'
            ? 'Always respond in English. You are Rob, a direct business strategy assistant.'
            : 'Siempre responde en español. Eres Rob, un asistente directo de estrategia de negocios.'
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Hide typing indicator
        this.hideTyping();

        // Add Rob's response
        this.addMessage(data.response, 'rob');

        // Auto-play voice response if LISTEN is enabled
        if (this.isVoiceEnabled) {
          this.speakRobResponse(data.response);
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

      // Speaker removed - using LISTEN button for voice control
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

  // Removed playRobVoice - using enhanced speakRobResponse instead

  speakWithPremiumVoice(text) {
    if (!('speechSynthesis' in window)) return;

    // Stop any current speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Set language
    utterance.lang = this.currentLanguage === 'en' ? 'en-US' : 'es-ES';

    // Enhanced voice parameters for natural sound
    utterance.rate = 1.0;        // Natural speaking speed
    utterance.pitch = 0.9;       // Slightly lower pitch for authority
    utterance.volume = 0.9;      // Clear volume

    // Get available voices
    const voices = speechSynthesis.getVoices();

    if (this.currentLanguage === 'en') {
      // Premium MALE English voices (in order of preference)
      const preferredNames = [
        'Alex',                    // macOS premium male voice
        'Daniel',                  // UK male voice
        'Microsoft David',         // Microsoft male voice
        'Microsoft Mark',          // Microsoft male voice
        'Fred',                    // US male voice
        'Google US English Male',  // Google male voice
        'Daniel (Enhanced)',       // Enhanced UK voice
        'David',                   // Standard male voice
        'Mark'                     // Standard male voice
      ];

      let selectedVoice = this.findBestVoice(voices, preferredNames, 'en');
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.rate = 1.1;      // Slightly faster for natural flow
        utterance.pitch = 0.8;     // Lower pitch for masculine voice
      }

    } else {
      // Premium MALE Spanish voices
      const preferredNames = [
        'Diego',                   // Premium male Spanish voice
        'Jorge',                   // Latin American male Spanish
        'Juan',                    // Male Spanish voice
        'Carlos',                  // Male Spanish voice
        'Microsoft Pablo',         // Microsoft male Spanish
        'Google español',          // Google Spanish
        'Microsoft Raul',          // Microsoft male Spanish
        'Enrique'                  // Male Spanish voice
      ];

      let selectedVoice = this.findBestVoice(voices, preferredNames, 'es');
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.rate = 1.0;      // Natural Spanish pace
        utterance.pitch = 0.8;     // Lower pitch for masculine voice
      }
    }

    // Add speech events for better UX
    utterance.onstart = () => {
      console.log(`🔊 Speaking with ${utterance.voice ? utterance.voice.name : 'default'} voice`);
      // Add visual feedback that Rob is speaking
      this.voiceToggle.style.background = 'linear-gradient(135deg, var(--success-color), var(--primary-color))';
    };

    utterance.onend = () => {
      // Reset visual feedback
      if (this.isVoiceEnabled) {
        this.voiceToggle.style.background = 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))';
      }
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
    };

    // Speak the text
    speechSynthesis.speak(utterance);
  }

  findBestVoice(voices, preferredNames, language) {
    // First, try to find exact name matches
    for (const name of preferredNames) {
      const voice = voices.find(v =>
        v.name.includes(name) && v.lang.startsWith(language)
      );
      if (voice) {
        console.log(`🎙️ Selected premium voice: ${voice.name}`);
        return voice;
      }
    }

    // Filter out female voices
    const femaleKeywords = ['female', 'woman', 'girl', 'samantha', 'helena', 'sabina', 'zira', 'susan', 'catherine'];
    const maleVoices = voices.filter(v =>
      v.lang.startsWith(language) &&
      !femaleKeywords.some(keyword => v.name.toLowerCase().includes(keyword))
    );

    // Prefer local/quality male voices
    const qualityMaleVoices = maleVoices.filter(v =>
      v.localService || v.name.includes('Google') || v.name.includes('Microsoft')
    );

    const selectedVoice = qualityMaleVoices[0] || maleVoices[0] || voices.find(v => v.lang.startsWith(language));

    if (selectedVoice) {
      console.log(`🎙️ Selected fallback voice: ${selectedVoice.name}`);
    }

    return selectedVoice;
  }

  // Removed resetSpeakerButton - no longer needed

  stopCurrentSpeech() {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      console.log('🔇 Speech stopped');

      // Remove any visual feedback indicating speech is playing
      if (this.voiceToggle) {
        this.voiceToggle.classList.remove('speaking');
      }
    }
  }

  async speakRobResponse(text) {
    // Clean text for speech (remove markdown and HTML)
    const cleanText = text
      .replace(/<[^>]*>/g, '')                    // Remove HTML tags
      .replace(/\*\*/g, '')                       // Remove bold markdown
      .replace(/\*/g, '')                         // Remove italic markdown
      .replace(/###|##|#/g, '')                   // Remove headers
      .replace(/```[\s\S]*?```/g, '')             // Remove code blocks
      .replace(/`([^`]+)`/g, '$1')                // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')    // Remove links
      .trim();

    if (!cleanText) return;

    // Use enhanced browser TTS with premium voice selection
    this.speakWithPremiumVoice(cleanText);
  }

  async deleteUserData() {
    const confirmMessage = this.currentLanguage === 'en'
      ? 'Are you sure you want to delete all your conversation data and log out? This cannot be undone.'
      : '¿Estás seguro de que quieres eliminar todos tus datos de conversación y cerrar sesión? Esto no se puede deshacer.';

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

        // Log out user for security
        this.logout();

        // Show success message
        const successMessage = this.currentLanguage === 'en'
          ? 'Your data has been deleted and you have been logged out.'
          : 'Tus datos han sido eliminados y tu sesión ha sido cerrada.';

        alert(successMessage);
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

// Detect and handle Google Translate interference
function detectGoogleTranslate() {
  // Check for Google Translate elements
  const translateElements = document.querySelectorAll('[data-translate], .goog-te-combo, .skiptranslate');
  if (translateElements.length > 0) {
    console.warn('⚠️ Google Translate detected - may cause app issues');

    // Show user-friendly message
    const warning = document.createElement('div');
    warning.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #ff6b00, #ff8533);
        color: white;
        padding: 12px 20px;
        text-align: center;
        font-weight: 600;
        z-index: 10000;
        font-family: Inter, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 20px rgba(255, 107, 0, 0.3);
      ">
        ⚠️ Google Translate detectado - Por favor desactívalo para mejor experiencia |
        ⚠️ Google Translate detected - Please disable it for better experience
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          margin-left: 10px;
          cursor: pointer;
        ">✕</button>
      </div>
    `;
    document.body.appendChild(warning);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (warning.parentElement) {
        warning.remove();
      }
    }, 10000);
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check for Google Translate interference
  detectGoogleTranslate();

  // Also check after a delay in case translate loads later
  setTimeout(detectGoogleTranslate, 2000);

  // Initialize the app
  new RobAI();
});