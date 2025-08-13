import { supabase } from '../lib/supabase'

export async function debugDatabaseSchema() {
  try {
    console.log('🔍 Debugging Database Schema...')
    
    // Check current user
    const { data: { user } } = await supabase.auth.getUser()
    console.log('👤 Current user:', user)
    
    if (!user) {
      console.error('❌ No authenticated user')
      return
    }

    // 1. Examine actual posts table structure
    console.log('\n📝 POSTS TABLE ANALYSIS:')
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .limit(2)
    
    if (postsError) {
      console.error('❌ Posts query error:', postsError)
    } else {
      console.log('✅ Sample posts:', posts)
      if (posts && posts.length > 0) {
        console.log('📊 Post structure:', Object.keys(posts[0]))
        console.log('🔑 User ID type in posts:', typeof posts[0].user_id, posts[0].user_id)
      }
    }

    // 2. Examine actual users table structure
    console.log('\n👥 USERS TABLE ANALYSIS:')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(2)
    
    if (usersError) {
      console.error('❌ Users query error:', usersError)
    } else {
      console.log('✅ Sample users:', users)
      if (users && users.length > 0) {
        console.log('📊 User structure:', Object.keys(users[0]))
        console.log('🔑 User ID type:', typeof users[0].id, users[0].id)
      }
    }

    // 3. Check comments table
    console.log('\n💬 COMMENTS TABLE ANALYSIS:')
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .limit(2)
    
    if (commentsError) {
      console.error('❌ Comments query error:', commentsError)
    } else {
      console.log('✅ Sample comments:', comments)
      if (comments && comments.length > 0) {
        console.log('📊 Comment structure:', Object.keys(comments[0]))
        console.log('🔍 First comment details:', comments[0])
      } else {
        console.log('ℹ️ No comments found, let\'s check the table structure differently')
        
        // Try to insert a test comment to see what fields are required/available
        const testComment = {
          post_id: 1,
          content: 'Test comment',
          user_id: user.id
        }
        
        console.log('🧪 Testing comment insert to see available fields...')
        const { data: testResult, error: testError } = await supabase
          .from('comments')
          .insert([testComment])
          .select()
        
        if (testError) {
          console.log('❌ Test comment failed:', testError.message)
          console.log('🔍 Error details:', testError)
        } else {
          console.log('✅ Test comment succeeded:', testResult)
          if (testResult && testResult[0]) {
            console.log('📊 Actual comment structure:', Object.keys(testResult[0]))
            // Clean up
            await supabase.from('comments').delete().eq('id', testResult[0].id)
            console.log('🧹 Cleaned up test comment')
          }
        }
      }
    }

    // 4. Check categories table
    console.log('\n📂 CATEGORIES TABLE ANALYSIS:')
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
    
    if (categoriesError) {
      console.error('❌ Categories query error:', categoriesError)
    } else {
      console.log('✅ Categories:', categories)
    }

    // 5. Test post creation with current user
    console.log('\n🧪 TESTING POST CREATION:')
    const testPostData = {
      title: 'Test Post Debug',
      content: '<p>This is a test post to debug creation issues</p>',
      category_id: 1,
      canton: 'ZH',
      designation: 'Psychologe',
      is_published: true,
      user_id: user.id // Using UUID from auth
    }
    
    console.log('📤 Attempting to create post with data:', testPostData)
    
    const { data: newPost, error: createError } = await supabase
      .from('posts')
      .insert([testPostData])
      .select()
    
    if (createError) {
      console.error('❌ Post creation failed:', createError)
      
      // Try with different user_id types
      console.log('\n🔄 Trying with integer user_id...')
      const testWithIntId = {
        ...testPostData,
        user_id: 1 // Try with integer
      }
      
      const { data: newPost2, error: createError2 } = await supabase
        .from('posts')
        .insert([testWithIntId])
        .select()
      
      if (createError2) {
        console.error('❌ Post creation with int ID also failed:', createError2)
      } else {
        console.log('✅ Post creation with int ID succeeded:', newPost2)
      }
    } else {
      console.log('✅ Post creation succeeded:', newPost)
    }

    // 6. Check RLS policies
    console.log('\n🛡️ CHECKING TABLE PERMISSIONS:')
    
    // Try a simple insert/select to see what permissions we have
    const { error: selectError } = await supabase
      .from('posts')
      .select('id, title')
      .limit(1)
    
    console.log('👀 Select permission:', selectError ? 'DENIED' : 'ALLOWED')
    
  } catch (error) {
    console.error('💥 Debug failed:', error)
  }
}

export async function debugCommentCreation(postId: number) {
  try {
    console.log('\n💬 TESTING COMMENT CREATION for post', postId)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ No authenticated user for comment test')
      return
    }

    const testCommentData = {
      content: '<p>Test comment for debugging</p>',
      post_id: postId,
      user_id: user.id, // UUID from auth
      parent_id: null
    }
    
    console.log('📤 Attempting to create comment with data:', testCommentData)
    
    const { data: newComment, error: commentError } = await supabase
      .from('comments')
      .insert([testCommentData])
      .select()
    
    if (commentError) {
      console.error('❌ Comment creation failed:', commentError)
      
      // Try with integer user_id
      const testWithIntId = {
        ...testCommentData,
        user_id: 1
      }
      
      const { data: newComment2, error: commentError2 } = await supabase
        .from('comments')
        .insert([testWithIntId])
        .select()
      
      if (commentError2) {
        console.error('❌ Comment creation with int ID also failed:', commentError2)
      } else {
        console.log('✅ Comment creation with int ID succeeded:', newComment2)
      }
    } else {
      console.log('✅ Comment creation succeeded:', newComment)
    }
    
  } catch (error) {
    console.error('💥 Comment debug failed:', error)
  }
}