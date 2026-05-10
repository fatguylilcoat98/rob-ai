/*
 * Rob-AI - Database Schema
 * Encrypted conversation storage with privacy-first design
 * Built for José's LinkedIn Content & Business Strategy Assistant
 */

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  email varchar(255) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  name varchar(255) NOT NULL,
  is_active boolean DEFAULT true,
  email_verified boolean DEFAULT false,
  last_login timestamptz,
  password_changed_at timestamptz DEFAULT now(),
  failed_login_attempts integer DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Conversations table with encrypted storage
CREATE TABLE IF NOT EXISTS conversations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_encrypted jsonb NOT NULL, -- {iv, encrypted, authTag}
  response_encrypted jsonb NOT NULL, -- {iv, encrypted, authTag}
  language varchar(2) DEFAULT 'es' CHECK (language IN ('es', 'en')),
  created_at timestamptz DEFAULT now()
);

-- User analytics (non-PII only)
CREATE TABLE IF NOT EXISTS user_analytics (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_start timestamptz DEFAULT now(),
  session_end timestamptz,
  messages_count integer DEFAULT 0,
  language_preference varchar(2) DEFAULT 'es',
  last_active timestamptz DEFAULT now(),

  -- Aggregated metrics only
  total_interactions integer DEFAULT 0,
  preferred_topics text[] DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id)
);

-- Content templates for Rob's responses (for consistency)
CREATE TABLE IF NOT EXISTS content_templates (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_type varchar(100) NOT NULL, -- 'linkedin_hook', 'business_idea', 'sales_dm', etc.
  language varchar(2) NOT NULL CHECK (language IN ('es', 'en')),
  template_content text NOT NULL,
  usage_count integer DEFAULT 0,
  effectiveness_score decimal(3,2) DEFAULT 0.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Rob's knowledge base (for José's business context)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  topic varchar(200) NOT NULL,
  content text NOT NULL,
  language varchar(2) NOT NULL CHECK (language IN ('es', 'en')),
  tags text[] DEFAULT '{}',
  priority integer DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),
  last_updated timestamptz DEFAULT now()
);

-- Create indexes for performance (separate from table definitions)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email, is_active);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_user_date ON conversations(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_templates_type_lang ON content_templates(template_type, language);
CREATE INDEX IF NOT EXISTS idx_knowledge_topic ON knowledge_base(topic);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_base USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_priority ON knowledge_base(priority);

-- Row Level Security (RLS) - Privacy first
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can access their own profile"
  ON users FOR ALL
  USING (id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can only access their own conversations"
  ON conversations FOR ALL
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can only access their own analytics"
  ON user_analytics FOR ALL
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- Content templates and knowledge base are system-managed
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to templates"
  ON content_templates FOR SELECT
  USING (true);

CREATE POLICY "Public read access to knowledge base"
  ON knowledge_base FOR SELECT
  USING (true);

-- Trigger to update analytics
CREATE OR REPLACE FUNCTION update_user_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_analytics (user_id, messages_count, total_interactions, last_active)
  VALUES (NEW.user_id, 1, 1, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    messages_count = user_analytics.messages_count + 1,
    total_interactions = user_analytics.total_interactions + 1,
    last_active = now(),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_analytics
  AFTER INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_analytics();

-- Trigger to update updated_at timestamp on users table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to set current user for RLS
CREATE OR REPLACE FUNCTION set_current_user_id(user_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Data retention policy (auto-delete old conversations after 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_conversations()
RETURNS void AS $$
BEGIN
  DELETE FROM conversations
  WHERE created_at < now() - INTERVAL '90 days';

  -- Log cleanup
  RAISE NOTICE 'Cleaned up conversations older than 90 days';
END;
$$ LANGUAGE plpgsql;

-- Initial content templates for Rob
INSERT INTO content_templates (template_type, language, template_content) VALUES
('linkedin_hook', 'es', 'Tres movimientos. Elige uno.'),
('linkedin_hook', 'en', 'Three moves. Pick one.'),
('business_strategy', 'es', 'Deja de hacer esto. Haz esto en su lugar.'),
('business_strategy', 'en', 'Stop doing this. Do this instead.'),
('sales_dm', 'es', 'Pregunta directa: ¿Esto te está funcionando?'),
('sales_dm', 'en', 'Direct question: Is this working for you?');

-- Initial knowledge base for José's context
INSERT INTO knowledge_base (topic, content, language, tags, priority) VALUES
('jose_audience', 'José''s audience: Entrepreneurs, creators, professionals who want to monetize knowledge, grow on LinkedIn, scale with content and technology. 25,000+ followers. Tech sales and personal branding expertise.', 'en', ARRAY['audience', 'linkedin', 'monetization'], 10),
('jose_audiencia', 'Audiencia de José: Emprendedores, creadores, profesionales que quieren monetizar conocimiento, crecer en LinkedIn, escalar con contenido y tecnología. 25,000+ seguidores. Experiencia en ventas tech y marca personal.', 'es', ARRAY['audiencia', 'linkedin', 'monetización'], 10),
('content_strategy', 'Focus on results, not applause. Short, direct, provocative. Make them uncomfortable but convert. No generic advice - specific actionable steps.', 'en', ARRAY['content', 'strategy', 'linkedin'], 9),
('estrategia_contenido', 'Enfócate en resultados, no aplausos. Corto, directo, provocativo. Hazlos sentir incómodos pero convierte. No consejos genéricos - pasos específicos y accionables.', 'es', ARRAY['contenido', 'estrategia', 'linkedin'], 9);

/*
 * Schema setup complete
 *
 * Features:
 * ✓ Encrypted conversation storage
 * ✓ Privacy-first design with RLS
 * ✓ Bilingual support (ES/EN)
 * ✓ Auto-cleanup after 90 days
 * ✓ Analytics without PII
 * ✓ Rob's knowledge base
 * ✓ Content templates for consistency
 *
 * Ready for production deployment!
 */