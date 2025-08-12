# React + Supabase Implementation Plan for Remy Forum

## Executive Summary
Convert the existing PHP-based Remy psychotherapy patient forum to a modern React web application using Supabase as the backend-as-a-service. This plan maintains all current functionality while adding real-time capabilities and modern development practices.

## Technical Architecture

### **Tech Stack**
- **Frontend**: React 18+ with TypeScript
- **Backend**: Supabase (PostgreSQL + Real-time + Auth + Storage)
- **Styling**: Tailwind CSS + Headless UI components
- **State Management**: Zustand + React Query (TanStack Query)
- **Rich Text**: Tiptap editor (modern replacement for Summernote)
- **Routing**: React Router v6
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library
- **Deployment**: Vercel/Netlify for frontend, Supabase for backend

### **Project Structure**
```
remy-react/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Route components  
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # Zustand stores
│   ├── services/           # API service layer
│   ├── types/              # TypeScript definitions
│   ├── utils/              # Utility functions
│   ├── locales/            # i18n translations
│   └── assets/             # Static assets
├── supabase/
│   ├── migrations/         # Database migrations
│   ├── functions/          # Edge functions
│   └── seed.sql           # Initial data
└── docs/                  # Documentation
```

## Supabase Database Design

### **Core Tables**
```sql
-- Users with authentication
users (
  id uuid primary key references auth.users,
  username varchar unique not null,
  email varchar unique not null,
  bio text,
  avatar_url text,
  default_canton varchar(2),
  language_preference varchar(2) default 'de',
  messages_active boolean default true,
  role user_role default 'user',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Post categories with i18n
categories (
  id serial primary key,
  name_de varchar not null,
  name_fr varchar,
  name_it varchar,
  description_de text,
  description_fr text,
  description_it text,
  is_active boolean default true,
  access_role user_role default 'all'
);

-- Forum posts
posts (
  id serial primary key,
  user_id uuid references users(id),
  category_id integer references categories(id),
  title varchar not null,
  content text not null,
  canton varchar(2),
  therapist_id integer references therapists(id),
  is_published boolean default false,
  is_active boolean default true,
  is_banned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Therapist directory
therapists (
  id serial primary key,
  form_of_address varchar,
  first_name varchar not null,
  last_name varchar not null,
  institution varchar,
  designation varchar not null,
  description text,
  canton varchar(2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Comments with threading
comments (
  id serial primary key,
  post_id integer references posts(id),
  user_id uuid references users(id),
  parent_comment_id integer references comments(id),
  content text not null,
  is_edited boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Private messaging
messages (
  id serial primary key,
  sender_id uuid references users(id),
  receiver_id uuid references users(id),
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Real-time notifications
notifications (
  id serial primary key,
  user_id uuid references users(id),
  type notification_type not null,
  title varchar not null,
  message text not null,
  related_post_id integer references posts(id),
  related_comment_id integer references comments(id),
  is_read boolean default false,
  created_at timestamptz default now()
);

-- User blocking system
user_blocks (
  id serial primary key,
  blocker_id uuid references users(id),
  blocked_id uuid references users(id),
  created_at timestamptz default now(),
  unique(blocker_id, blocked_id)
);

-- Post tags system
tags (
  id serial primary key,
  name varchar unique not null,
  created_at timestamptz default now()
);

post_tags (
  post_id integer references posts(id),
  tag_id integer references tags(id),
  primary key(post_id, tag_id)
);

-- Draft posts
post_drafts (
  id serial primary key,
  user_id uuid references users(id),
  category_id integer references categories(id),
  title varchar not null,
  content text not null,
  canton varchar(2),
  therapist_id integer references therapists(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Designations for therapists
designations (
  id serial primary key,
  name_de varchar not null,
  name_fr varchar,
  name_it varchar,
  description_de text,
  description_fr text,
  description_it text,
  is_active boolean default true
);
```

### **Custom Types**
```sql
-- User roles enum
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');

-- Notification types enum  
CREATE TYPE notification_type AS ENUM (
  'comment_reply',
  'post_comment', 
  'private_message',
  'post_mention',
  'therapist_review'
);
```

### **Row Level Security (RLS)**
```sql
-- Users can only edit their own profiles
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can update own profile" ON users 
  FOR UPDATE USING (auth.uid() = id);

-- Posts are publicly readable, users can edit their own
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are publicly readable" ON posts 
  FOR SELECT USING (is_published = true AND is_active = true);
CREATE POLICY "Users can edit own posts" ON posts 
  FOR UPDATE USING (auth.uid() = user_id);

-- Messages visible only to sender/receiver
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages visible to participants" ON messages 
  FOR SELECT USING (auth.uid() IN (sender_id, receiver_id));

-- User blocks - users can manage their own blocks
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own blocks" ON user_blocks 
  FOR ALL USING (auth.uid() = blocker_id);
```

## Component Architecture

