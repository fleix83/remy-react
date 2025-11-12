import { supabase } from '../lib/supabase'

export async function testAuthUID() {
  try {
    console.log('🔍 Testing auth.uid() vs user_id...')
    
    // Get current user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ No authenticated user:', authError)
      return
    }
    
    console.log('👤 Client-side user ID:', user.id)
    console.log('📧 Client-side email:', user.email)
    
    // Test what auth.uid() returns in the database
    const { data: dbAuthUID, error: uidError } = await supabase
      .rpc('get_current_user_id')
    
    if (uidError) {
      console.log('⚠️ No get_current_user_id function, trying direct query...')
      
      // Try a direct query that uses auth.uid()
      const { data: authTest, error: authTestError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()
      
      if (authTestError) {
        console.log('❌ Cannot query users table:', authTestError.message)
      } else {
        console.log('✅ User exists in users table:', authTest)
      }
    } else {
      console.log('🔑 Database auth.uid():', dbAuthUID)
    }
    
    // Test the exact policy condition by trying a simple query
    console.log('\n🧪 Testing policy condition...')
    
    // This should work if the policy allows it
    const testData = {
      title: 'Auth UID Test',
      content: '<p>Testing auth.uid() policy</p>',
      category_id: 1,
      canton: 'ZH',
      designation: 'Test',
      user_id: user.id,  // This should match auth.uid()
      is_published: false
    }
    
    console.log('📤 Attempting insert with user_id:', user.id)
    
    const { data: result, error: insertError } = await supabase
      .from('posts')
      .insert([testData])
      .select()
    
    if (insertError) {
      console.log('❌ Insert still fails:', insertError.message)
      console.log('🔍 Error code:', insertError.code)
      console.log('🔍 Error details:', insertError.details)
      
      // Let's try to see what auth.uid() actually returns by using a different approach
      console.log('\n🔧 Trying alternative approach...')
      
      // Try querying with a WHERE clause that uses auth.uid()
      const { data: authQuery, error: authQueryError } = await supabase
        .from('posts')
        .select('id, user_id')
        .eq('user_id', user.id)
        .limit(1)
      
      if (authQueryError) {
        console.log('❌ Cannot query posts with user_id filter:', authQueryError.message)
      } else {
        console.log('✅ Found posts with matching user_id:', authQuery)
      }
      
    } else {
      console.log('✅ Insert succeeded!', result)
      
      // Clean up
      if (result && result[0]) {
        await supabase.from('posts').delete().eq('id', result[0].id)
        console.log('🧹 Cleaned up test post')
      }
    }
    
  } catch (error) {
    console.error('💥 Auth UID test failed:', error)
  }
}

export async function suggestPolicyFix() {
  console.log('💡 Suggesting policy fix...')
  
  const fixSQL = `
-- The current policy might be too strict. Let's try a more permissive version.
-- First, drop the existing policy:
DROP POLICY IF EXISTS "Users can create posts" ON posts;

-- Create a new policy that's more explicit:
CREATE POLICY "Users can create posts" ON posts
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid()::text = user_id::text
);

-- Alternative: If the above doesn't work, try this more permissive version:
-- CREATE POLICY "Users can create posts" ON posts
-- FOR INSERT WITH CHECK (
--   auth.uid() IS NOT NULL
-- );
  `
  
  console.log('📋 SQL to fix the policy:')
  console.log(fixSQL)
  
  return fixSQL
}