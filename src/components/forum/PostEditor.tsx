import React, { useState, useEffect } from 'react'
import type { Category, Therapist } from '../../types/database.types'
import { PostsService } from '../../services/posts.service'
import RichTextEditor from '../ui/RichTextEditor'
import TherapistSelector from '../therapist/TherapistSelector'
import BadgeDropdown from '../ui/BadgeDropdown'
import TagInput from '../ui/TagInput'

interface PostEditorProps {
  onSubmit?: (postData: any) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  editMode?: boolean
  mobileOptimized?: boolean
  initialData?: {
    title?: string
    content?: string
    category_id?: number
    canton?: string
    therapist_id?: number
    tags?: string[]
  }
}

const PostEditor: React.FC<PostEditorProps> = ({ 
  onSubmit, 
  onCancel, 
  isLoading, 
  editMode = false,
  mobileOptimized = false,
  initialData 
}) => {
  const [title, setTitle] = useState(initialData?.title || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [categoryId, setCategoryId] = useState<number>(initialData?.category_id || 1)
  const [canton, setCanton] = useState(initialData?.canton || '')
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [publishing, setPublishing] = useState(false)

  const postsService = new PostsService()

  // Category color functions (matching PostCard and PostView)
  const getCategoryBackground = (categoryId: number) => {
    const backgrounds = {
      1: 'var(--bg-erfahrung)',     // Yellow
      2: 'var(--bg-suche)',         // Light Pink
      3: 'var(--bg-gedanken)',      // Light Blue
      4: 'var(--bg-rant)',          // Light Purple
      5: 'var(--bg-ressourcen)',    // Light Green
    }
    return backgrounds[categoryId as keyof typeof backgrounds] || 'var(--bg-erfahrung)'
  }

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
    if (editMode && initialData?.therapist_id) {
      loadInitialTherapist(initialData.therapist_id)
    }
  }, [editMode, initialData?.therapist_id])

  const loadCategories = async () => {
    try {
      const cats = await postsService.getCategories()
      setCategories(cats)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadInitialTherapist = async (therapistId: number) => {
    try {
      // We need to import TherapistsService to load the therapist
      const { TherapistsService } = await import('../../services/therapists.service')
      const therapistsService = new TherapistsService()
      const therapist = await therapistsService.getTherapist(therapistId)
      if (therapist) {
        setSelectedTherapist(therapist)
      }
    } catch (error) {
      console.error('Error loading initial therapist:', error)
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
      alert('Bitte wählen Sie einen Therapeut* für Ihre Erfahrung aus')
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
        tags,
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
      setTags([])
    } catch (error) {
      console.error('Error submitting post:', error)
      alert('Fehler beim Speichern des Beitrags')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="relative">
      <form onSubmit={(e) => handleSubmit(e, true)}>
        {/* Mobile Optimized Layout - Reordered as requested */}
        {mobileOptimized ? (
          <>
            {/* 1. Category Badge Dropdown - First */}
            <div className="mb-4" style={{ marginTop: '12px' }}>
              <BadgeDropdown
                value={categoryId}
                options={categories.map(cat => ({ value: cat.id, label: cat.name_de }))}
                onChange={(value) => setCategoryId(Number(value))}
                placeholder="Kategorie"
                badgeClassName="text-black hover:opacity-80"
                className="category-badge-dropdown w-full"
                style={{ backgroundColor: getCategoryBackground(categoryId) }}
                required
              />
            </div>

            {/* 2. Canton Badge Dropdown - Second with max height to 2/3 screen */}
            <div className="mb-4">
              <BadgeDropdown
                value={canton}
                options={cantons.filter(c => c.code).map(c => ({
                  value: c.code,
                  label: c.name,
                  icon: c.code ? (
                    <img
                      src={`/remyreact/kantone/${c.code.toLowerCase()}.png`}
                      alt={`${c.code} flag`}
                      className="w-5 h-3 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : undefined
                }))}
                onChange={(value) => setCanton(String(value))}
                placeholder="Kanton"
                badgeClassName="bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                dropdownClassName="max-h-[66vh] overflow-y-auto"
                className="w-full"
                required
              />
            </div>

            {/* 3. Title Input - Third (for non-Erfahrung categories) */}
            {categoryId !== 1 && (
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium mb-1 text-left" style={{ color: '#4785ff' }}>
                  Titel
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-3 rounded-lg bg-white border border-gray-300 focus:outline-none text-base"
                  placeholder="Titel eingeben..."
                  maxLength={255}
                  required
                />
              </div>
            )}

            {/* Therapist Selector - Only for Erfahrung category */}
            {categoryId === 1 && (
              <div className="mb-4">
                <label className="block mb-2 text-left" style={{ fontSize: '0.75rem', color: '#4785ff' }}>
                  Therapeut* für Erfahrung wählen
                </label>
                <TherapistSelector
                  selectedTherapist={selectedTherapist}
                  onTherapistSelect={setSelectedTherapist}
                  canton={canton}
                />
              </div>
            )}

            {/* 4. Content - Fourth */}
            <div className="mb-6">
              <label htmlFor="content" className="block mb-1 text-left" style={{ fontSize: '0.75rem', color: '#4785ff' }}>
                Inhalt
              </label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Teile deine Gedanken, Erfahrungen oder Fragen mit der Community..."
                minHeight="200px"
                mobileOptimized={mobileOptimized}
              />
              <p className="text-sm text-gray-500 mt-1">
                {content.replace(/<[^>]*>/g, '').length} Zeichen (ohne HTML)
              </p>
            </div>

            {/* 5. Tags - Fifth */}
            <div className="mb-6">
              <TagInput
                tags={tags}
                onChange={setTags}
                placeholder="Tag hinzufügen..."
              />
            </div>
          </>
        ) : (
          <>
            {/* Title - Hidden for Erfahrung category */}
            {categoryId !== 1 && (
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium mb-1 text-left" style={{ color: '#4785ff' }}>
                  Titel
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none"
                  placeholder="Gib deinem Beitrag einen aussagekräftigen Titel..."
                  maxLength={255}
                  required
                />
              </div>
            )}
          </>
        )}

        {/* Desktop: Traditional form layout */}
        {!mobileOptimized && (
          <div className="mb-6">
            {/* Title - Hidden for Erfahrung category */}
            {categoryId !== 1 && (
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium mb-1 text-left" style={{ color: '#4785ff' }}>
                  Titel
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-white border border-gray-300 focus:outline-none"
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
                        Der Titel wird automatisch basierend auf dem ausgewählten Therapeut* erstellt.
                      </p>
                    </div>
                  </div>
                </div>
                
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Therapeut* *
                </label>
                <TherapistSelector
                  selectedTherapist={selectedTherapist}
                  onTherapistSelect={setSelectedTherapist}
                  canton={canton}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Wählen Sie den Therapeut* aus, mit dem Sie eine Erfahrung gemacht haben.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Content for Desktop (not mobile optimized) */}
        {!mobileOptimized && (
          <>
            <div className="mb-6">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Inhalt *
              </label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Teile deine Gedanken, Erfahrungen oder Fragen mit der Community..."
                minHeight="200px"
                mobileOptimized={mobileOptimized}
              />
              <p className="text-sm text-gray-500 mt-1">
                {content.replace(/<[^>]*>/g, '').length} Zeichen (ohne HTML)
              </p>
            </div>

            {/* Tags */}
            <div className="mb-6">
              <TagInput
                tags={tags}
                onChange={setTags}
                placeholder="Tag hinzufügen..."
              />
            </div>
          </>
        )}

        {/* Action Buttons */}
        {mobileOptimized ? (
          /* Mobile: Buttons styled like navbar buttons */
          <div className="flex items-center justify-between gap-2">
            {/* Left side buttons */}
            <div className="flex items-center gap-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-md font-medium transition-colors text-sm"
                  disabled={publishing}
                >
                  Abbrechen
                </button>
              )}

              <button
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-md font-medium transition-colors text-sm"
                disabled={publishing}
              >
                Entwurf
              </button>
            </div>

            {/* Right side: Speichern button matching navbar style */}
            <button
              type="submit"
              disabled={publishing || isLoading}
              className="text-white px-2.5 py-1.5 rounded-md font-medium transition-all transform hover:scale-105 shadow-md text-sm"
              style={{
                backgroundColor: '#4785ff',
                boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              {publishing || isLoading
                ? 'Speichern...'
                : 'Veröffentlichen'
              }
            </button>
          </div>
        ) : (
          /* Desktop: Traditional button layout */
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
              {publishing || isLoading 
                ? (editMode ? '📝 Wird aktualisiert...' : '📤 Wird veröffentlicht...')
                : (editMode ? '📝 Aktualisieren' : '🚀 Veröffentlichen')
              }
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

export default PostEditor