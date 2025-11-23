import React, { useState, useEffect } from 'react'
import type { Category, Therapist } from '../../types/database.types'
import { PostsService } from '../../services/posts.service'
import RichTextEditor from '../ui/RichTextEditor'
import TherapistSelector from '../therapist/TherapistSelector'
import BadgeDropdown from '../ui/BadgeDropdown'
import TagInput from '../ui/TagInput'
import { SWISS_CANTONS } from '../../constants/switzerland.constants'

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



  useEffect(() => {
    loadCategories()
    if (editMode && initialData?.therapist_id) {
      loadInitialTherapist(initialData.therapist_id)
    }
  }, [editMode, initialData?.therapist_id])

  // Auto-populate canton from selected therapist for Erfahrung category
  useEffect(() => {
    if (categoryId === 1 && selectedTherapist?.canton) {
      setCanton(selectedTherapist.canton)
    }
  }, [categoryId, selectedTherapist])

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

    // Title is required for ALL categories
    if (!title.trim()) {
      alert('Bitte Titel ausfüllen')
      return
    }

    if (!content.trim()) {
      alert('Bitte Inhalt ausfüllen')
      return
    }

    // Validate therapist selection for "Erfahrung" category
    if (categoryId === 1 && !selectedTherapist) {
      alert('Bitte wählen Sie einen Therapeut* für Ihre Erfahrung aus')
      return
    }

    // For Erfahrung category, canton comes from therapist
    // For other categories, canton dropdown is required
    if (categoryId !== 1 && !canton) {
      alert('Bitte Kanton auswählen')
      return
    }

    setPublishing(true)

    try {
      const postData = {
        title: title.trim(),
        content: content.trim(),
        category_id: categoryId,
        canton,
        is_draft: !publish, // true when saving as draft, false when publishing
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

            {/* Therapist Selector - Second (only for Erfahrung category) */}
            {categoryId === 1 && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-left" style={{ color: '#4785ff' }}>
                  Therapeut:innen/Institution für Erfahrung wählen
                </label>
                <TherapistSelector
                  selectedTherapist={selectedTherapist}
                  onTherapistSelect={setSelectedTherapist}
                  canton={canton}
                />
              </div>
            )}

            {/* 2. Canton Badge Dropdown - Second (only for non-Erfahrung categories) */}
            {categoryId !== 1 && (
              <div className="mb-4">
                <BadgeDropdown
                  value={canton}
                  options={SWISS_CANTONS.filter(c => c.code).map(c => ({
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
            )}

            {/* 3. Title Input - Third (for all categories) */}
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium mb-1 text-left" style={{ color: '#4785ff' }}>
                Titel
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 focus:outline-none text-base"
                placeholder="Titel eingeben..."
                maxLength={255}
              />
            </div>

            {/* 4. Content - Fourth */}
            <div className="mb-6">
              <label htmlFor="content" className="block text-sm font-medium mb-1 text-left" style={{ color: '#4785ff' }}>
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
          <></>
        )}

        {/* Desktop: Traditional form layout */}
        {!mobileOptimized && (
          <div className="mb-6">
            {/* Title - Required for all categories */}
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
              />
            </div>

            {/* Category and Canton - Layout depends on category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Kategorie
                </label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name_de}
                    </option>
                  ))}
                </select>
              </div>

              {/* Canton - Only show for non-Erfahrung categories */}
              {categoryId !== 1 && (
                <div>
                  <label htmlFor="canton" className="block text-sm font-medium text-gray-700 mb-1">
                    Kanton
                  </label>
                  <select
                    id="canton"
                    value={canton}
                    onChange={(e) => setCanton(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    {SWISS_CANTONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Therapist Selection - Only show for "Erfahrung" category */}
            {categoryId === 1 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Therapeut:innen/Institution für Erfahrung wählen
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