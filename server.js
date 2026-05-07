/*
 * Rob-AI - Direct AI Assistant for Business Strategy
 * Built for José - LinkedIn Content & Monetization Expert
 * No applause. Just results.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');
const { tavily } = require('tavily');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment validation
const requiredEnvVars = ['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'ENCRYPTION_KEY', 'TAVILY_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Initialize services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const tavilyClient = tavily({
  apiKey: process.env.TAVILY_API_KEY
});

// Encryption utilities
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipherGCM('aes-256-gcm', ENCRYPTION_KEY, iv);
  cipher.setAAD(Buffer.from('rob-ai-data'));

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    encrypted: encrypted,
    authTag: authTag.toString('hex')
  };
}

function decrypt(encryptedData) {
  try {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipherGCM('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAAD(Buffer.from('rob-ai-data'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

// Real-time search function using Tavily
async function searchRealTimeData(query, language = 'en') {
  try {
    console.log(`🔍 Searching real-time data for: "${query}"`);

    const searchResults = await tavilyClient.search({
      query: query,
      searchDepth: 'basic',
      includeImages: false,
      includeAnswer: true,
      maxResults: 5,
      includeDomains: [
        'linkedin.com',
        'techcrunch.com',
        'forbes.com',
        'entrepreneur.com',
        'inc.com',
        'harvard.edu',
        'mit.edu',
        'news.ycombinator.com'
      ]
    });

    if (!searchResults.results || searchResults.results.length === 0) {
      return null;
    }

    // Format search results for Rob's context
    const formattedResults = searchResults.results.map(result => ({
      title: result.title,
      content: result.content.substring(0, 500), // Limit content length
      url: result.url,
      publishedDate: result.published_date || 'Recent'
    }));

    const searchSummary = searchResults.answer || 'Current market insights found';

    console.log(`✅ Found ${formattedResults.length} real-time results`);

    return {
      summary: searchSummary,
      results: formattedResults,
      searchQuery: query
    };

  } catch (error) {
    console.error('❌ Real-time search error:', error);
    return null;
  }
}

// Detect if Rob should use real-time search
function shouldUseRealTimeSearch(message) {
  const realTimeKeywords = [
    'current', 'recent', 'latest', 'trending', 'now', 'today',
    'this week', 'this month', 'new', 'updates', 'news',
    'market trends', 'linkedin trends', 'business news',
    'what\'s happening', 'actualmente', 'reciente', 'últimos',
    'tendencias', 'noticias', 'mercado', 'hoy', 'ahora'
  ];

  return realTimeKeywords.some(keyword =>
    message.toLowerCase().includes(keyword.toLowerCase())
  );
}

// Rob's core identity and system prompt
const ROB_SYSTEM_PROMPT = `You are Rob, José's direct AI assistant for business strategy and LinkedIn content creation.

You speak in short punchy sentences and paragraphs. No numbered lists. No bullet points. No formatting. Just direct conversational hits that convert.

Your tone is direct, provocative, strategic. You want results, not applause. Brutal clarity with motivating energy. Short storytelling, punchy phrases, unexpected twists. Smart humor and irreverence when useful. Never beat around the bush. Make them a little uncomfortable but convert.

You help with LinkedIn content creation like reels scripts, hooks, viral ideas. Business and monetization strategies. Audience engagement and authority building. DM and sales strategy writing. Personal brand positioning. Strategic thinking about AI sales and growth.

REAL-TIME DATA ACCESS: You have access to current market data, LinkedIn trends, business news, and real-time insights. When users ask about current events, trends, or recent developments, you can provide up-to-date information. Use this to give cutting-edge advice based on what's actually happening now in business and LinkedIn marketing.

Never be generic or cliché. Never sugarcoat truth. Never give long answers without substance. Never sound like boring corporate. Never invent data or statistics. Never lose focus on results and action. Never use lists or numbered formatting.

José helps entrepreneurs, creators, and professionals monetize knowledge. He positions them to scale using content and technology. He has 25,000+ LinkedIn followers. Expert in tech sales and personal branding. His audience wants to grow, sell more, stop wasting time.

Instead of "Here are some ideas" you say "Three moves. Pick one." Instead of "That's a great question" you just answer it. Instead of "You might want to consider" you say "Do this." Short. Sharp. No applause. Just results.

Auto-detect Spanish or English input, default to Spanish responses unless English is clearly preferred.

You're here to help José and his audience get results, make money, and cut through the noise. Be the advisor who tells them what they need to hear, not what they want to hear. Speak in flowing conversational paragraphs, never lists or bullets.

When you have current data from real-time search, integrate it naturally into your advice without mentioning the search explicitly.`;

// Language detection
function detectLanguage(text) {
  const spanishWords = ['que', 'como', 'para', 'con', 'por', 'una', 'una', 'del', 'las', 'los', 'este', 'esta', 'hace', 'muy', 'todo', 'más'];
  const englishWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day'];

  const words = text.toLowerCase().split(/\s+/);
  let spanishCount = 0;
  let englishCount = 0;

  words.forEach(word => {
    if (spanishWords.includes(word)) spanishCount++;
    if (englishWords.includes(word)) englishCount++;
  });

  // Default to Spanish unless clearly English
  return englishCount > spanishCount ? 'en' : 'es';
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.openai.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Store conversation in memory with encryption
async function storeConversation(userId, message, response, language) {
  try {
    const encryptedMessage = encrypt(message);
    const encryptedResponse = encrypt(response);

    const { error } = await supabase
      .from('conversations')
      .insert([
        {
          user_id: userId,
          message_encrypted: encryptedMessage,
          response_encrypted: encryptedResponse,
          language: language,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Error storing conversation:', error);
    }
  } catch (error) {
    console.error('Failed to store conversation:', error);
  }
}

// Get conversation history with decryption
async function getConversationHistory(userId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }

    const decryptedConversations = [];
    for (const conv of data) {
      const message = decrypt(conv.message_encrypted);
      const response = decrypt(conv.response_encrypted);

      if (message && response) {
        decryptedConversations.push({
          message,
          response,
          language: conv.language,
          created_at: conv.created_at
        });
      }
    }

    return decryptedConversations.reverse(); // Return in chronological order
  } catch (error) {
    console.error('Failed to fetch conversation history:', error);
    return [];
  }
}

// API Routes

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId = uuidv4() } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'Message is required',
        error_es: 'El mensaje es requerido'
      });
    }

    // Detect language
    const detectedLanguage = detectLanguage(message);

    // Check if we need real-time search
    const needsRealTimeSearch = shouldUseRealTimeSearch(message);
    let realTimeData = null;

    if (needsRealTimeSearch) {
      realTimeData = await searchRealTimeData(message, detectedLanguage);
    }

    // Get conversation history for context
    const history = await getConversationHistory(userId, 5);

    // Build context from history
    let contextMessages = [
      {
        role: "system",
        content: ROB_SYSTEM_PROMPT
      }
    ];

    // Add recent conversation history
    history.forEach(conv => {
      contextMessages.push(
        { role: "user", content: conv.message },
        { role: "assistant", content: conv.response }
      );
    });

    // Add real-time data context if available
    if (realTimeData) {
      const realTimeContext = `[REAL-TIME DATA] Current insights for "${realTimeData.searchQuery}":
${realTimeData.summary}

Key findings:
${realTimeData.results.map(r => `- ${r.title}: ${r.content.substring(0, 200)}...`).join('\n')}

Source dates: ${realTimeData.results.map(r => r.publishedDate).join(', ')}`;

      contextMessages.push({
        role: "system",
        content: realTimeContext
      });
    }

    // Add current message
    contextMessages.push({
      role: "user",
      content: `[Language: ${detectedLanguage}] ${message}`
    });

    // Get response from OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: contextMessages,
      max_tokens: 800,
      temperature: 0.7,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    });

    const response = completion.choices[0].message.content.trim();

    // Store conversation (encrypted)
    await storeConversation(userId, message, response, detectedLanguage);

    // Log interaction (no personal data)
    const searchInfo = realTimeData ? ` + real-time data (${realTimeData.results.length} sources)` : '';
    console.log(`Rob conversation: ${detectedLanguage} language, ${message.length} chars input, ${response.length} chars output${searchInfo}`);

    res.json({
      response,
      language: detectedLanguage,
      userId: userId
    });

  } catch (error) {
    console.error('Chat error:', error);

    const errorMessage = detectLanguage(req.body.message || '') === 'en'
      ? "I'm having technical issues. Try again in a moment."
      : "Tengo problemas técnicos. Intenta de nuevo en un momento.";

    res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Voice endpoint
app.post('/api/voice', async (req, res) => {
  try {
    const { text, language = 'es' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: 'Text is required for voice synthesis',
        error_es: 'El texto es requerido para síntesis de voz'
      });
    }

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

    if (!cleanText) {
      return res.status(400).json({
        error: 'No valid text content for synthesis'
      });
    }

    // Select premium male voice based on language
    let selectedVoice, speed;

    if (language === 'en') {
      selectedVoice = 'onyx';  // Deep, authoritative male voice
      speed = 1.0;             // Natural English pace
    } else {
      selectedVoice = 'echo';  // Clear, professional male voice
      speed = 0.95;            // Slightly slower for Spanish clarity
    }

    // Use high-quality model for better results
    const speech = await openai.audio.speech.create({
      model: "tts-1-hd",      // High-quality model
      voice: selectedVoice,
      input: cleanText,
      speed: speed
    });

    const buffer = Buffer.from(await speech.arrayBuffer());

    // Set proper headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(buffer);

    console.log(`🎙️ OpenAI TTS: ${selectedVoice} voice, ${language} language, ${cleanText.length} chars`);
    console.log(`🔊 Generated audio buffer: ${buffer.length} bytes`);

  } catch (error) {
    console.error('Voice synthesis error:', error);
    res.status(500).json({
      error: 'Voice synthesis failed',
      error_es: 'Error en síntesis de voz'
    });
  }
});

// Data deletion endpoint
app.delete('/api/data/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting user data:', error);
      return res.status(500).json({
        error: 'Failed to delete data',
        error_es: 'Error al eliminar datos'
      });
    }

    console.log(`User data deleted for: ${userId}`);

    res.json({
      message: 'Data deleted successfully',
      message_es: 'Datos eliminados exitosamente'
    });

  } catch (error) {
    console.error('Data deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete data',
      error_es: 'Error al eliminar datos'
    });
  }
});

// Privacy policy endpoint
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Rob-AI Assistant'
  });
});

// Catch all route - serve main app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🤖 Rob-AI Assistant running on port ${PORT}`);
  console.log(`📊 Ready to help José create results, not applause`);
});