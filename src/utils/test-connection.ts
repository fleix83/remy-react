import { supabase } from '../lib/supabase'

export async function testSupabaseConnection() {
  try {
    console.log('🔍 Testing Supabase connection...')
    
    // Test 1: Check if we can connect
    const { error: healthError } = await supabase
      .from('categories')
      .select('count')
      .limit(1)
    
    if (healthError) {
      console.error('❌ Health check failed:', healthError)
      return false
    }
    
    console.log('✅ Health check passed')
    
    // Test 2: Check categories table
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .limit(5)
    
    if (categoriesError) {
      console.error('❌ Categories query failed:', categoriesError)
    } else {
      console.log('✅ Categories found:', categories?.length || 0)
      console.log('📊 Sample categories:', categories)
    }
    
    // Test 3: Check users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5)
    
    if (usersError) {
      console.error('❌ Users query failed:', usersError)
    } else {
      console.log('✅ Users found:', users?.length || 0)
    }
    
    // Test 4: Check posts table
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .limit(5)
    
    if (postsError) {
      console.error('❌ Posts query failed:', postsError)
    } else {
      console.log('✅ Posts found:', posts?.length || 0)
    }
    
    // Test 5: Check current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ Auth check failed:', authError)
    } else if (user) {
      console.log('✅ Authenticated user:', user.email)
    } else {
      console.log('ℹ️ No authenticated user')
    }
    
    return true
    
  } catch (error) {
    console.error('💥 Connection test failed:', error)
    return false
  }
}

export async function seedTestData() {
  try {
    console.log('🌱 Seeding test data...')
    
    // First check if we have an authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('⚠️ No authenticated user - cannot seed posts')
      return
    }
    
    // Check if we already have posts
    const { data: existingPosts } = await supabase
      .from('posts')
      .select('id')
      .limit(1)
    
    if (existingPosts && existingPosts.length > 0) {
      console.log('ℹ️ Posts already exist - skipping seed')
      return
    }
    
    // Create a test post
    const { data: newPost, error: postError } = await supabase
      .from('posts')
      .insert([{
        title: 'Willkommen im Remy Forum!',
        content: '<p>Dies ist ein Testbeitrag um die Funktionalität zu prüfen.</p><p>Du kannst jetzt:</p><ul><li>Neue Beiträge erstellen</li><li>Kommentare schreiben</li><li>Mit anderen Nutzern interagieren</li></ul>',
        category_id: 1,
        canton: 'ZH',
        designation: 'Psychologe',
        is_published: true,
        user_id: user.id
      }])
      .select()
    
    if (postError) {
      console.error('❌ Failed to create test post:', postError)
    } else {
      console.log('✅ Test post created:', newPost)
    }
    
  } catch (error) {
    console.error('💥 Seeding failed:', error)
  }
}