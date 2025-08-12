import React, { useState, useEffect } from 'react'
import { useForumStore } from '../../stores/forum.store'
import { testSupabaseConnection, seedTestData } from '../../utils/test-connection'
import { debugDatabaseSchema } from '../../utils/debug-schema'
import { debugUIState } from '../../utils/ui-debug'
import { investigateRLS, createUserRecord } from '../../utils/fix-rls'
import { examineRLSPolicies, generateRLSPolicySQL } from '../../utils/examine-rls'
import { testAuthUID, suggestPolicyFix } from '../../utils/test-auth-uid'
import { emergencyPolicyFix, testRLSBypass } from '../../utils/emergency-fix'
import PostCard from './PostCard'
import PostEditor from './PostEditor'

const ForumView: React.FC = () => {
  const [showEditor, setShowEditor] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const {
    posts,
    categories,
    loading,
    filters,
    loadPosts,
    createPost,
    setFilters,
    searchPosts,
    loadCategories
  } = useForumStore()

  useEffect(() => {
    loadPosts()
    loadCategories() // Ensure categories are loaded
  }, [])

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadPosts()
      return
    }

    try {
      await searchPosts(searchTerm.trim())
    } catch (error) {
      console.error('Error searching posts:', error)
    }
  }

  const handleCreatePost = async (postData: any) => {
    try {
      console.log('🚀 ForumView: Attempting to create post with data:', postData)
      await createPost(postData)
      console.log('✅ ForumView: Post created successfully')
      setShowEditor(false)
      // Reload posts to show the new one
      await loadPosts()
    } catch (error) {
      console.error('❌ ForumView: Error creating post:', error)
      alert('Fehler beim Erstellen des Beitrags: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'))
      throw error
    }
  }

  const handleCategoryFilter = (categoryId: number | null) => {
    setFilters({ category: categoryId || undefined })
    loadPosts({ category: categoryId || undefined })
  }

  const getCategoryColor = (categoryId: number) => {
    const colors = {
      1: 'bg-blue-100 text-blue-800 border-blue-200', // Erfahrung
      2: 'bg-green-100 text-green-800 border-green-200', // Suche TherapeutIn
      3: 'bg-purple-100 text-purple-800 border-purple-200', // Gedanken
      4: 'bg-red-100 text-red-800 border-red-200', // Rant
      5: 'bg-yellow-100 text-yellow-800 border-yellow-200', // Ressourcen
    }
    return colors[categoryId as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-headline font-bold text-gray-900">Forum</h1>
            <p className="text-gray-600 mt-1">
              Teile deine Erfahrungen und finde Unterstützung in der Community
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditor(!showEditor)}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg"
              style={{ 
                backgroundColor: '#0284c7', 
                color: 'white', 
                padding: '12px 24px', 
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              {showEditor ? '❌ Schließen' : '✏️ Neuen Beitrag erstellen'}
            </button>
            <button
              onClick={testSupabaseConnection}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md font-medium transition-colors"
              title="Test Database Connection"
            >
              🔍 Test DB
            </button>
            <button
              onClick={seedTestData}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md font-medium transition-colors"
              title="Add Test Data"
            >
              🌱 Seed
            </button>
            <button
              onClick={debugDatabaseSchema}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md font-medium transition-colors"
              title="Debug Schema"
            >
              🔧 Debug
            </button>
            <button
              onClick={debugUIState}
              className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-md font-medium transition-colors"
              title="Debug UI State"
            >
              🎨 UI Debug
            </button>
            <button
              onClick={investigateRLS}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md font-medium transition-colors"
              title="Investigate RLS"
            >
              🛡️ RLS Debug
            </button>
            <button
              onClick={createUserRecord}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md font-medium transition-colors"
              title="Create User Record"
            >
              👥 Create User
            </button>
            <button
              onClick={examineRLSPolicies}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md font-medium transition-colors"
              title="Examine RLS Policies"
            >
              🔍 Examine RLS
            </button>
            <button
              onClick={generateRLSPolicySQL}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md font-medium transition-colors"
              title="Generate RLS Policy SQL"
            >
              📝 Generate SQL
            </button>
            <button
              onClick={testAuthUID}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-md font-medium transition-colors"
              title="Test Auth UID"
            >
              🔑 Test Auth
            </button>
            <button
              onClick={suggestPolicyFix}
              className="bg-pink-600 hover:bg-pink-700 text-white px-3 py-2 rounded-md font-medium transition-colors"
              title="Suggest Policy Fix"
            >
              💡 Fix Policy
            </button>
            <button
              onClick={emergencyPolicyFix}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md font-medium transition-colors"
              title="Emergency Policy Fix"
            >
              🚨 Emergency Fix
            </button>
            <button
              onClick={testRLSBypass}
              className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-md font-medium transition-colors"
              title="Test RLS Bypass"
            >
              🧪 Test Bypass
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center space-x-2 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Suche in Beiträgen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <button
            onClick={handleSearch}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md transition-colors"
          >
            Suchen
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          <button
            onClick={() => handleCategoryFilter(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !filters.category
                ? 'bg-primary-100 text-primary-800 border border-primary-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            Alle Kategorien
          </button>
          
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryFilter(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                filters.category === category.id
                  ? getCategoryColor(category.id)
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
              }`}
            >
              {category.name_de}
            </button>
          ))}
        </div>
      </div>

      {/* Post Editor */}
      {showEditor && (
        <div className="mb-8">
          <PostEditor 
            onSubmit={handleCreatePost}
            onCancel={() => setShowEditor(false)}
          />
        </div>
      )}

      {/* Posts List */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Keine Beiträge gefunden</h3>
            <p className="text-gray-500 mt-1">
              {filters.category
                ? 'In dieser Kategorie wurden noch keine Beiträge erstellt.'
                : 'Es wurden noch keine Beiträge erstellt.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
              />
            ))}
          </div>
        )}

        {/* Load More Button (placeholder for pagination) */}
        {posts.length > 0 && (
          <div className="text-center mt-8">
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-md font-medium transition-colors">
              Weitere Beiträge laden
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ForumView