### **Core Components**
```
components/
├── layout/
│   ├── Navigation.tsx          # Main navigation with auth states
│   ├── Sidebar.tsx            # Category filters, user info
│   ├── Footer.tsx             # Site footer
│   └── Layout.tsx             # Main layout wrapper
├── forum/
│   ├── PostList.tsx           # Forum post listing with filters
│   ├── PostCard.tsx           # Individual post preview card
│   ├── PostDetail.tsx         # Full post view with comments
│   ├── PostEditor.tsx         # Create/edit post form
│   ├── CommentSystem.tsx      # Complete comment management
│   ├── CommentEditor.tsx      # Rich text comment editor
│   ├── CommentThread.tsx      # Threaded comment display
│   └── CitationManager.tsx    # Text selection and quoting
├── user/
│   ├── ProfileCard.tsx        # User profile display card
│   ├── ProfileEditor.tsx      # Profile editing form
│   ├── UserSettings.tsx       # Account settings panel
│   ├── BlockedUsers.tsx       # Blocked users management
│   ├── UserPosts.tsx          # User's post history
│   └── UserComments.tsx       # User's comment history
├── therapist/
│   ├── TherapistCard.tsx      # Therapist profile display
│   ├── TherapistList.tsx      # Searchable therapist directory
│   ├── TherapistProfile.tsx   # Full therapist profile page
│   ├── TherapistEditor.tsx    # Therapist info editing
│   └── TherapistSearch.tsx    # Advanced search filters
├── messaging/
│   ├── MessageList.tsx        # Private message inbox
│   ├── MessageThread.tsx      # Conversation thread
│   ├── MessageComposer.tsx    # New message form
│   └── MessagePreview.tsx     # Message preview card
├── moderation/
│   ├── ModerationPanel.tsx    # Admin moderation dashboard
│   ├── UserManagement.tsx     # User role/ban management
│   ├── ContentReview.tsx      # Flagged content review
│   ├── ReportModal.tsx        # Content reporting form
│   └── ModerationActions.tsx  # Quick action buttons
├── notifications/
│   ├── NotificationCenter.tsx # Notification dropdown
│   ├── NotificationItem.tsx   # Individual notification
│   └── NotificationToast.tsx  # Real-time toast alerts
├── auth/
│   ├── LoginForm.tsx          # Email/password login
│   ├── RegisterForm.tsx       # User registration
│   ├── ForgotPassword.tsx     # Password reset
│   └── AuthGuard.tsx          # Protected route wrapper
└── ui/
    ├── Button.tsx             # Styled button component
    ├── Modal.tsx              # Reusable modal dialog
    ├── Input.tsx              # Form input component
    ├── TextArea.tsx           # Form textarea component
    ├── Select.tsx             # Dropdown select component
    ├── Badge.tsx              # Category/tag badges
    ├── Avatar.tsx             # User avatar component
    ├── LoadingSpinner.tsx     # Loading state indicator
    ├── ErrorBoundary.tsx      # Error handling wrapper
    └── RichTextEditor.tsx     # Tiptap editor wrapper
```

## State Management Strategy

### **Zustand Stores**
```typescript
// Authentication store
interface AuthStore {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// Forum posts store
interface ForumStore {
  posts: Post[];
  currentPost: Post | null;
  loading: boolean;
  filters: PostFilters;
  pagination: PaginationState;
  loadPosts: (filters?: PostFilters) => Promise<void>;
  loadPost: (id: string) => Promise<void>;
  createPost: (post: CreatePostData) => Promise<void>;
  updatePost: (id: string, updates: Partial<Post>) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  setFilters: (filters: Partial<PostFilters>) => void;
}

// Comments store with real-time updates
interface CommentsStore {
  comments: Record<string, Comment[]>;
  loading: Record<string, boolean>;
  loadComments: (postId: string) => Promise<void>;
  addComment: (comment: CreateCommentData) => Promise<void>;
  editComment: (id: string, content: string) => Promise<void>;
  deleteComment: (id: string) => Promise<void>;
  replyToComment: (parentId: string, content: string) => Promise<void>;
}

// Therapist directory store
interface TherapistStore {
  therapists: Therapist[];
  currentTherapist: Therapist | null;
  loading: boolean;
  searchFilters: TherapistFilters;
  loadTherapists: (filters?: TherapistFilters) => Promise<void>;
  loadTherapist: (id: string) => Promise<void>;
  createTherapist: (data: CreateTherapistData) => Promise<void>;
  updateTherapist: (id: string, updates: Partial<Therapist>) => Promise<void>;
  setSearchFilters: (filters: Partial<TherapistFilters>) => void;
}

// Private messaging store
interface MessagingStore {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  loading: boolean;
  loadConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  sendMessage: (recipientId: string, content: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
}

// Notifications store
interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  loadNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
}

// User preferences store
interface PreferencesStore {
  language: string;
  theme: 'light' | 'dark';
  canton: string;
  messagesEnabled: boolean;
  emailNotifications: boolean;
  setLanguage: (lang: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setCanton: (canton: string) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}
```

## Real-time Features with Supabase

