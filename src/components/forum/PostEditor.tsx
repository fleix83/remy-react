import React, { useState, useEffect } from 'react'
import type { Category, Therapist } from '../../types/database.types'
import { PostsService } from '../../services/posts.service'
import RichTextEditor from '../ui/RichTextEditor'
import TherapistSelector from '../therapist/TherapistSelector'

interface PostEditorProps {
  onSubmit?: (postData: any) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

const PostEditor: React.FC<PostEditorProps> = ({ onSubmit, onCancel, isLoading }) => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState<number>(1)
  const [canton, setCanton] = useState('')
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [publishing, setPublishing] = useState(false)

  const postsService = new PostsService()

  const cantons = [
    { code: '', name: 'Kanton auswählen' },
    { code: 'AG', name: 'Aargau' },
    { code: 'AI', name: 'Appenzell Innerrhoden' },
    { code: 'AR', name: 'Appenzell Ausserrhoden' },
    { code: 'BE', name: 'Bern' },
    { code: 'BL', name: 'Basel-Landschaft' },
    { code: 'BS', name: 'Basel-Stadt' },
    { code: 'FR', name: 'Freiburg' },
    { code: 'GE', name: 'Genf' },
    { code: 'GL', name: 'Glarus' },
    { code: 'GR', name: 'Graubünden' },
    { code: 'JU', name: 'Jura' },
    { code: 'LU', name: 'Luzern' },
    { code: 'NE', name: 'Neuenburg' },
    { code: 'NW', name: 'Nidwalden' },
    { code: 'OW', name: 'Obwalden' },
    { code: 'SG', name: 'St. Gallen' },
    { code: 'SH', name: 'Schaffhausen' },
    { code: 'SO', name: 'Solothurn' },
    { code: 'SZ', name: 'Schwyz' },
    { code: 'TG', name: 'Thurgau' },
    { code: 'TI', name: 'Tessin' },
    { code: 'UR', name: 'Uri' },
    { code: 'VD', name: 'Waadt' },
    { code: 'VS', name: 'Wallis' },
    { code: 'ZG', name: 'Zug' },
    { code: 'ZH', name: 'Zürich' }
  ]


  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const cats = await postsService.getCategories()
      setCategories(cats)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent, publish = true) => {
    e.preventDefault()
    
    // For Erfahrung category, title is optional (will be auto-generated)
    // For other categories, title is required
    if (categoryId !== 1 && !title.trim()) {
      alert('Bitte Titel ausfüllen')
      return
    }
    
    if (!content.trim()) {
      alert('Bitte Inhalt ausfüllen')
      return
    }

    if (!canton) {
      alert('Bitte Kanton auswählen')
      return
    }


    // Validate therapist selection for "Erfahrung" category
    if (categoryId === 1 && !selectedTherapist) {
      alert('Bitte wählen Sie einen Therapeuten für Ihre Erfahrung aus')
      return
    }

    setPublishing(true)
    
    try {
      // For Erfahrung category, provide default title if empty (will be replaced by therapist info)
      const finalTitle = categoryId === 1 && !title.trim() ? 'Erfahrung' : title.trim()
      
      const postData = {
        title: finalTitle,
        content: content.trim(),
        category_id: categoryId,
        canton,
        is_published: publish,
        ...(selectedTherapist && { therapist_id: selectedTherapist.id })
      }

      if (onSubmit) {
        await onSubmit(postData)
      }

      // Reset form
      setTitle('')
      setContent('')
      setCategoryId(1)
      setCanton('')
      setSelectedTherapist(null)
    } catch (error) {
      console.error('Error submitting post:', error)
      alert('Fehler beim Speichern des Beitrags')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div>

      <form onSubmit={(e) => handleSubmit(e, true)}>
        {/* Title - Hidden for Erfahrung category */}
        {categoryId !== 1 && (
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Titel *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Gib deinem Beitrag einen aussagekräftigen Titel..."
              maxLength={255}
              required
            />
          </div>
        )}

        {/* Category and Canton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Kategorie *
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name_de}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="canton" className="block text-sm font-medium text-gray-700 mb-1">
              Kanton *
            </label>
            <select
              id="canton"
              value={canton}
              onChange={(e) => setCanton(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            >
              {cantons.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>


        {/* Therapist Selection - Only show for "Erfahrung" category */}
        {categoryId === 1 && (
          <div className="mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    Der Titel wird automatisch basierend auf dem ausgewählten Therapeuten erstellt.
                  </p>
                </div>
              </div>
            </div>
            
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Therapeut/in *
            </label>
            <TherapistSelector
              selectedTherapist={selectedTherapist}
              onTherapistSelect={setSelectedTherapist}
              canton={canton}
            />
            <p className="text-sm text-gray-500 mt-1">
              Wählen Sie den Therapeuten/die Therapeutin aus, mit dem/der Sie eine Erfahrung gemacht haben.
            </p>
          </div>
        )}

        {/* Content */}
        <div className="mb-6">
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Inhalt *
          </label>
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Teile deine Gedanken, Erfahrungen oder Fragen mit der Community..."
            minHeight="200px"
          />
          <p className="text-sm text-gray-500 mt-1">
            {content.replace(/<[^>]*>/g, '').length} Zeichen (ohne HTML)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled={publishing}
            >
              Abbrechen
            </button>
          )}
          
          <button
            type="button"
            onClick={(e) => handleSubmit(e, false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            disabled={publishing}
          >
            Als Entwurf speichern
          </button>

          <button
            type="submit"
            disabled={publishing || isLoading}
            className="px-6 py-3 text-base font-bold text-white bg-primary-600 border border-transparent rounded-md shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all"
            style={{ 
              backgroundColor: '#0284c7', 
              fontSize: '16px',
              fontWeight: 'bold',
              padding: '12px 24px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            {publishing || isLoading ? '📤 Wird veröffentlicht...' : '🚀 Veröffentlichen'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PostEditor