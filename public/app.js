/*
 * Rob AI - Frontend Application
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
    this.privacyModal = document.getElementById('privacyModal');
    this.chatMessages = document.getElementById('chatMessages');
    this.messageInput = document.getElementById('messageInput');
    this.sendButton = document.getElementById('sendButton');
    this.chatForm = document.getElementById('chatForm');
    this.typingIndicator = document.getElementById('typingIndicator');
    this.charCount = document.getElementById('charCount');

    // Control buttons
    this.langToggle = document.getElementById('langToggle');
    this.langToggleModal = document.getElementById('langToggleModal');
    this.voiceToggle = document.getElementById('voiceToggle');
    this.voiceInputBtn = document.getElementById('voiceInputBtn');
    this.deleteDataBtn = document.getElementById('deleteData');
    this.acceptPrivacyBtn = document.getElementById('acceptPrivacy');

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateCharCount();
    this.checkPrivacyAcceptance();
    this.detectUserLanguage();
  }

  getUserId() {
    let userId = localStorage.getItem('rob-user-id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('rob-user-id', userId);
    }
    return userId;
  }

  checkPrivacyAcceptance() {
    const privacyAccepted = localStorage.getItem('rob-privacy-accepted');
    if (privacyAccepted === 'true') {
      this.showApp();
    } else {
      this.showPrivacyModal();
    }
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

  showPrivacyModal() {
    this.privacyModal.style.display = 'flex';
    this.app.style.display = 'none';
  }

  showApp() {
    this.privacyModal.style.display = 'none';
    this.app.style.display = 'flex';
    this.messageInput.focus();
  }

  setLanguage(lang) {
    this.currentLanguage = lang;
    document.body.className = `lang-${lang}`;

    // Update placeholders
    if (lang === 'en') {
      this.messageInput.placeholder = 'Type your question here...';
      this.langToggle.textContent = 'EN';
      this.langToggleModal.textContent = 'ES';
    } else {
      this.messageInput.placeholder = 'Escribe tu pregunta aquí...';
      this.langToggle.textContent = 'ES';
      this.langToggleModal.textContent = 'EN';
    }
  }

  setupEventListeners() {
    // Privacy modal
    this.acceptPrivacyBtn.addEventListener('click', () => {
      localStorage.setItem('rob-privacy-accepted', 'true');
      this.showApp();
    });

    this.langToggleModal.addEventListener('click', () => {
      const newLang = this.currentLanguage === 'es' ? 'en' : 'es';
      this.setLanguage(newLang);
    });

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

    // Voice input
    this.voiceInputBtn.addEventListener('click', () => {
      if (this.isVoiceEnabled) {
        this.toggleVoiceInput();
      }
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

  async toggleVoiceInput() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        this.processRecording();
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.voiceInputBtn.classList.add('recording');

    } catch (error) {
      console.error('Failed to start recording:', error);
      this.showError(
        this.currentLanguage === 'en'
          ? 'Failed to start recording. Please try again.'
          : 'Error al iniciar grabación. Intenta de nuevo.'
      );
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.voiceInputBtn.classList.remove('recording');

      // Stop all audio tracks
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }

  async processRecording() {
    // For now, just show that voice input was attempted
    // In a full implementation, you'd send the audio to OpenAI's speech-to-text API
    const placeholder = this.currentLanguage === 'en'
      ? '[Voice input - feature coming soon]'
      : '[Entrada de voz - función próximamente]';

    this.messageInput.value = placeholder;
    this.updateCharCount();
    this.updateSendButton();
    this.messageInput.focus();
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
        localStorage.removeItem('rob-privacy-accepted');

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