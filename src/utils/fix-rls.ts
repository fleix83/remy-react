import { supabase } from '../lib/supabase'

export async function investigateRLS() {
  try {
    console.log('🔍 Investigating RLS policies and user setup...')
    
    // Get current auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ No authenticated user:', authError)
      return
    }
    
    console.log('👤 Current auth user:', {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    })
    
    // Check if user exists in users table
    console.log('\n🔍 Checking users table...')
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (userError) {
      console.log('❌ User not found in users table:', userError)
      
      // Try to find user by email
      const { data: userByEmail, error: emailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single()
      
      if (emailError) {
        console.log('❌ User not found by email either:', emailError)
      } else {
        console.log('✅ Found user by email:', userByEmail)
        console.log('⚠️ ID mismatch: Auth ID vs DB ID:', user.id, 'vs', userByEmail.id)
      }
    } else {
      console.log('✅ User found in users table:', userRecord)
    }
    
    // Check existing posts and their user_ids
    console.log('\n📝 Checking existing posts user IDs...')
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, user_id, title')
      .limit(5)
    
    if (postsError) {
      console.error('❌ Error fetching posts:', postsError)
    } else {
      console.log('✅ Sample posts:', posts)
      const uniqueUserIds = [...new Set(posts.map(p => p.user_id))]
      console.log('🔑 Unique user IDs in posts:', uniqueUserIds)
    }
    
    // Test different user ID approaches
    console.log('\n🧪 Testing RLS with different user ID approaches...')
    
    // Approach 1: Current auth user ID
    console.log('Testing with auth user ID:', user.id)
    const testData1 = {
      title: 'RLS Test 1',
      content: '<p>Testing with auth user ID</p>',
      category_id: 1,
      canton: 'ZH',
      designation: 'Test',
      user_id: user.id,
      is_published: false // Use draft to avoid showing in UI
    }
    
    const { data: result1, error: error1 } = await supabase
      .from('posts')
      .insert([testData1])
      .select()
    
    if (error1) {
      console.log('❌ Auth user ID failed:', error1.message)
    } else {
      console.log('✅ Auth user ID succeeded:', result1)
    }
    
    // Approach 2: Try with an existing user ID from posts
    if (posts && posts.length > 0) {
      const existingUserId = posts[0].user_id
      console.log('Testing with existing user ID:', existingUserId)
      
      const testData2 = {
        title: 'RLS Test 2',
        content: '<p>Testing with existing user ID</p>',
        category_id: 1,
        canton: 'ZH',
        designation: 'Test',
        user_id: existingUserId,
        is_published: false
      }
      
      const { data: result2, error: error2 } = await supabase
        .from('posts')
        .insert([testData2])
        .select()
      
      if (error2) {
        console.log('❌ Existing user ID failed:', error2.message)
      } else {
        console.log('✅ Existing user ID succeeded:', result2)
      }
    }
    
  } catch (error) {
    console.error('💥 Investigation failed:', error)
  }
}

export async function createUserRecord() {
  try {
    console.log('👥 Creating user record in users table...')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ No authenticated user')
      return
    }
    
    // Try to create user record
    const userData = {
      id: user.id,
      username: user.email?.split('@')[0] || 'user',
      email: user.email,
      role: 'user',
      is_banned: false,
      default_canton: 'ZH',
      language_preference: 'de',
      messages_active: true
    }
    
    console.log('📤 Creating user record:', userData)
    
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
    
    if (error) {
      console.error('❌ Failed to create user record:', error)
    } else {
      console.log('✅ User record created:', data)
    }
    
  } catch (error) {
    console.error('💥 Failed to create user record:', error)
  }
}