### **Subscription Management**
```typescript
// Real-time comment updates
const useCommentsRealtime = (postId: string) => {
  const { addComment, updateComment, removeComment } = useCommentsStore();
  
  useEffect(() => {
    const subscription = supabase
      .channel(`comments:post_id=eq.${postId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        payload => addComment(payload.new as Comment)
      )
      .on('postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        payload => updateComment(payload.new as Comment)  
      )
      .on('postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        payload => removeComment(payload.old.id)
      )
      .subscribe();
      
    return () => subscription.unsubscribe();
  }, [postId]);
};

// Real-time notifications
const useNotificationsRealtime = () => {
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  
  useEffect(() => {
    if (!user) return;
    
    const subscription = supabase
      .channel(`notifications:user_id=eq.${user.id}`)
      .on('postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        payload => {
          const notification = payload.new as Notification;
          addNotification(notification);
          
          // Show toast notification
          toast.info(notification.message, {
            action: notification.related_post_id ? {
              label: 'View',
              onClick: () => navigate(`/posts/${notification.related_post_id}`)
            } : undefined
          });
        }
      )
      .subscribe();
      
    return () => subscription.unsubscribe();
  }, [user?.id]);
};

// Real-time private messages
const useMessagesRealtime = () => {
  const { user } = useAuthStore();
  const { addMessage, updateConversation } = useMessagingStore();
  
  useEffect(() => {
    if (!user) return;
    
    const subscription = supabase
      .channel(`messages:receiver_id=eq.${user.id}`)
      .on('postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        payload => {
          const message = payload.new as Message;
          addMessage(message);
          updateConversation(message.sender_id);
          
          // Show notification if not in active conversation
          if (!isConversationActive(message.sender_id)) {
            toast.info(`New message from ${message.sender_username}`);
          }
        }
      )
      .subscribe();
      
    return () => subscription.unsubscribe();
  }, [user?.id]);
};
```

## API Service Layer

### **Base Service Class**
```typescript
abstract class BaseService {
  protected supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
  
  protected handleError(error: any): never {
    console.error('API Error:', error);
    
    if (error.code === 'PGRST301') {
      throw new Error('Resource not found');
    }
    if (error.code === '23505') {
      throw new Error('This item already exists');
    }
    if (error.message?.includes('JWT')) {
      throw new Error('Authentication required');
    }
    
    throw new Error(error.message || 'An unexpected error occurred');
  }
  
