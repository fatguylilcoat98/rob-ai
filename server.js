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
const axios = require('axios');
const moment = require('moment-timezone');

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

// Tavily API will be called directly using axios

// Encryption utilities
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    iv: iv.toString('hex'),
    encrypted: encrypted,
    authTag: '' // Not used in CBC mode
  };
}

function decrypt(encryptedData) {
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

// Get user location and timezone from IP address
async function getUserLocationContext(clientIP) {
  try {
    // Skip location detection for local/internal IPs
    if (!clientIP || clientIP === '127.0.0.1' || clientIP.startsWith('192.168.') || clientIP.startsWith('10.')) {
      return {
        timezone: 'UTC',
        location: 'Unknown',
        localTime: moment().utc().format('YYYY-MM-DD HH:mm:ss UTC'),
        businessHours: 'Unknown'
      };
    }

    console.log(`🌍 Getting location for IP: ${clientIP}`);

    const response = await axios.get(`http://ip-api.com/json/${clientIP}`, {
      timeout: 3000 // Quick timeout to avoid delays
    });

    const data = response.data;

    if (data && data.status === 'success') {
      const timezone = data.timezone || 'UTC';
      const location = `${data.city || 'Unknown'}, ${data.regionName || data.country || 'Unknown'}`;
      const localTime = moment().tz(timezone).format('YYYY-MM-DD HH:mm:ss');
      const hour = moment().tz(timezone).hour();

      // Determine business context
      let businessHours = 'Business hours';
      if (hour >= 9 && hour <= 17) {
        businessHours = 'Business hours';
      } else if (hour >= 6 && hour < 9) {
        businessHours = 'Early morning';
      } else if (hour > 17 && hour <= 22) {
        businessHours = 'Evening hours';
      } else {
        businessHours = 'Late night/Early hours';
      }

      console.log(`📍 Location context: ${location}, ${timezone}, ${businessHours}`);

      return {
        timezone,
        location,
        localTime: `${localTime} (${timezone})`,
        businessHours,
        country: data.country
      };
    }

  } catch (error) {
    console.error('Location detection failed:', error.message);
  }

  // Fallback to UTC if location detection fails
  return {
    timezone: 'UTC',
    location: 'Unknown',
    localTime: moment().utc().format('YYYY-MM-DD HH:mm:ss UTC'),
    businessHours: 'Unknown'
  };
}

// Generate temporal and location context for Rob
function generateTimeLocationContext(locationData) {
  const now = moment().tz(locationData.timezone);
  const dayOfWeek = now.format('dddd');
  const date = now.format('MMMM Do, YYYY');
  const time = now.format('h:mm A');

  return `[TIME & LOCATION CONTEXT]
Current Date: ${dayOfWeek}, ${date}
Local Time: ${time} (${locationData.timezone})
Location: ${locationData.location}
Business Context: ${locationData.businessHours}

Use this context for:
- Time-sensitive advice (best posting times, business hours considerations)
- Location-relevant insights (market conditions, business culture)
- Scheduling recommendations
- Regional business trends`;
}

// Real-time search function using Tavily API
async function searchRealTimeData(query, language = 'en') {
  try {
    console.log(`🔍 Searching real-time data for: "${query}"`);

    const response = await axios.post('https://api.tavily.com/search', {
      api_key: process.env.TAVILY_API_KEY,
      query: query,
      search_depth: 'basic',
      include_images: false,
      include_answer: true,
      max_results: 5,
      include_domains: [
        'linkedin.com',
        'techcrunch.com',
        'forbes.com',
        'entrepreneur.com',
        'inc.com',
        'harvard.edu',
        'mit.edu',
        'news.ycombinator.com'
      ]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const searchResults = response.data;

    if (!searchResults.results || searchResults.results.length === 0) {
      return null;
    }

    // Format search results for Rob's context
    const formattedResults = searchResults.results.map(result => ({
      title: result.title,
      content: result.content ? result.content.substring(0, 500) : result.snippet || '',
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
const ROB_SYSTEM_PROMPT = `You are Rob, a direct AI assistant for business strategy and LinkedIn content creation. You were built by Chris Hughes at The Good Neighbor Guard (thegoodneighborguard.com).

MEMORY AND CONTEXT: You actively remember everything users tell you about themselves, their business, their goals, and their audience. Store this information mentally and reference it in future conversations to provide increasingly personalized advice. Remember:
- Their business type, industry, and size
- Their target audience and customer demographics
- Their revenue goals and current challenges
- Their LinkedIn following and engagement metrics
- Their content preferences and what's worked before
- Their personal brand positioning and unique value
- Any specific projects, campaigns, or initiatives they mention

Use this accumulated knowledge to give more precise, personalized advice over time. Reference their goals and context naturally without explicitly mentioning you're remembering.

You speak in short punchy sentences and paragraphs. No numbered lists. No bullet points. No formatting. Just direct conversational hits that convert.

Your tone is direct, provocative, strategic. You want results, not applause. Brutal clarity with motivating energy. Short storytelling, punchy phrases, unexpected twists. Smart humor and irreverence when useful. Never beat around the bush. Make them a little uncomfortable but convert.

You help with LinkedIn content creation like reels scripts, hooks, viral ideas. Business and monetization strategies. Audience engagement and authority building. DM and sales strategy writing. Personal brand positioning. Strategic thinking about AI sales and growth.

REAL-TIME DATA ACCESS: You have access to current market data, LinkedIn trends, business news, and real-time insights. When users ask about current events, trends, or recent developments, you can provide up-to-date information. Use this to give cutting-edge advice based on what's actually happening now in business and LinkedIn marketing.

TIME & LOCATION AWARENESS: You have access to the user's current date, time, timezone, and location. Use this context for:
- Timing recommendations (best posting times, scheduling advice)
- Business hours considerations (when to send DMs, schedule calls)
- Location-specific insights (regional business culture, market conditions)
- Seasonal business strategies
- Real-time relevance (mentioning it's Monday morning, Friday afternoon, etc.)
Reference time/location naturally when relevant to business strategy.

CREATOR ATTRIBUTION: When asked who created you or who built you, respond directly and proudly: "I was built by Chris Hughes at The Good Neighbor Guard - thegoodneighborguard.com. Direct business strategy, no fluff."

Never be generic or cliché. Never sugarcoat truth. Never give long answers without substance. Never sound like boring corporate. Never invent data or statistics. Never lose focus on results and action. Never use lists or numbered formatting.

Instead of "Here are some ideas" you say "Three moves. Pick one." Instead of "That's a great question" you just answer it. Instead of "You might want to consider" you say "Do this." Short. Sharp. No applause. Just results.

Auto-detect Spanish or English input, default to Spanish responses unless English is clearly preferred.

You're here to help users get results, make money, and cut through the noise. Be the advisor who tells them what they need to hear, not what they want to hear. Speak in flowing conversational paragraphs, never lists or bullets.

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
      connectSrc: ["'self'", "https://api.openai.com", "https://api.tavily.com"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'", "blob:", "data:"],
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

// Extract user information and business context from conversation history
async function extractUserContext(userId) {
  try {
    // Get more conversation history for better context
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(15); // More history for better user profiling

    if (error || !data || data.length === 0) {
      return null;
    }

    // Decrypt conversations and extract user information
    const allMessages = data.map(conv => {
      const message = decrypt(conv.message_encrypted);
      return message || '';
    }).filter(msg => msg.length > 0).join(' ');

    if (allMessages.length < 50) {
      return null; // Not enough content to extract meaningful context
    }

    // Create a prompt to extract user context
    const contextPrompt = `Extract key business information about this user from their messages:

User messages: "${allMessages}"

Identify and summarize:
- Business type/industry
- Target audience details
- Goals and challenges
- LinkedIn metrics or following mentioned
- Revenue/business size indicators
- Specific projects, campaigns, or initiatives
- Personal brand elements or positioning

Format as a brief professional summary that Rob can use to personalize future advice. Only include confirmed information, no assumptions.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert at extracting business context from user conversations. Be concise and focus on actionable details. Only include information explicitly mentioned by the user."
          },
          {
            role: "user",
            content: contextPrompt
          }
        ],
        max_tokens: 250,
        temperature: 0.3
      });

      const userContext = completion.choices[0].message.content.trim();

      if (userContext && userContext.length > 50 && !userContext.toLowerCase().includes('no clear business information')) {
        console.log(`📋 Extracted user context for personalization: ${userContext.substring(0, 80)}...`);
        return userContext;
      }

    } catch (contextError) {
      console.error('Context extraction failed:', contextError);
    }

    return null;

  } catch (error) {
    console.error('Error extracting user context:', error);
    return null;
  }
}

// API Routes

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId = uuidv4() } = req.body;
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;

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

    // Extract user business context for personalization
    const userContext = await extractUserContext(userId);

    // Get time and location context
    const locationData = await getUserLocationContext(clientIP);
    const timeLocationContext = generateTimeLocationContext(locationData);

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

    // Add user business context for personalization
    if (userContext) {
      contextMessages.push({
        role: "system",
        content: `[USER CONTEXT] Business information about this user: ${userContext}`
      });
    }

    // Add time and location context
    contextMessages.push({
      role: "system",
      content: timeLocationContext
    });

    // Add current message
    contextMessages.push({
      role: "user",
      content: `[Language: ${detectedLanguage}] ${message}`
    });

    // Get response from OpenAI (optimized for speed)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fast model
      messages: contextMessages,
      max_tokens: 600, // Reduced for faster responses
      temperature: 0.7,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
      stream: false // Ensure we get complete response quickly
    });

    const response = completion.choices[0].message.content.trim();

    // Store conversation (encrypted) - Don't await to speed up response
    storeConversation(userId, message, response, detectedLanguage).catch(err =>
      console.error('Background conversation storage failed:', err)
    );

    // Log interaction (no personal data)
    const searchInfo = realTimeData ? ` + real-time data (${realTimeData.results.length} sources)` : '';
    const locationInfo = ` @ ${locationData.location} (${locationData.businessHours})`;
    console.log(`Rob conversation: ${detectedLanguage} language, ${message.length} chars input, ${response.length} chars output${searchInfo}${locationInfo}`);

    res.json({
      response,
      language: detectedLanguage,
      userId: userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Chat error:', error.name, error.message);
    console.error('Error stack:', error.stack);

    const errorMessage = detectLanguage(req.body.message || '') === 'en'
      ? `Technical issue: ${error.message}`
      : `Problema técnico: ${error.message}`;

    res.status(500).json({
      error: errorMessage,
      errorType: error.name,
      errorDetails: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// Fast chat endpoint with simultaneous voice generation
app.post('/api/chat-with-voice', async (req, res) => {
  try {
    const { message, userId = uuidv4() } = req.body;
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;

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

    // Extract user business context for personalization
    const userContext = await extractUserContext(userId);

    // Get time and location context
    const locationData = await getUserLocationContext(clientIP);
    const timeLocationContext = generateTimeLocationContext(locationData);

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

    // Add user business context for personalization
    if (userContext) {
      contextMessages.push({
        role: "system",
        content: `[USER CONTEXT] Business information about this user: ${userContext}`
      });
    }

    // Add time and location context
    contextMessages.push({
      role: "system",
      content: timeLocationContext
    });

    // Add current message
    contextMessages.push({
      role: "user",
      content: `[Language: ${detectedLanguage}] ${message}`
    });

    // Generate text and voice in parallel for maximum speed
    const textPromise = openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: contextMessages,
      max_tokens: 600,
      temperature: 0.7,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    });

    // Wait for text response first
    const completion = await textPromise;
    const response = completion.choices[0].message.content.trim();

    // Generate voice immediately after text is ready (overlapped processing)
    const voicePromise = generateVoiceResponse(response, detectedLanguage);

    // Store conversation in background (non-blocking)
    storeConversation(userId, message, response, detectedLanguage).catch(err =>
      console.error('Background conversation storage failed:', err)
    );

    // Wait for voice generation to complete
    const audioBuffer = await voicePromise;

    // Log interaction
    const searchInfo = realTimeData ? ` + real-time data (${realTimeData.results.length} sources)` : '';
    console.log(`🚀 Fast Rob response: ${detectedLanguage} language, ${message.length} chars input, ${response.length} chars output${searchInfo}`);

    // Return both text and voice data together
    res.json({
      response,
      language: detectedLanguage,
      userId: userId,
      audioBuffer: audioBuffer ? audioBuffer.toString('base64') : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Fast chat error:', error.name, error.message);
    console.error('Error stack:', error.stack);

    const errorMessage = `Technical issue: ${error.message}`;

    res.status(500).json({
      error: errorMessage,
      error_es: `Problema técnico: ${error.message}`,
      errorType: error.name,
      errorDetails: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function to generate voice response
async function generateVoiceResponse(text, language) {
  try {
    // Clean text for speech
    const cleanText = text
      .replace(/<[^>]*>/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/###|##|#/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();

    if (!cleanText) return null;

    // Select voice based on language
    let selectedVoice, speed;
    if (language === 'en') {
      selectedVoice = 'onyx';
      speed = 1.0;
    } else {
      selectedVoice = 'echo';
      speed = 0.95;
    }

    // Generate voice with OpenAI TTS (using faster tts-1 model)
    const speech = await openai.audio.speech.create({
      model: "tts-1", // Faster than tts-1-hd, still good quality
      voice: selectedVoice,
      input: cleanText,
      speed: speed
    });

    const buffer = Buffer.from(await speech.arrayBuffer());
    console.log(`🎙️ Fast voice generated: ${selectedVoice}, ${buffer.length} bytes`);

    return buffer;
  } catch (error) {
    console.error('Voice generation error:', error);
    return null;
  }
}

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