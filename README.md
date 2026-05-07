# 🤖 Rob AI - Direct Business Strategy Assistant

**No applause. Just results.**

Rob is a direct, provocative AI assistant built for José's audience of entrepreneurs, creators, and professionals. Specializes in LinkedIn content creation, business monetization strategies, and cutting through the noise with brutal clarity.

## 🎯 What Rob Does

- **LinkedIn Content Creation**: Viral hooks, reels scripts, engaging posts
- **Business Strategy**: Monetization ideas, growth tactics, strategic thinking  
- **Sales & Positioning**: DM strategies, personal branding, authority building
- **Direct Communication**: Short, sharp advice that converts

## 🔥 Rob's Personality

Rob speaks like someone who wants results, not applause:

- ✅ **Direct & Provocative**: Cuts through the noise
- ✅ **Strategic**: Focuses on what actually works  
- ✅ **Energy**: Motivating but uncomfortable truths
- ✅ **Results-Oriented**: No generic advice, just action
- ❌ **Never**: Generic, cliché, sugarcoating, long-winded

**Communication Style:**
- Instead of "Here are some ideas" → "Three moves. Pick one."
- Instead of "That's a great question" → Just answers it
- Instead of "You might want to consider" → "Do this."

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Clone repository
git clone https://github.com/fatguylilcoat98/Rob-AI.git
cd Rob-AI

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` with your credentials:

```env
# Required - Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key-here

# Required - Create free project at https://supabase.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Required - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your-64-character-hex-encryption-key-here
```

### 3. Setup Database

1. Create a [Supabase](https://supabase.com) project
2. Go to SQL Editor in your Supabase dashboard
3. Copy and run the entire `database-schema.sql` file
4. Verify tables were created successfully

### 4. Run Rob

```bash
# Development
npm run dev

# Production
npm start
```

Rob will be available at `http://localhost:3000`

## 🏗️ Architecture

### Backend (Node.js + Express)
- **OpenAI GPT-4o-mini**: Rob's conversational engine
- **Supabase**: Encrypted conversation storage
- **AES-256-GCM**: End-to-end encryption for all data
- **Bilingual**: Auto-detects Spanish/English, defaults to Spanish

### Frontend (Vanilla JS)
- **Mobile-first design**: Optimized for José's mobile audience
- **Real-time chat**: Instant responses with typing indicators
- **Voice capabilities**: Speech-to-text and text-to-speech
- **Privacy controls**: Data deletion and language switching

### Security & Privacy
- 🔒 **AES-256-GCM encryption** on all stored conversations
- 🗑️ **Auto-deletion** after 90 days
- 🚫 **Zero PII collection** - no names, emails, phones
- 📊 **Logs contain zero** conversation content
- 🔐 **Row Level Security** in database

## 🌟 Key Features

### Bilingual Support
- **Auto-detection**: Detects Spanish or English input
- **Default Spanish**: Optimized for José's primary audience
- **Seamless switching**: Toggle languages instantly

### Voice Capabilities
- **Text-to-Speech**: Rob speaks responses using OpenAI voice
- **Speech-to-Text**: Voice input for hands-free interaction
- **Mobile optimized**: Perfect for on-the-go content creation

### Privacy First
- **Encrypted storage**: All conversations protected with military-grade encryption
- **Auto-cleanup**: Data automatically deleted after 90 days
- **User control**: Delete all data with one button
- **GDPR/CCPA compliant**: Full privacy law compliance

### Mobile Experience
- **Progressive Web App**: Installable on mobile devices
- **Responsive design**: Perfect on phones, tablets, desktop
- **Touch optimized**: Designed for thumb-friendly interaction
- **Fast loading**: Optimized for mobile networks

## 🔧 API Endpoints

### POST `/api/chat`
Main conversation endpoint

**Request:**
```json
{
  "message": "Help me create a LinkedIn hook about AI",
  "userId": "user_abc123"
}
```

**Response:**
```json
{
  "response": "Three hooks. Pick one:\n\n1. 'AI won't replace you. Someone using AI will.'\n2. 'Stop building features. Start building obsessions.'\n3. 'Your competition isn't learning AI. That's your advantage.'",
  "language": "en",
  "userId": "user_abc123"
}
```

### POST `/api/voice`
Text-to-speech synthesis