  protected getCurrentUser() {
    const { data: { user } } = this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    return user;
  }
}
```

### **Posts Service**
```typescript
class PostsService extends BaseService {
  async getPosts(filters?: PostFilters): Promise<Post[]> {
    const query = this.supabase
      .from('posts')
      .select(`
        *,
        categories(*),
        users(id, username, avatar_url),
        therapists(*),
        comments(count),
        post_tags(
          tags(*)
        )
      `)
      .eq('is_published', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
      
    if (filters?.category) {
      query.eq('category_id', filters.category);
    }
    if (filters?.canton) {
      query.eq('canton', filters.canton);
    }
    if (filters?.therapist) {
      query.eq('therapist_id', filters.therapist);
    }
    if (filters?.search) {
      query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }
    
    const { data, error } = await query;
    if (error) this.handleError(error);
    return data || [];
  }

  async getPost(id: string): Promise<Post> {
    const { data, error } = await this.supabase
      .from('posts')
      .select(`
        *,
        categories(*),
        users(id, username, avatar_url),
        therapists(*),
        post_tags(
          tags(*)
        )
      `)
      .eq('id', id)
      .single();
      
    if (error) this.handleError(error);
    return data;
  }

  async createPost(postData: CreatePostData): Promise<Post> {
    const user = this.getCurrentUser();
    
    const { data, error } = await this.supabase
      .from('posts')
      .insert([{
        ...postData,
        user_id: user.id,
        is_published: postData.publish || false
      }])
      .select(`
        *,
        categories(*),
        users(id, username, avatar_url)
      `)
      .single();
      
    if (error) this.handleError(error);
    return data;
  }

  async updatePost(id: string, updates: Partial<Post>): Promise<Post> {
    const user = this.getCurrentUser();
    
    const { data, error } = await this.supabase
      .from('posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns the post
      .select()
      .single();
      
    if (error) this.handleError(error);
    return data;
  }

  async deletePost(id: string): Promise<void> {
    const user = this.getCurrentUser();
    
    const { error } = await this.supabase
      .from('posts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
      
    if (error) this.handleError(error);
  }

  async getDrafts(): Promise<PostDraft[]> {
    const user = this.getCurrentUser();
    
    const { data, error } = await this.supabase
      .from('post_drafts')
      .select(`
        *,
        categories(*),
        therapists(*)
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
      
    if (error) this.handleError(error);
    return data || [];
  }

  async saveDraft(draftData: CreatePostDraftData): Promise<PostDraft> {
    const user = this.getCurrentUser();
    
    const { data, error } = await this.supabase
      .from('post_drafts')
      .upsert([{
        ...draftData,
        user_id: user.id,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
      
    if (error) this.handleError(error);
    return data;
  }
}
```

### **Comments Service**
```typescript
class CommentsService extends BaseService {
  async getComments(postId: string): Promise<Comment[]> {
    const { data, error } = await this.supabase
      .from('comments')
      .select(`
        *,
        users(id, username, avatar_url),
        replies:comments!parent_comment_id(
          *,
          users(id, username, avatar_url)
        )
      `)
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });
      
    if (error) this.handleError(error);
    return data || [];
  }

  async createComment(commentData: CreateCommentData): Promise<Comment> {
    const user = this.getCurrentUser();
    
    const { data, error } = await this.supabase
      .from('comments')
      .insert([{
        ...commentData,
        user_id: user.id
      }])
      .select(`
        *,
        users(id, username, avatar_url)
      `)
      .single();
      
    if (error) this.handleError(error);
    
    // Create notification for post author
    if (commentData.post_id) {
      await this.createCommentNotification(data);
    }
    
    return data;
  }

  async updateComment(id: string, content: string): Promise<Comment> {
    const user = this.getCurrentUser();
    
    const { data, error } = await this.supabase
      .from('comments')
      .update({
        content,
        is_edited: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        users(id, username, avatar_url)
      `)
      .single();
      
    if (error) this.handleError(error);
    return data;
  }

  async deleteComment(id: string): Promise<void> {
    const user = this.getCurrentUser();
    
    const { error } = await this.supabase
      .from('comments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
      
    if (error) this.handleError(error);
  }

  private async createCommentNotification(comment: Comment): Promise<void> {
    // Get post author to notify
    const { data: post } = await this.supabase
      .from('posts')
      .select('user_id, title, users(username)')
      .eq('id', comment.post_id)
      .single();
      
    if (post && post.user_id !== comment.user_id) {
      await this.supabase
        .from('notifications')
        .insert([{
          user_id: post.user_id,
          type: 'post_comment',
          title: 'New Comment',
          message: `${comment.users.username} commented on your post "${post.title}"`,
          related_post_id: comment.post_id,
          related_comment_id: comment.id
        }]);
    }
  }
}
```

### **Therapist Service**
```typescript
class TherapistService extends BaseService {
  async getTherapists(filters?: TherapistFilters): Promise<Therapist[]> {
    const query = this.supabase
      .from('therapists')
      .select(`
        *,
        posts(id, title, created_at, users(username))
      `)
      .order('last_name', { ascending: true });
      
    if (filters?.canton) {
      query.eq('canton', filters.canton);
    }
    if (filters?.designation) {
      query.ilike('designation', `%${filters.designation}%`);
    }
    if (filters?.search) {
      query.or(`
        first_name.ilike.%${filters.search}%,
        last_name.ilike.%${filters.search}%,
        institution.ilike.%${filters.search}%
      `);
    }
    
    const { data, error } = await query;
    if (error) this.handleError(error);
    return data || [];
  }

  async getTherapist(id: string): Promise<Therapist> {
    const { data, error } = await this.supabase
      .from('therapists')
      .select(`
        *,
        posts(
          id, 
          title, 
          content,
          created_at,
          users(username, avatar_url)
        )
      `)
      .eq('id', id)
      .single();
      
    if (error) this.handleError(error);
    return data;
  }

  async createTherapist(therapistData: CreateTherapistData): Promise<Therapist> {
    const { data, error } = await this.supabase
      .from('therapists')
      .insert([therapistData])
      .select()
      .single();
      
    if (error) this.handleError(error);
    return data;
  }

  async updateTherapist(id: string, updates: Partial<Therapist>): Promise<Therapist> {
    const { data, error } = await this.supabase
      .from('therapists')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) this.handleError(error);
    return data;
  }
}
```

## Advanced Features Implementation

### **Citation System**
```typescript
// Text selection and citation management
const useCitationManager = () => {
  const [selectedText, setSelectedText] = useState('');
  const [citationMode, setCitationMode] = useState(false);
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);
  
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString().trim();
      setSelectedText(text);
      setCitationMode(true);
      
      // Store the range for later use
      if (selection.rangeCount > 0) {
        setSelectionRange(selection.getRangeAt(0).cloneRange());
      }
    } else {
      setSelectedText('');
      setCitationMode(false);
      setSelectionRange(null);
    }
  }, []);
  
  const insertCitation = useCallback((editor: Editor) => {
    if (selectedText && editor) {
      // Format citation with blockquote
      const citationText = `> ${selectedText}\n\n`;
      
      // Insert at cursor position
      editor.chain().focus().insertContent(citationText).run();
      
      // Clear selection
      setSelectedText('');
      setCitationMode(false);
      setSelectionRange(null);
    }
  }, [selectedText]);
  
  const clearSelection = useCallback(() => {
    setSelectedText('');
    setCitationMode(false);
    setSelectionRange(null);
  }, []);
  
  return { 
    selectedText, 
    citationMode, 
    handleTextSelection, 
    insertCitation,
    clearSelection
  };
};

