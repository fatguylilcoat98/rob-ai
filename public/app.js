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
    this.currentAudio = null; // For OpenAI TTS audio playback

    // Authentication state
    this.isAuthenticated = false;
    this.currentUser = null;

    // Authorized users - ONLY these two can access
    this.authorizedUsers = {
      'admin': 'Rob2024!Secure',
      'Jose': 'Jose2024!Secure'
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
    // Check for stored language preference first
    const storedLang = localStorage.getItem('rob-language');
    if (storedLang && (storedLang === 'es' || storedLang === 'en')) {
      this.setLanguage(storedLang);
      console.log(`🌍 Using stored language preference: ${storedLang}`);
      return;
    }

    // Auto-detect browser language
    const browserLang = navigator.language || navigator.userLanguage;
    console.log(`🌍 Browser language detected: ${browserLang}`);

    if (browserLang.startsWith('es')) {
      this.setLanguage('es');
    } else {
      this.setLanguage('en');
    }
  }

  setLanguage(lang) {
    this.currentLanguage = lang;
    localStorage.setItem('rob-language', lang);

    // Update language-dependent elements
    this.updateLanguageElements(lang);
    this.updateLanguageToggle(lang);
    console.log(`🌐 Language set to: ${lang}`);
  }

  updateLanguageElements(lang) {
    // Update all elements with language variants
    const elements = document.querySelectorAll('[class*="-es"], [class*="-en"]');
    elements.forEach(element => {
      if (element.classList.contains(`${element.classList[0].split('-')[0]}-${lang}`)) {
        element.style.display = '';
      } else if (element.classList.contains(`${element.classList[0].split('-')[0]}-${lang === 'es' ? 'en' : 'es'}`)) {
        element.style.display = 'none';
      }
    });

    // Update placeholder text for message input
    if (this.messageInput) {
      this.messageInput.placeholder = lang === 'es'
        ? 'Escribe tu pregunta aquí...'
        : 'Type your question here...';
    }
  }

  updateLanguageToggle(lang) {
    if (this.langToggle) {
      this.langToggle.querySelector('.lang-current').textContent = lang.toUpperCase();
    }
  }

  showLoginScreen() {
    // Hide main app and password change form
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
    this.setupLoginEventListeners();
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
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      font-family: 'Inter', sans-serif;
    `;

    overlay.innerHTML = `
      <div style="background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border-radius: 20px; padding: 40px; max-width: 400px; width: 90%; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.3);">

        <!-- Logo Section -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="font-size: 48px; font-weight: 800; color: #00ff88; margin-bottom: 10px; text-shadow: 0 0 20px rgba(0,255,136,0.3);">
            ROB-AI
          </div>
          <div style="color: rgba(255,255,255,0.7); font-size: 14px; letter-spacing: 1px;">
            ACCESS AUTHORIZED PERSONNEL ONLY
          </div>
        </div>

        <!-- Login Form -->
        <form id="loginForm">
          <div style="margin-bottom: 20px;">
            <input type="text" id="loginUsername" placeholder="Username" required style="width: 100%; padding: 15px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: white; font-size: 14px; box-sizing: border-box;" />
          </div>
          <div style="margin-bottom: 25px;">
            <input type="password" id="loginPassword" placeholder="Password" required style="width: 100%; padding: 15px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: white; font-size: 14px; box-sizing: border-box;" />
          </div>
          <button type="submit" style="width: 100%; padding: 15px; background: linear-gradient(45deg, #00ff88, #00cc6a); border: none; border-radius: 10px; color: #1a1a2e; font-weight: 700; cursor: pointer; transition: transform 0.2s; text-transform: uppercase; letter-spacing: 1px;">
            SECURE ACCESS
          </button>
        </form>

        <!-- Error Messages -->
        <div id="loginError" style="margin-top: 20px; color: #ff4757; text-align: center; display: none; font-size: 14px;">
        </div>

        <div style="text-align: center; margin-top: 20px; color: rgba(255,255,255,0.6); font-size: 12px;">
          ⚠️ Unauthorized access is prohibited
        </div>

      </div>
    `;

    return overlay;
  }

  setupLoginEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }
  }

  handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    if (this.authorizedUsers[username] && this.authorizedUsers[username] === password) {
      // Successful login
      this.authenticateUser(username);
    } else {
      // Failed login
      this.showLoginError('Invalid credentials. Access denied.');
    }
  }

  authenticateUser(username) {
    this.isAuthenticated = true;
    this.currentUser = username;

    // Store authentication with 24-hour expiration
    const authData = {
      username: username,
      expires: Date.now() + (24 * 60 * 60 * 1000)
    };
    localStorage.setItem('rob-auth', JSON.stringify(authData));

    console.log(`✅ User authenticated: ${username}`);
    this.initializeApp();
  }

  showLoginError(message) {
    const errorEl = document.getElementById('loginError');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';

      setTimeout(() => {
        errorEl.style.display = 'none';
      }, 5000);
    }
  }

  logout() {
    localStorage.removeItem('rob-auth');
    this.isAuthenticated = false;
    this.currentUser = null;
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

    // Voice toggle
    if (this.voiceToggle) {
      this.voiceToggle.addEventListener('click', () => this.toggleVoice());
    }

    // Voice input
    if (this.voiceInputBtn) {
      this.voiceInputBtn.addEventListener('click', () => this.toggleVoiceInput());
    }

    // Data deletion
    if (this.deleteDataBtn) {
      this.deleteDataBtn.addEventListener('click', () => this.deleteUserData());
    }

    // Chat form
    if (this.chatForm) {
      this.chatForm.addEventListener('submit', (e) => this.sendMessage(e));
    }

    // Message input
    if (this.messageInput) {
      this.messageInput.addEventListener('input', () => this.updateCharCount());
      this.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage(e);
        }
      });
    }
  }

  updateCharCount() {
    if (this.messageInput && this.charCount) {
      const count = this.messageInput.value.length;
      this.charCount.textContent = `${count}/1000`;

      if (this.sendButton) {
        this.sendButton.disabled = count === 0 || count > 1000;
      }
    }
  }

  async sendMessage(e) {
    e.preventDefault();

    if (!this.messageInput || !this.messageInput.value.trim()) {
      return;
    }

    const message = this.messageInput.value.trim();
    this.messageInput.value = '';
    this.updateCharCount();

    // Add user message to chat
    this.addMessageToChat('user', message);

    // Show typing indicator
    this.showTypingIndicator();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, userId: this.userId })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Hide typing indicator
      this.hideTypingIndicator();

      // Add Rob's response to chat
      this.addMessageToChat('rob', data.response, data.language);

      // Play voice if enabled
      if (this.isVoiceEnabled) {
        this.playVoiceResponse(data.response, data.language);
      }

    } catch (error) {
      console.error('Chat error:', error);
      this.hideTypingIndicator();

      const errorMessage = this.currentLanguage === 'es'
        ? 'Error de conexión. Intenta de nuevo.'
        : 'Connection error. Please try again.';

      this.addMessageToChat('rob', errorMessage);
    }
  }

  addMessageToChat(sender, message, language = null) {
    if (!this.chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    if (sender === 'user') {
      messageDiv.innerHTML = `
        <div class="message-content">
          <div class="message-text">
            <p>${this.escapeHtml(message)}</p>
          </div>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="message-avatar">
          <div class="mini-avatar">
            <div class="mini-core">R</div>
            <div class="mini-glow"></div>
          </div>
        </div>
        <div class="message-content">
          <div class="message-text">
            ${this.formatRobMessage(message)}
          </div>
        </div>
      `;
    }

    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
  }

  formatRobMessage(message) {
    // Convert line breaks to paragraphs
    const paragraphs = message.split('\n\n').filter(p => p.trim());
    return paragraphs.map(p => `<p>${this.escapeHtml(p.trim())}</p>`).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  scrollToBottom() {
    if (this.chatMessages) {
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
  }

  showTypingIndicator() {
    if (this.typingIndicator) {
      this.typingIndicator.style.display = 'flex';
      this.scrollToBottom();
    }
  }

  hideTypingIndicator() {
    if (this.typingIndicator) {
      this.typingIndicator.style.display = 'none';
    }
  }

  toggleVoice() {
    this.isVoiceEnabled = !this.isVoiceEnabled;

    if (this.voiceToggle) {
      this.voiceToggle.style.background = this.isVoiceEnabled
        ? 'rgba(0, 255, 136, 0.2)'
        : 'rgba(255,255,255,0.1)';
      this.voiceToggle.style.color = this.isVoiceEnabled ? '#00ff88' : 'rgba(255,255,255,0.7)';
    }

    console.log(`🎙️ Voice responses ${this.isVoiceEnabled ? 'enabled' : 'disabled'}`);
  }

  async playVoiceResponse(text, language) {
    try {
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, language })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // Stop current audio if playing
        if (this.currentAudio) {
          this.currentAudio.pause();
          this.currentAudio = null;
        }

        this.currentAudio = new Audio(audioUrl);
        this.currentAudio.play();

        // Clean up URL after playing
        this.currentAudio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
        };
      }
    } catch (error) {
      console.error('Voice playback error:', error);
    }
  }

  toggleVoiceInput() {
    if (!('webkitSpeechRecognition' in window)) {
      alert(this.currentLanguage === 'es'
        ? 'Reconocimiento de voz no soportado en este navegador'
        : 'Speech recognition not supported in this browser');
      return;
    }

    if (this.isRecording) {
      this.stopVoiceInput();
    } else {
      this.startVoiceInput();
    }
  }

  startVoiceInput() {
    const recognition = new webkitSpeechRecognition();
    recognition.lang = this.currentLanguage === 'es' ? 'es-ES' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      this.isRecording = true;
      if (this.voiceInputBtn) {
        this.voiceInputBtn.style.background = '#ff4757';
        this.voiceInputBtn.style.color = 'white';
      }
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (this.messageInput) {
        this.messageInput.value = transcript;
        this.updateCharCount();
        this.messageInput.focus();
      }
    };

    recognition.onend = () => {
      this.stopVoiceInput();
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.stopVoiceInput();
    };

    recognition.start();
  }

  stopVoiceInput() {
    this.isRecording = false;
    if (this.voiceInputBtn) {
      this.voiceInputBtn.style.background = 'rgba(255,255,255,0.1)';
      this.voiceInputBtn.style.color = 'rgba(255,255,255,0.7)';
    }
  }

  async deleteUserData() {
    const confirmMessage = this.currentLanguage === 'es'
      ? '¿Estás seguro? Esto eliminará todas tus conversaciones permanentemente.'
      : 'Are you sure? This will permanently delete all your conversations.';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/data/${this.userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || data.message_es);

        // Clear chat messages
        if (this.chatMessages) {
          const messages = this.chatMessages.querySelectorAll('.message:not(:first-child)');
          messages.forEach(msg => msg.remove());
        }
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Data deletion error:', error);
      const errorMessage = this.currentLanguage === 'es'
        ? 'Error al eliminar datos'
        : 'Failed to delete data';
      alert(errorMessage);
    }
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  window.robAI = new RobAI();
});