**Request:**
```json
{
  "text": "Three moves. Pick one.",
  "language": "en"
}
```

**Response:** Audio stream (MP3)

### DELETE `/api/data/:userId`
Delete all user data

**Response:**
```json
{
  "message": "Data deleted successfully",
  "message_es": "Datos eliminados exitosamente"
}
```

## 🚀 Deployment

### Render (Recommended)

1. **Connect repository** to [Render](https://render.com)
2. **Environment variables**: Set all required variables as secrets
3. **Deploy**: Automatic deployment from `render.yaml`

### Manual Deployment

```bash
# Build for production
npm install --production

# Set environment variables
export OPENAI_API_KEY=your-key
export SUPABASE_URL=your-url
export SUPABASE_ANON_KEY=your-key
export ENCRYPTION_KEY=your-encryption-key
export NODE_ENV=production

# Start server
npm start
```

## 🛠️ Development

### Local Development

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Run in production mode locally
npm start
```

### Code Structure

```
Rob-AI/
├── server.js              # Main server & API endpoints
├── package.json            # Dependencies & scripts
├── database-schema.sql     # Complete database setup
├── render.yaml            # Deployment configuration
├── .env.example           # Environment template
└── public/                # Frontend assets
    ├── index.html         # Main application
    ├── styles.css         # Mobile-first styling
    ├── app.js             # Frontend logic
    └── privacy.html       # Privacy policy page
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4o-mini |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `ENCRYPTION_KEY` | Yes | 64-char hex key for AES-256 encryption |
| `NODE_ENV` | No | Environment mode (development/production) |
| `PORT` | No | Server port (defaults to 3000) |

## 📊 Rob's Knowledge Base

Rob is optimized for José's specific audience and use cases:

### Target Audience
- **Entrepreneurs** looking to scale with content
- **Creators** monetizing their knowledge  
- **Professionals** building personal brands
- **LinkedIn-focused** growth strategies
- **25,000+** follower insights from José's experience

### Content Specialties
- **LinkedIn reels scripts** and viral hooks
- **Business monetization** strategies
- **Personal branding** and positioning
- **Sales and DM** strategies
- **AI integration** for business growth
- **Tech sales** insights and tactics

## 🔐 Security Details

### Encryption Implementation
- **Algorithm**: AES-256-GCM with authenticated encryption
- **Key Management**: Environment-based key storage
- **Data Flow**: Encrypted before database storage
- **Access**: Only encrypted data in database, decryption on-demand

### Privacy Compliance
- **GDPR Article 17**: Right to erasure implemented
- **CCPA**: California consumer privacy rights
- **Data Minimization**: Only conversation content stored
- **Purpose Limitation**: Data used only for chat functionality

### Security Best Practices
- **Environment Variables**: All secrets in environment, never in code
- **HTTPS Required**: TLS encryption for all communications  
- **Input Validation**: All user input sanitized
- **Rate Limiting**: Protection against abuse
- **Content Security Policy**: XSS protection headers

## 📈 Analytics & Monitoring

### Privacy-Safe Metrics
- **Usage patterns**: Aggregated, non-identifying usage data
- **Performance monitoring**: Response times and error rates
- **Language preferences**: Spanish vs English usage
- **Feature adoption**: Voice vs text interaction rates

### Logging Policy
- ✅ **Server performance** metrics logged
- ✅ **Error messages** without personal data
- ✅ **API response times** and success rates
- ❌ **Zero conversation content** in logs
- ❌ **No user identification** in logs

## 🤝 Support & Contact

### For Users
- **Privacy questions**: privacy@rob-ai.com
- **Technical issues**: Create issue in repository
- **Feature requests**: GitHub discussions

### For Developers  
- **Documentation**: This README + code comments
- **API questions**: Check API endpoint documentation
- **Contributions**: Fork, improve, pull request

## 📄 License

MIT License - See LICENSE file for details.

## 🚀 Ready to Deploy?

1. ✅ **Environment configured**
2. ✅ **Database schema applied**  
3. ✅ **Secrets set in deployment**
4. ✅ **Privacy policy reviewed**

**Deploy command:**
```bash
git push origin master
```

Rob is ready to help José's audience get results, not applause. 🎯

---

*Built for entrepreneurs who want results, not applause. No generic advice. Just action.*