// Citation-aware text display component
const SelectableText: React.FC<{ children: React.ReactNode; onTextSelect: () => void }> = ({ 
  children, 
  onTextSelect 
}) => {
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        onTextSelect();
      }
    };
    
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);
    
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, [onTextSelect]);
  
  return <div className="selectable-content">{children}</div>;
};

// Rich text editor with citation support
const RichTextEditor: React.FC<EditorProps> = ({ 
  content, 
  onChange, 
  placeholder = "Write your comment..."
}) => {
  const { selectedText, citationMode, insertCitation, clearSelection } = useCitationManager();
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Blockquote.configure({
        HTMLAttributes: {
          class: 'citation-block border-l-4 border-primary pl-4 italic'
        }
      }),
      Link,
      Bold,
      Italic,
      Underline
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[100px] p-3'
      }
    }
  });
  
  if (!editor) return null;
  
  return (
    <div className="relative border border-gray-300 rounded-lg">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-gray-200' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost" 
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-gray-200' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm" 
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'bg-gray-200' : ''}
        >
          <Quote className="h-4 w-4" />
        </Button>
        
        {/* Citation button - only show when text is selected */}
        {citationMode && (
          <Button
            variant="default"
            size="sm"
            onClick={() => insertCitation(editor)}
            className="ml-2 bg-primary text-white"
          >
            <Quote className="h-4 w-4 mr-1" />
            Quote Selected Text
          </Button>
        )}
      </div>
      
      {/* Editor content */}
      <EditorContent 
        editor={editor} 
        className="min-h-[100px]"
      />
      
      {/* Selected text preview */}
      {selectedText && (
        <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded">
          Text selected: "{selectedText.substring(0, 30)}..."
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="ml-1 h-4 w-4 p-0 text-white hover:text-gray-200"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
```

### **Internationalization Setup**
```typescript
// i18n configuration
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import detector from 'i18next-browser-languagedetector';

// Translation resources
const resources = {
  de: {
    translation: {
      // Navigation
      'nav.forum': 'Forum',
      'nav.therapists': 'Therapeuten',
      'nav.profile': 'Profil',
      'nav.messages': 'Nachrichten',
      'nav.logout': 'Abmelden',
      
      // Posts
      'posts.create': 'Beitrag erstellen',
      'posts.edit': 'Bearbeiten', 
      'posts.delete': 'Löschen',
      'posts.reply': 'Antworten',
      'posts.quote': 'Zitieren',
      
      // Categories
      'category.erfahrung': 'Erfahrung',
      'category.suche': 'Suche TherapeutIn',
      'category.gedanken': 'Gedanken',
      'category.rant': 'Rant',
      'category.ressourcen': 'Ressourcen',
      
      // Form labels
      'form.title': 'Titel',
      'form.content': 'Inhalt',
      'form.category': 'Kategorie', 
      'form.canton': 'Kanton',
      'form.therapist': 'Therapeut/in',
      'form.save': 'Speichern',
      'form.cancel': 'Abbrechen',
      'form.publish': 'Veröffentlichen',
      'form.draft': 'Als Entwurf speichern',
      
      // Messages
      'message.post_created': 'Beitrag erfolgreich erstellt',
      'message.post_updated': 'Beitrag aktualisiert',
      'message.post_deleted': 'Beitrag gelöscht',
      'message.comment_added': 'Kommentar hinzugefügt',
      'message.error': 'Ein Fehler ist aufgetreten',
      
      // User roles
      'role.user': 'Benutzer',
      'role.moderator': 'Moderator',
      'role.admin': 'Administrator'
    }
  },
  fr: {
    translation: {
      // Navigation  
      'nav.forum': 'Forum',
      'nav.therapists': 'Thérapeutes',
      'nav.profile': 'Profil',
      'nav.messages': 'Messages',
      'nav.logout': 'Déconnexion',
      
      // Posts
      'posts.create': 'Créer un message',
      'posts.edit': 'Modifier',
      'posts.delete': 'Supprimer', 
      'posts.reply': 'Répondre',
      'posts.quote': 'Citer',
      
      // Categories
      'category.erfahrung': 'Expérience',
      'category.suche': 'Recherche thérapeute',
      'category.gedanken': 'Pensées',
      'category.rant': 'Rant',
      'category.ressourcen': 'Ressources'
      // ... more French translations
    }
  },
  it: {
    translation: {
      // Italian translations
      'nav.forum': 'Forum',
      'nav.therapists': 'Terapeuti', 
      'nav.profile': 'Profilo',
      'nav.messages': 'Messaggi',
      'nav.logout': 'Logout',
      
      'category.erfahrung': 'Esperienza',
      'category.suche': 'Cerca terapeuta',
      'category.gedanken': 'Pensieri',
      'category.rant': 'Rant',
      'category.ressourcen': 'Risorse'
      // ... more Italian translations
    }
  }
};

// Initialize i18n
i18n
  .use(detector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'de',
    debug: import.meta.env.DEV,
    
    interpolation: {
      escapeValue: false // React already handles escaping
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage']
    }
  });

export default i18n;

// Usage in components
const PostCard: React.FC<{ post: Post }> = ({ post }) => {
  const { t, i18n } = useTranslation();
  
  // Get localized category name
  const categoryName = post.category[`name_${i18n.language}` as keyof Category] || 
                      post.category.name_de;
  
  return (
    <div className="post-card">
      <h3>{post.title}</h3>
      <Badge variant="secondary">{categoryName}</Badge>
      <div className="post-actions">
        <Button onClick={() => handleReply()}>
          {t('posts.reply')}
        </Button>
        <Button onClick={() => handleQuote()}>
          {t('posts.quote')}
        </Button>
      </div>
    </div>
  );
};

// Language switcher component
const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  
  const languages = [
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' }
  ];
  
  return (
    <Select
      value={i18n.language}
      onValueChange={(value) => i18n.changeLanguage(value)}
    >
      {languages.map(lang => (
        <SelectItem key={lang.code} value={lang.code}>
          {lang.flag} {lang.name}
        </SelectItem>
      ))}
    </Select>
  );
};
```

## Migration Strategy

### **Phase 1: Infrastructure & Authentication (2 weeks)**
**Deliverables:**
- Supabase project setup and configuration
- React application scaffolding with TypeScript
- Authentication system (login, register, password reset)
- Basic routing and layout components
- User profile management
- Database schema implementation

**Tasks:**
1. Create Supabase project and configure environment
2. Set up React app with Vite, TypeScript, Tailwind CSS
3. Implement Supabase Auth integration
4. Create basic layout components (Navigation, Sidebar, Footer)
5. Build authentication forms and user profile pages
6. Set up Zustand stores for auth and user management
7. Implement Row Level Security policies

**Success Criteria:**
- Users can register, login, and manage profiles
- Protected routes work correctly
- Database schema is fully migrated
- Basic UI components are functional

### **Phase 2: Core Forum Features (3 weeks)**
**Deliverables:**
- Post listing and filtering functionality
- Post creation and editing with rich text editor
- Category system and post categorization
- Basic comment system
- Real-time post updates

**Tasks:**
1. Implement PostList and PostCard components
2. Build PostEditor with Tiptap rich text editing
3. Create category filtering and search functionality
4. Develop comment system with threading support
5. Set up real-time subscriptions for new posts
6. Implement post CRUD operations
7. Add draft saving functionality

**Success Criteria:**
- Users can create, edit, and delete posts
- Commenting system works with threading
- Real-time updates function correctly
- Post filtering and search work properly

### **Phase 3: Advanced Comment Features (2 weeks)**
**Deliverables:**
- Text selection and citation system
- Inline comment editing and deletion
- Comment reply threading
- Real-time comment updates
- Comment moderation tools

**Tasks:**
1. Implement text selection citation feature
2. Build inline comment editing functionality
3. Add reply-to-comment threading
4. Set up real-time comment subscriptions
5. Create comment moderation interface
6. Add "edited" indicators for modified comments
7. Implement comment deletion with soft deletes

**Success Criteria:**
- Citation system works smoothly
- Inline editing functions without page refresh
- Real-time comment updates are seamless
- Moderation tools are functional

### **Phase 4: User Management & Messaging (2 weeks)**
**Deliverables:**
- Private messaging system
- User blocking functionality
- User profile pages with post/comment history
- Notification system
- Admin user management tools

**Tasks:**
1. Build private messaging interface
2. Implement user blocking system
3. Create comprehensive user profile pages
4. Develop notification system with real-time updates
5. Build admin panel for user management
6. Add user role management (user/moderator/admin)
7. Implement email notifications

**Success Criteria:**
- Private messaging works end-to-end
- User blocking prevents interaction properly
- Notifications work in real-time
- Admin tools function correctly

### **Phase 5: Therapist System (2 weeks)**
**Deliverables:**
- Therapist directory and profiles
- Therapist-post associations
- Therapist search and filtering
- Therapist profile editing
- Integration with existing posts

**Tasks:**
1. Migrate therapist database and create profiles
2. Build therapist directory with search/filter
3. Implement therapist-post associations
4. Create therapist profile management
5. Add therapist editing capabilities
6. Build therapist analytics (posts mentioning them)
7. Implement therapist verification system

**Success Criteria:**
- Therapist directory is fully functional
- Posts can be associated with therapists
- Search and filtering work properly
- Profile editing is available

### **Phase 6: Polish & Deployment (2 weeks)**
**Deliverables:**
- Comprehensive error handling and loading states
- Performance optimizations
- Full test suite
- Production deployment
- Documentation and migration guides

**Tasks:**
1. Add comprehensive error boundaries and handling
2. Implement loading states and skeleton screens
3. Add performance optimizations (lazy loading, caching)
4. Write comprehensive test suite
5. Set up CI/CD pipeline
6. Deploy to production environment
7. Create user migration and training documentation

**Success Criteria:**
- Application handles errors gracefully
- Performance meets targets
- Test coverage > 80%
- Successful production deployment

## Data Migration Process

### **Migration Scripts**
```sql
-- Step 1: Create temporary migration tables
CREATE TABLE temp_user_migration (
  old_id integer,
  new_id uuid,
  username varchar,
  email varchar
);

