import { supabase } from '../lib/supabase'

export async function emergencyPolicyFix() {
  console.log('🚨 Emergency Policy Fix - Temporarily making posts table more permissive...')
  
  const emergencySQL = `
-- Temporarily make the policy more permissive to get posts working
DROP POLICY IF EXISTS "Users can create posts" ON posts;

-- Create a very permissive policy that allows any authenticated user to insert
CREATE POLICY "Users can create posts" ON posts
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- If that doesn't work, we might need to temporarily disable RLS
-- ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
  `
  
  console.log('📋 Emergency SQL (use this in Supabase SQL Editor):')
  console.log(emergencySQL)
  
  console.log('\n⚠️ WARNING: This makes the policy more permissive than ideal.')
  console.log('After testing, we should fix it to be more restrictive.')
  
  return emergencySQL
}

export async function testRLSBypass() {
  try {
    console.log('🧪 Testing if we can bypass RLS temporarily...')
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ No authenticated user')
      return
    }
    
    // Try inserting without user_id to see if that's the issue
    const testData1 = {
      title: 'RLS Bypass Test 1',
      content: '<p>Testing without user_id</p>',
      category_id: 1,
      canton: 'ZH',
      designation: 'Test',
      // user_id: user.id, // Intentionally omitted
      is_published: false
    }
    
    console.log('🔧 Testing insert without user_id...')
    const { data: result1, error: error1 } = await supabase
      .from('posts')
      .insert([testData1])
      .select()
    
    if (error1) {
      console.log('❌ Insert without user_id failed:', error1.message)
    } else {
      console.log('✅ Insert without user_id succeeded:', result1)
      // Clean up
      if (result1 && result1[0]) {
        await supabase.from('posts').delete().eq('id', result1[0].id)
      }
    }
    
    // Try inserting with null user_id
    const testData2 = {
      title: 'RLS Bypass Test 2',
      content: '<p>Testing with null user_id</p>',
      category_id: 1,
      canton: 'ZH',
      designation: 'Test',
      user_id: null,
      is_published: false
    }
    
    console.log('🔧 Testing insert with null user_id...')
    const { data: result2, error: error2 } = await supabase
      .from('posts')
      .insert([testData2])
      .select()
    
    if (error2) {
      console.log('❌ Insert with null user_id failed:', error2.message)
    } else {
      console.log('✅ Insert with null user_id succeeded:', result2)
      // Clean up
      if (result2 && result2[0]) {
        await supabase.from('posts').delete().eq('id', result2[0].id)
      }
    }
    
    // Try with service role (if available)
    console.log('🔧 Testing with different approaches...')
    
    // Check if the table has any triggers or other constraints
    console.log('📊 Checking table structure...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('posts')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.log('❌ Cannot read from posts table:', tableError.message)
    } else {
      console.log('✅ Can read from posts table')
      if (tableInfo && tableInfo[0]) {
        console.log('📋 Table columns:', Object.keys(tableInfo[0]))
      }
    }
    
  } catch (error) {
    console.error('💥 RLS bypass test failed:', error)
  }
}