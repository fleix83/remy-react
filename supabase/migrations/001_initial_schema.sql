-- Enable RLS
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
CREATE TYPE access_role AS ENUM ('all', 'user', 'moderator', 'admin');

-- Create users table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  avatar VARCHAR(255),
  biography TEXT,
  avatar_url VARCHAR(255),
  bio TEXT,
  role user_role DEFAULT 'user',
  is_banned BOOLEAN DEFAULT FALSE,
  default_canton VARCHAR(2),
  language_preference VARCHAR(2) DEFAULT 'de',
  messages_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create categories table
CREATE TABLE public.categories (
  id SERIAL PRIMARY KEY,
  name_de VARCHAR(50) NOT NULL,
  name_fr VARCHAR(255),
  name_it VARCHAR(255),
  description_de TEXT,
  description_fr TEXT,
  description_it TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  access_role access_role DEFAULT 'all'
);

-- Create designations table
CREATE TABLE public.designations (
  id SERIAL PRIMARY KEY,
  name_de VARCHAR(255) NOT NULL,
  name_fr VARCHAR(255) NOT NULL,
  name_it VARCHAR(255) NOT NULL,
  description_de TEXT,
  description_fr TEXT,
  description_it TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create therapists table
CREATE TABLE public.therapists (
  id SERIAL PRIMARY KEY,
  form_of_address VARCHAR(10) NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  institution VARCHAR(255),
  designation VARCHAR(50) NOT NULL,
  description TEXT,
  canton CHAR(2),
  designation_id INTEGER REFERENCES designations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create posts table
CREATE TABLE public.posts (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  category_id INTEGER REFERENCES categories(id) NOT NULL,
  title VARCHAR(255) DEFAULT 'No Title',
  content TEXT NOT NULL,
  parent_id INTEGER REFERENCES posts(id),
  canton VARCHAR(2) NOT NULL,
  therapist VARCHAR(255),
  designation VARCHAR(50) NOT NULL,
  tags VARCHAR(255),
  therapist_id INTEGER REFERENCES therapists(id),
  is_published BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_banned BOOLEAN DEFAULT FALSE,
  is_deactivated BOOLEAN DEFAULT FALSE,
  sticky BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comments table
CREATE TABLE public.comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) NOT NULL,
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE public.messages (
  id SERIAL PRIMARY KEY,
  sender_id UUID REFERENCES users(id) NOT NULL,
  receiver_id UUID REFERENCES users(id) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  post_messages_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create post_saved table (drafts)
CREATE TABLE public.post_saved (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  category_id INTEGER REFERENCES categories(id) NOT NULL,
  canton VARCHAR(5) NOT NULL,
  therapist VARCHAR(255),
  designation VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  tags VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tags table
CREATE TABLE public.tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- Create post_tags table
CREATE TABLE public.post_tags (
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Create user_blocks table
CREATE TABLE public.user_blocks (
  id SERIAL PRIMARY KEY,
  blocker_id UUID REFERENCES users(id) NOT NULL,
  blocked_id UUID REFERENCES users(id) NOT NULL,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_therapists_updated_at BEFORE UPDATE ON therapists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_saved ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Public profiles are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Posts policies
CREATE POLICY "Published posts are viewable by everyone" ON posts 
  FOR SELECT USING (is_published = true AND is_active = true AND is_banned = false);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view their own messages" ON messages 
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update messages they sent" ON messages FOR UPDATE USING (auth.uid() = sender_id);

-- Post saved policies
CREATE POLICY "Users can view their own drafts" ON post_saved FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create drafts" ON post_saved FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their drafts" ON post_saved FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their drafts" ON post_saved FOR DELETE USING (auth.uid() = user_id);

-- User blocks policies
CREATE POLICY "Users can manage their blocks" ON user_blocks FOR ALL USING (auth.uid() = blocker_id);

-- Public tables (no RLS needed)
-- Categories, designations, therapists, tags are publicly readable

-- Insert default categories
INSERT INTO categories (name_de, name_fr, name_it, access_role) VALUES
('Erfahrung', 'Expérience', 'Esperienza', 'all'),
('Suche TherapeutIn', 'Recherche d''un thérapeute', 'Cercare un terapeuta', 'all'),
('Gedanken', 'Pensées', 'Pensieri', 'all'),
('Rant', 'Rant', 'Rant', 'all'),
('Ressourcen', 'Ressources', 'Risorse', 'all');

-- Insert default designations
INSERT INTO designations (name_de, name_fr, name_it) VALUES
('Berater', 'Conseiller', 'Consulente'),
('Psychologe*', 'Psychologue', 'Psicologo*'),
('Psychiaterin', 'Psychiatre', 'Psichiatra'),
('Pfleger*', 'Infirmier*', 'Infermiere*'),
('Coach', 'Coach', 'Coach'),
('Psychotherapeut', 'Psychothérapeute', 'Psicoterapeuta'),
('Sozialarbeiter*', 'Assistant social*', 'Assistente sociale'),
('Klinik', 'Clinique', 'Clinica'),
('Tagesklinik', 'Clinique de jour', 'Clinica diurna'),
('Tagesstruktur', 'Structure de jour', 'Struttura diurna'),
('Beraterin', 'Conseillère', 'Consulente');

-- Create function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();