-- Step 2: Migrate users with password reset requirement
INSERT INTO auth.users (
  id, 
  email,
  email_confirmed_at,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  email,
  now(),
  registration_date,
  now()
FROM legacy_users
WHERE email IS NOT NULL AND email != '';

-- Store mapping for reference
INSERT INTO temp_user_migration (old_id, new_id, username, email)
SELECT 
  lu.id,
  au.id,
  lu.username,
  lu.email
FROM legacy_users lu
JOIN auth.users au ON au.email = lu.email;

-- Step 3: Migrate user profiles
INSERT INTO public.users (
  id, 
  username, 
  email,
  bio, 
  avatar_url,
  role,
  created_at
)
SELECT 
  tm.new_id,
  lu.username,
  lu.email,
  COALESCE(lu.bio, lu.biography),
  CASE 
    WHEN lu.avatar_url IS NOT NULL THEN lu.avatar_url
    WHEN lu.avatar IS NOT NULL THEN 'avatars/' || lu.avatar
    ELSE NULL
  END,
  lu.role::user_role,
  lu.registration_date
FROM legacy_users lu
JOIN temp_user_migration tm ON tm.old_id = lu.id;

-- Step 4: Migrate categories
INSERT INTO public.categories (
  id,
  name_de,
  name_fr, 
  name_it,
  description_de,
  description_fr,
  description_it,
  is_active,
  access_role
)
SELECT 
  id,
  name_de,
  name_fr,
  name_it, 
  description_de,
  description_fr,
  description_it,
  is_active,
  access_role::user_role
FROM legacy_categories;

-- Step 5: Migrate therapists
INSERT INTO public.therapists (
  id,
  form_of_address,
  first_name,
  last_name,
  institution,
  designation,
  description,
  canton,
  created_at
)
SELECT 
  id,
  form_of_address,
  first_name,
  last_name,
  institution,
  designation,
  description,
  canton,
  created_at
FROM legacy_therapists;

-- Step 6: Migrate posts
INSERT INTO public.posts (
  id,
  user_id,
  category_id,
  title,
  content,
  canton,
  therapist_id,
  is_published,
  is_active,
  is_banned,
  created_at,
  updated_at
)
SELECT 
  lp.id,
  tm.new_id,
  lp.category_id,
  COALESCE(lp.title, 'Untitled'),
  lp.content,
  lp.canton,
  CASE 
    WHEN lp.therapist IS NOT NULL AND lp.therapist != '' 
    THEN CAST(lp.therapist AS integer)
    ELSE NULL
  END,
  COALESCE(lp.is_published, true),
  COALESCE(lp.is_active, true),
  COALESCE(lp.is_banned, false),
  lp.created_at,
  COALESCE(lp.updated_at, lp.created_at)
FROM legacy_posts lp
JOIN temp_user_migration tm ON tm.old_id = lp.user_id
WHERE lp.content IS NOT NULL AND lp.content != '';

-- Step 7: Migrate comments
INSERT INTO public.comments (
  id,
  post_id,
  user_id,
  content,
  created_at
)
SELECT 
  lc.id,
  lc.post_id,
  tm.new_id,
  lc.content,
  lc.created_at
FROM legacy_comments lc
JOIN temp_user_migration tm ON tm.old_id = lc.user_id
WHERE lc.content IS NOT NULL 
  AND lc.content != ''
  AND lc.post_id IN (SELECT id FROM public.posts);

-- Step 8: Migrate messages
INSERT INTO public.messages (
  sender_id,
  receiver_id,
  content,
  is_read,
  created_at
)
SELECT 
  tm1.new_id,
  tm2.new_id,
  lm.content,
  COALESCE(lm.is_read, false),
  lm.created_at
FROM legacy_messages lm
JOIN temp_user_migration tm1 ON tm1.old_id = lm.sender_id
JOIN temp_user_migration tm2 ON tm2.old_id = lm.receiver_id
WHERE lm.content IS NOT NULL AND lm.content != '';

-- Step 9: Migrate user blocks
INSERT INTO public.user_blocks (
  blocker_id,
  blocked_id,
  created_at
)
SELECT 
  tm1.new_id,
  tm2.new_id,
  lub.blocked_at
FROM legacy_user_blocks lub
JOIN temp_user_migration tm1 ON tm1.old_id = lub.blocker_id  
JOIN temp_user_migration tm2 ON tm2.old_id = lub.blocked_id;

-- Step 10: Migrate post drafts
INSERT INTO public.post_drafts (
  user_id,
  category_id,
  title,
  content,
  canton,
  therapist_id,
  created_at
)
SELECT 
  tm.new_id,
  lps.category_id,
  lps.title,
  lps.content,
  lps.canton,
  CASE 
    WHEN lps.therapist IS NOT NULL AND lps.therapist != ''
    THEN CAST(lps.therapist AS integer)
    ELSE NULL
  END,
  lps.created_at
FROM legacy_post_saved lps
JOIN temp_user_migration tm ON tm.old_id = lps.user_id;

-- Step 11: Update sequences to prevent ID conflicts
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('therapists_id_seq', (SELECT MAX(id) FROM therapists)); 
SELECT setval('posts_id_seq', (SELECT MAX(id) FROM posts));
SELECT setval('comments_id_seq', (SELECT MAX(id) FROM comments));

-- Step 12: Clean up temporary tables
DROP TABLE temp_user_migration;

-- Step 13: Send password reset emails to all users
-- This will be handled by a separate script that calls Supabase Auth API
```

### **Post-Migration Verification**
```sql
-- Verify migration counts
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Posts', COUNT(*) FROM posts  
UNION ALL
SELECT 'Comments', COUNT(*) FROM comments
UNION ALL  
SELECT 'Therapists', COUNT(*) FROM therapists
UNION ALL
SELECT 'Messages', COUNT(*) FROM messages;

-- Check for orphaned records
SELECT 'Orphaned Posts' as issue, COUNT(*) as count 
FROM posts WHERE user_id NOT IN (SELECT id FROM users)
UNION ALL
SELECT 'Orphaned Comments', COUNT(*)
FROM comments WHERE user_id NOT IN (SELECT id FROM users)
UNION ALL  
SELECT 'Invalid Post Categories', COUNT(*)
FROM posts WHERE category_id NOT IN (SELECT id FROM categories);

-- Verify user authentication setup
SELECT 
  COUNT(CASE WHEN au.id IS NOT NULL THEN 1 END) as auth_users,
  COUNT(CASE WHEN pu.id IS NOT NULL THEN 1 END) as profile_users,
  COUNT(CASE WHEN au.id IS NOT NULL AND pu.id IS NOT NULL THEN 1 END) as matched_users
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.id = pu.id;
```

## Deployment & DevOps

### **Environment Configuration**
```typescript
// Environment variables
interface EnvironmentConfig {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;  
  VITE_APP_URL: string;
  VITE_ENVIRONMENT: 'development' | 'staging' | 'production';
  VITE_ENABLE_ANALYTICS: boolean;
  VITE_SENTRY_DSN?: string;
}

// Runtime configuration
const config: EnvironmentConfig = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_APP_URL: import.meta.env.VITE_APP_URL,
  VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT || 'development',
  VITE_ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN
};

