import React, { useState, useEffect } from 'react'
import { useForumStore } from '../../stores/forum.store'
import PostCard from './PostCard'
import PostEditor from './PostEditor'

interface ForumViewProps {
  showCreatePostDialog?: boolean
  onCreatePostDialogClose?: () => void
  onCreatePost?: () => void
}

const ForumView: React.FC<ForumViewProps> = ({ 
  showCreatePostDialog = false, 
  onCreatePostDialogClose = () => {},
  onCreatePost = () => {}
}) => {
  // Remove local showEditor state, use props instead
  const [searchTerm, setSearchTerm] = useState('')
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchTimeout])

  const handleSearch = async (term: string) => {
    if (!term.trim()) {
      loadPosts()
      return
    }

    try {
      await searchPosts(term.trim())
    } catch (error) {
      console.error('Error searching posts:', error)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    
    // Set new timeout for debounced search
    const newTimeout = setTimeout(() => {
      handleSearch(value)
    }, 300)
    
    setSearchTimeout(newTimeout)
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
        {/* New Navbar */}
        <div className="bg-[#203f4a] p-4 mb-4 mx-4 md:mx-0" style={{borderRadius: '20px'}}>
          <div className="flex items-center gap-4">
            {/* Neu Button */}
            <button
              onClick={onCreatePost}
              className="bg-[#37a653] hover:bg-[#2e8844] text-white px-4 py-2 font-medium transition-colors text-sm flex items-center gap-2"
              style={{borderRadius: '20px'}}
            >
              <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Neu
            </button>
            
            {/* Filter Button */}
            <button
              onClick={() => console.log('Filter clicked')}
              className="bg-[#1a3442] hover:bg-[#0f2329] text-white px-4 py-2 font-medium transition-colors text-sm"
              style={{borderRadius: '20px'}}
            >
              Filter
            </button>
            
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Suche..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-4 pr-10 py-2 bg-[#1a3442] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#37a653] text-sm"
                style={{borderRadius: '20px'}}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-[#37a653]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2 overflow-x-auto px-4 md:px-0 mb-4">
          <button
            onClick={() => handleCategoryFilter(null)}
            className={`inline-flex items-center px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              !filters.category
                ? 'bg-[#37a653] text-white'
                : 'bg-[#203f4a] text-gray-300 hover:bg-[#2a4a57]'
            }`}
            style={{fontSize: '0.65rem'}}
          >
            Alle Kategorien
          </button>
          
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryFilter(category.id)}
              className={`inline-flex items-center px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filters.category === category.id
                  ? 'bg-[#37a653] text-white'
                  : 'bg-[#203f4a] text-gray-300 hover:bg-[#2a4a57]'
              }`}
              style={{fontSize: '0.65rem'}}
            >
              {category.name_de}
            </button>
          ))}
        </div>

      {/* Post Editor Dialog */}
      {showCreatePostDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 md:p-4 z-50">
          <div className="bg-[#1a3442] md:bg-white w-screen h-screen md:rounded-lg md:max-w-4xl md:w-full md:max-h-[90vh] md:h-auto overflow-y-auto">
            <div className="sticky top-0 bg-[#1a3442] md:bg-white border-b border-[#2a4a57] md:border-gray-200 px-4 md:px-6 py-3 md:py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-headline font-bold text-[#37a653] md:text-gray-900">
                  Neuen Beitrag erstellen
                </h2>
                <button
                  onClick={onCreatePostDialogClose}
                  className="text-[#37a653] md:text-gray-400 hover:text-[#2e8844] md:hover:text-gray-600 transition-colors p-1"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 md:p-6 pb-20 md:pb-6">
              <PostEditor 
                onSubmit={handleCreatePost}
                onCancel={onCreatePostDialogClose}
                mobileOptimized={true}
              />
            </div>
          </div>
        </div>
      )}

        {/* Posts List */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#37a653]"></div>
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