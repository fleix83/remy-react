import React, { useState, useEffect } from 'react'
import { PostsService } from '../../services/posts.service'
import PostCard from './PostCard'
import PostEditor from './PostEditor'
import type { PostWithRelations, Category } from '../../types/database.types'

const ForumView: React.FC = () => {
  const [posts, setPosts] = useState<PostWithRelations[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const postsService = new PostsService()

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    loadPosts()
  }, [selectedCategory])

  const loadInitialData = async () => {
    try {
      const [postsData, categoriesData] = await Promise.all([
        postsService.getPosts(),
        postsService.getCategories()
      ])
      
      setPosts(postsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPosts = async () => {
    try {
      setLoading(true)
      const data = await postsService.getPosts(selectedCategory || undefined)
      setPosts(data)
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadPosts()
      return
    }

    try {
      setLoading(true)
      const data = await postsService.searchPosts(searchTerm.trim())
      setPosts(data)
    } catch (error) {
      console.error('Error searching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async (postData: any) => {
    try {
      await postsService.createPost(postData)
      setShowEditor(false)
      loadPosts() // Reload posts to show the new one
    } catch (error) {
      console.error('Error creating post:', error)
      throw error
    }
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
          
          <button
            onClick={() => setShowEditor(!showEditor)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            {showEditor ? 'Schließen' : 'Neuen Beitrag erstellen'}
          </button>
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
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === null
                ? 'bg-primary-100 text-primary-800 border border-primary-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            Alle Kategorien
          </button>
          
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                selectedCategory === category.id
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
              {selectedCategory
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