export default config;
```

### **CI/CD Pipeline**
```yaml
# .github/workflows/deploy.yml
name: Deploy Remy React App

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'

jobs:
  test:
    name: Test & Lint
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linter
        run: npm run lint
        
      - name: Run type checking
        run: npm run type-check
        
      - name: Run tests
        run: npm run test -- --coverage
        
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          
  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: dist/
          
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: staging
    
    steps:
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-files
          path: dist/
          
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./
          
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-files
          path: dist/
          
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./
          
  migrate-database:
    name: Run Database Migrations
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        
      - name: Run migrations
        run: |
          supabase db push --db-url ${{ secrets.SUPABASE_DB_URL }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

### **Monitoring & Analytics**
```typescript
// Error monitoring with Sentry
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

if (config.VITE_ENVIRONMENT === 'production' && config.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: config.VITE_SENTRY_DSN,
    integrations: [
      new BrowserTracing(),
    ],
    tracesSampleRate: 1.0,
    environment: config.VITE_ENVIRONMENT
  });
}

// Performance monitoring
const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Track page load times
    if ('performance' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            console.log('Page load time:', navEntry.loadEventEnd - navEntry.fetchStart);
          }
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
      
      return () => observer.disconnect();
    }
  }, []);
};

// Analytics tracking
const useAnalytics = () => {
  const trackEvent = useCallback((event: string, properties?: Record<string, any>) => {
    if (config.VITE_ENABLE_ANALYTICS) {
      // Replace with your analytics provider
      console.log('Analytics event:', event, properties);
    }
  }, []);
  
  return { trackEvent };
};
```

## Success Metrics & KPIs

### **Technical Metrics**
- **Performance**: Page load times < 2s, Lighthouse score > 90
- **Reliability**: 99.9% uptime, error rate < 0.1%
- **Security**: Zero security vulnerabilities in dependencies
- **Test Coverage**: > 80% code coverage
- **Bundle Size**: Initial load < 500KB gzipped

### **User Experience Metrics**
- **Real-time Updates**: < 100ms latency for live updates
- **Mobile Responsiveness**: Works perfectly on all device sizes
- **Accessibility**: WCAG 2.1 AA compliance
- **Browser Support**: Works on all modern browsers
- **Offline Support**: Basic functionality available offline

### **Migration Success Criteria**
- **Data Integrity**: 100% of data migrated successfully
- **User Adoption**: > 90% of users successfully log in after migration
- **Feature Parity**: All existing PHP features working in React
- **Performance Improvement**: > 50% faster page loads
- **Maintenance Reduction**: > 70% reduction in maintenance overhead

This comprehensive plan provides a roadmap for successfully migrating the existing PHP-based Remy forum to a modern React application with Supabase, maintaining all current functionality while adding real-time capabilities and improving the overall user experience.