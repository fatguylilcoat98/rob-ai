/*
 * Rob-AI - Frontend Application
 * Direct assistant for business strategy and LinkedIn content
 * No applause. Just results.
 */

class RobAI {
  constructor() {
    this.currentLanguage = 'en'; // Default to English
    this.isVoiceEnabled = false;
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.currentAudio = null; // For OpenAI TTS audio playback

    // Authentication state
    this.isAuthenticated = false;
    this.currentUser = null;
    this.authToken = null;

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

        // Check if token hasn't expired
        if (parsed.token && parsed.expires > now && parsed.user) {
          this.authToken = parsed.token;
          this.currentUser = parsed.user;
          this.isAuthenticated = true;
          console.log(`🔓 Authentication restored for ${parsed.user.email}`);
          return;
        }
      } catch (e) {
        console.log('Invalid auth data');
      }
    }

    // Clear invalid auth
    this.clearAuth();
  }

  clearAuth() {
    localStorage.removeItem('rob-auth');
    this.isAuthenticated = false;
    this.currentUser = null;
    this.authToken = null;
  }

  saveAuth(token, user) {
    const authData = {
      token,
      user,
      expires: Date.now() + (23 * 60 * 60 * 1000) // 23 hours to be safe
    };
    localStorage.setItem('rob-auth', JSON.stringify(authData));
    this.authToken = token;
    this.currentUser = user;
    this.isAuthenticated = true;
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
    const passwordForm = document.getElementById('passwordChangeForm');
    if (passwordForm) {
      passwordForm.style.display = 'none';
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
            <span class="login-subtitle-es">SISTEMA TÁCTICO DE RESULTADOS</span>
            <span class="login-subtitle-en" style="display: none;">TACTICAL RESULTS SYSTEM</span>
          </div>
        </div>

        <!-- Language Toggle -->
        <div style="text-align: center; margin-bottom: 20px;">
          <button id="loginLangToggle" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 12px; transition: all 0.3s;">
            ES / EN
          </button>
        </div>

        <!-- Login Only - Private System -->
        <div style="text-align: center; margin-bottom: 20px; color: rgba(255,255,255,0.6); font-size: 12px;">
          <span class="private-es">SISTEMA PRIVADO - SOLO USUARIOS AUTORIZADOS</span>
          <span class="private-en" style="display: none;">PRIVATE SYSTEM - AUTHORIZED USERS ONLY</span>
        </div>

        <!-- Login Form -->
        <form id="loginForm" style="display: block;">
          <div style="margin-bottom: 20px;">
            <input type="email" id="loginEmail" placeholder="Email" required style="width: 100%; padding: 15px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: white; font-size: 14px; box-sizing: border-box;" />
          </div>
          <div style="margin-bottom: 25px;">
            <input type="password" id="loginPassword" required style="width: 100%; padding: 15px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: white; font-size: 14px; box-sizing: border-box;" />
          </div>
          <button type="submit" id="loginSubmit" style="width: 100%; padding: 15px; background: linear-gradient(45deg, #00ff88, #00cc6a); border: none; border-radius: 10px; color: #1a1a2e; font-weight: 700; cursor: pointer; transition: transform 0.2s; text-transform: uppercase; letter-spacing: 1px;">
            <span class="login-btn-es">ACCEDER</span>
            <span class="login-btn-en" style="display: none;">LOGIN</span>
          </button>
        </form>


        <!-- Error/Success Messages -->
        <div id="authMessage" style="margin-top: 20px; padding: 12px; border-radius: 8px; text-align: center; display: none; font-size: 14px;">
        </div>

        <!-- Loading State -->
        <div id="authLoading" style="display: none; text-align: center; margin-top: 20px;">
          <div style="color: rgba(255,255,255,0.7); font-size: 14px;">
            <span class="loading-es">Procesando...</span>
            <span class="loading-en" style="display: none;">Processing...</span>
          </div>
        </div>

      </div>
    `;

    return overlay;
  }

  setupLoginEventListeners() {
    // Language toggle
    const loginLangToggle = document.getElementById('loginLangToggle');
    if (loginLangToggle) {
      loginLangToggle.addEventListener('click', () => {
        const newLang = this.currentLanguage === 'es' ? 'en' : 'es';
        this.setLanguage(newLang);
        this.updateLoginLanguage(newLang);
      });
    }

    // Form submission - Login only
    const loginFormEl = document.getElementById('loginForm');
    if (loginFormEl) {
      loginFormEl.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Update initial language
    this.updateLoginLanguage(this.currentLanguage);
  }


  updateLoginLanguage(lang) {
    // Update placeholder text for login password
    const loginPassword = document.getElementById('loginPassword');
    if (loginPassword) {
      loginPassword.placeholder = lang === 'es' ? 'Contraseña' : 'Password';
    }

    // Update all language-specific elements
    this.updateLanguageElements(lang);
  }

  async handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      this.showAuthMessage('error',
        this.currentLanguage === 'es' ? 'Por favor completa todos los campos' : 'Please fill all fields'
      );
      return;
    }

    this.showAuthLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        this.saveAuth(data.token, data.user);
        this.showAuthMessage('success', data.message || data.message_es);
        setTimeout(() => {
          this.initializeApp();
        }, 1000);
      } else {
        this.showAuthMessage('error', data.error || data.error_es || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showAuthMessage('error',
        this.currentLanguage === 'es' ? 'Error de conexión' : 'Connection error'
      );
    } finally {
      this.showAuthLoading(false);
    }
  }


  showAuthMessage(type, message) {
    const messageEl = document.getElementById('authMessage');
    if (messageEl) {
      messageEl.style.display = 'block';
      messageEl.textContent = message;

      if (type === 'success') {
        messageEl.style.background = 'rgba(0, 255, 136, 0.2)';
        messageEl.style.border = '1px solid rgba(0, 255, 136, 0.3)';
        messageEl.style.color = '#00ff88';
      } else {
        messageEl.style.background = 'rgba(255, 71, 71, 0.2)';
        messageEl.style.border = '1px solid rgba(255, 71, 71, 0.3)';
        messageEl.style.color = '#ff4747';
      }
    }
  }

  clearAuthMessage() {
    const messageEl = document.getElementById('authMessage');
    if (messageEl) {
      messageEl.style.display = 'none';
    }
  }

  showAuthLoading(show) {
    const loadingEl = document.getElementById('authLoading');
    const submitBtns = document.querySelectorAll('#loginSubmit, #registerSubmit');

    if (loadingEl) {
      loadingEl.style.display = show ? 'block' : 'none';
    }

    submitBtns.forEach(btn => {
      btn.disabled = show;
      btn.style.opacity = show ? '0.6' : '1';
    });
  }

  async makeAuthenticatedRequest(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle token expiration
    if (response.status === 401) {
      this.clearAuth();
      this.showLoginScreen();
      throw new Error('Authentication expired');
    }

    return response;
  }

  logout() {
    if (this.authToken) {
      // Call logout endpoint in background
      this.makeAuthenticatedRequest('/api/auth/logout', {
        method: 'POST'
      }).catch(err => console.log('Logout API call failed:', err));
    }

    this.clearAuth();
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

    // Add logout button to header
    this.addLogoutButton();
  }

  addLogoutButton() {
    const headerControls = document.querySelector('.header-controls');
    if (headerControls && !document.getElementById('logoutBtn')) {
      const logoutBtn = document.createElement('button');
      logoutBtn.id = 'logoutBtn';
      logoutBtn.className = 'delete-btn';
      logoutBtn.title = this.currentLanguage === 'es' ? 'Cerrar sesión' : 'Logout';
      logoutBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"/>
        </svg>
      `;
      logoutBtn.addEventListener('click', () => this.logout());
      headerControls.insertBefore(logoutBtn, this.deleteDataBtn);
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
      const response = await this.makeAuthenticatedRequest('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message })
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
      const response = await this.makeAuthenticatedRequest('/api/voice', {
        method: 'POST',
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
      const response = await this.makeAuthenticatedRequest('/api/data', {
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