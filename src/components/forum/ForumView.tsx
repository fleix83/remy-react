import React, { useState, useEffect } from 'react'
import { useForumStore } from '../../stores/forum.store'
import PostCard from './PostCard'
import PostEditor from './PostEditor'

interface ForumViewProps {
  showCreatePostDialog?: boolean
  onCreatePostDialogClose?: () => void
}

const ForumView: React.FC<ForumViewProps> = ({ 
  showCreatePostDialog = false, 
  onCreatePostDialogClose = () => {} 
}) => {
  // Remove local showEditor state, use props instead
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
      onCreatePostDialogClose() // Close dialog using prop
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


  return (
    <div className="min-h-screen bg-[#1a3442]">
      <div className="max-w-6xl mx-auto py-6 px-0 md:px-4">
        {/* Clean Header */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-headline font-bold text-white">Forum</h1>
            <p className="text-gray-300 mt-2 max-w-2xl mx-auto">
              Teile deine Erfahrungen und finde Unterstützung in der Community. 
              Behandle andere respektvoll und teile keine persönlichen Daten.
            </p>
          </div>

        {/* Search Bar */}
        <div className="flex items-center space-x-2 mb-6 px-4 md:px-0">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Suche in Beiträgen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 bg-[#203f4a] border border-[#2a4a57] rounded-md text-white placeholder-gray-400 focus:ring-[#5a9f51] focus:border-[#5a9f51]"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <button
            onClick={handleSearch}
            className="bg-[#5a9f51] hover:bg-[#4a8542] text-white px-4 py-2 rounded-md transition-colors"
          >
            Suchen
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 px-4 md:px-0">
          <button
            onClick={() => handleCategoryFilter(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !filters.category
                ? 'bg-[#5a9f51] text-white'
                : 'bg-[#203f4a] text-gray-300 hover:bg-[#2a4a57]'
            }`}
          >
            Alle Kategorien
          </button>
          
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryFilter(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filters.category === category.id
                  ? 'bg-[#5a9f51] text-white'
                  : 'bg-[#203f4a] text-gray-300 hover:bg-[#2a4a57]'
              }`}
            >
              {category.name_de}
            </button>
          ))}
        </div>
        </div>

      {/* Post Editor Dialog */}
      {showCreatePostDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-headline font-bold text-gray-900">
                  Neuen Beitrag erstellen
                </h2>
                <button
                  onClick={onCreatePostDialogClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <PostEditor 
                onSubmit={handleCreatePost}
                onCancel={onCreatePostDialogClose}
              />
            </div>
          </div>
        </div>
      )}

        {/* Posts List */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5a9f51]"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white">Keine Beiträge gefunden</h3>
              <p className="text-gray-300 mt-1">
                {filters.category
                  ? 'In dieser Kategorie wurden noch keine Beiträge erstellt.'
                  : 'Es wurden noch keine Beiträge erstellt.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 px-4 md:px-0">
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
              <button className="bg-[#203f4a] hover:bg-[#2a4a57] text-white px-6 py-3 rounded-md font-medium transition-colors">
                Weitere Beiträge laden
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForumView