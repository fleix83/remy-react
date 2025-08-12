import React, { useState, useEffect } from 'react'
import type { Category } from '../../types/database.types'
import { PostsService } from '../../services/posts.service'

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
  const [designation, setDesignation] = useState('')
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

  const designations = [
    'Psychotherapeut',
    'Psychologe',
    'Psychiater',
    'Coach',
    'Berater',
    'Sozialarbeiter',
    'Klinik',
    'Tagesklinik',
    'Tagesstruktur'
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
    
    if (!title.trim() || !content.trim()) {
      alert('Bitte Titel und Inhalt ausfüllen')
      return
    }

    if (!canton) {
      alert('Bitte Kanton auswählen')
      return
    }

    if (!designation) {
      alert('Bitte Fachrichtung auswählen')
      return
    }

    setPublishing(true)
    
    try {
      const postData = {
        title: title.trim(),
        content: content.trim(),
        category_id: categoryId,
        canton,
        designation,
        is_published: publish
      }

      if (onSubmit) {
        await onSubmit(postData)
      }

      // Reset form
      setTitle('')
      setContent('')
      setCategoryId(1)
      setCanton('')
      setDesignation('')
    } catch (error) {
      console.error('Error submitting post:', error)
      alert('Fehler beim Speichern des Beitrags')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-headline font-bold text-gray-900">
          Neuen Beitrag erstellen
        </h2>
        <p className="text-gray-600 mt-1">
          Teile deine Erfahrungen mit der Community
        </p>
      </div>

      <form onSubmit={(e) => handleSubmit(e, true)}>
        {/* Title */}
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

        {/* Designation */}
        <div className="mb-4">
          <label htmlFor="designation" className="block text-sm font-medium text-gray-700 mb-1">
            Fachrichtung *
          </label>
          <select
            id="designation"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            required
          >
            <option value="">Fachrichtung auswählen</option>
            {designations.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="mb-6">
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Inhalt *
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Teile deine Gedanken, Erfahrungen oder Fragen mit der Community..."
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            {content.length} Zeichen
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
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishing || isLoading ? 'Wird veröffentlicht...' : 'Veröffentlichen'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PostEditor