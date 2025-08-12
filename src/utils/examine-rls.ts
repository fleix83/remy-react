import { supabase } from '../lib/supabase'

export async function examineRLSPolicies() {
  try {
    console.log('🔍 Examining RLS policies for posts and comments tables...')
    
    // Query the pg_policies system table to see current RLS policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .in('tablename', ['posts', 'comments'])
    
    if (policiesError) {
      console.log('❌ Cannot access pg_policies (expected with RLS):', policiesError.message)
      
      // Alternative: Try to query policies using RPC function
      const { data: rpcPolicies, error: rpcError } = await supabase
        .rpc('get_table_policies', { table_names: ['posts', 'comments'] })
      
      if (rpcError) {
        console.log('❌ No RPC function available:', rpcError.message)
      } else {
        console.log('✅ RLS policies (via RPC):', rpcPolicies)
      }
    } else {
      console.log('✅ RLS policies:', policies)
    }

    // Check if RLS is enabled on tables
    console.log('\n🛡️ Checking if RLS is enabled...')
    
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_class')
      .select('relname, relrowsecurity')
      .in('relname', ['posts', 'comments'])
    
    if (rlsError) {
      console.log('❌ Cannot check RLS status:', rlsError.message)
    } else {
      console.log('📊 RLS status:', rlsStatus)
    }

    // Test current user permissions
    console.log('\n👤 Testing current user permissions...')
    
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      console.log('🔑 Current user ID:', user.id)
      console.log('📧 Current user email:', user.email)
      
      // Check what the user can do
      const permissions = {
        canSelectPosts: false,
        canInsertPosts: false,
        canUpdatePosts: false,
        canSelectComments: false,
        canInsertComments: false
      }
      
      // Test SELECT on posts
      const { error: selectError } = await supabase
        .from('posts')
        .select('id')
        .limit(1)
      
      permissions.canSelectPosts = !selectError
      
      // Test INSERT on posts (we already know this fails, but let's confirm)
      const { error: insertError } = await supabase
        .from('posts')
        .insert([{
          title: 'RLS Test',
          content: 'Test',
          category_id: 1,
          canton: 'ZH',
          designation: 'Test',
          user_id: user.id,
          is_published: false
        }])
      
      permissions.canInsertPosts = !insertError
      
      // Test SELECT on comments
      const { error: commentsSelectError } = await supabase
        .from('comments')
        .select('id')
        .limit(1)
      
      permissions.canSelectComments = !commentsSelectError
      
      // Test INSERT on comments
      const { error: commentsInsertError } = await supabase
        .from('comments')
        .insert([{
          content: 'Test comment',
          post_id: 1,
          user_id: user.id
        }])
      
      permissions.canInsertComments = !commentsInsertError
      
      console.log('🔐 Current permissions:', permissions)
    }

    return {
      message: 'RLS examination complete. Check console for details.',
      recommendation: 'Need to create proper RLS policies for authenticated users'
    }
    
  } catch (error) {
    console.error('💥 Failed to examine RLS policies:', error)
    throw error
  }
}

export async function generateRLSPolicySQL() {
  console.log('📝 Generating SQL to fix existing RLS policies...')
  
  const sqlStatements = `
-- First, drop existing policies to recreate them correctly
DROP POLICY IF EXISTS "Users can read published posts" ON posts;
DROP POLICY IF EXISTS "Users can insert own posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can read comments" ON comments;
DROP POLICY IF EXISTS "Users can insert own comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;

-- Also check for other common policy names
DROP POLICY IF EXISTS "posts_select_policy" ON posts;
DROP POLICY IF EXISTS "posts_insert_policy" ON posts;
DROP POLICY IF EXISTS "posts_update_policy" ON posts;
DROP POLICY IF EXISTS "Enable read access for all users" ON posts;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON posts;

-- Posts table policies
CREATE POLICY "Users can read published posts" ON posts
    FOR SELECT USING (
        is_published = true AND 
        is_active = true AND 
        is_banned = false
    );

CREATE POLICY "Users can insert own posts" ON posts
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "Users can update own posts" ON posts
    FOR UPDATE USING (
        auth.uid() = user_id
    ) WITH CHECK (
        auth.uid() = user_id
    );

-- Comments table policies  
CREATE POLICY "Users can read comments" ON comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.id = comments.post_id 
            AND posts.is_published = true 
            AND posts.is_active = true 
            AND posts.is_banned = false
        )
    );

CREATE POLICY "Users can insert own comments" ON comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.id = comments.post_id 
            AND posts.is_published = true 
            AND posts.is_active = true 
            AND posts.is_banned = false
        )
    );

CREATE POLICY "Users can update own comments" ON comments
    FOR UPDATE USING (
        auth.uid() = user_id
    ) WITH CHECK (
        auth.uid() = user_id
    );
  `
  
  console.log('📋 Recommended RLS policies:')
  console.log(sqlStatements)
  
  return sqlStatements
}