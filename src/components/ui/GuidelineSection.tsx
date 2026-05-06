import React, { useState, useEffect } from 'react'
import type { DocumentSection, DocumentExample } from '../../types/database.types'

interface GuidelineSectionProps {
  section: DocumentSection
  isEditMode?: boolean
  onSectionChange?: (updatedSection: DocumentSection) => void
  index?: number
  isDragged?: boolean
  isDropTarget?: boolean
  onDragStart?: (index: number) => void
  onDragOver?: (e: React.DragEvent, index: number) => void
  onDrop?: (index: number) => void
  onDragEnd?: () => void
}

const GuidelineSection: React.FC<GuidelineSectionProps> = ({
  section,
  isEditMode = false,
  onSectionChange,
  index = 0,
  isDragged = false,
  isDropTarget = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [editedSection, setEditedSection] = useState<DocumentSection>(section)

  // Sync local state with prop changes (important for drag and drop reordering)
  useEffect(() => {
    setEditedSection(section)
  }, [section])

  const handleSectionUpdate = (field: keyof DocumentSection, value: any) => {
    const updated = { ...editedSection, [field]: value }
    setEditedSection(updated)
    if (onSectionChange) {
      onSectionChange(updated)
    }
  }

  const handleExampleChange = (index: number, field: string, value: any) => {
    const updatedExamples = [...editedSection.examples]
    updatedExamples[index] = { ...updatedExamples[index], [field]: value } as DocumentExample
    handleSectionUpdate('examples', updatedExamples)
  }

  const handleAddExample = (type: 'positive' | 'negative') => {
    const newExample: DocumentExample = { type, text: '' }
    handleSectionUpdate('examples', [...editedSection.examples, newExample])
  }

  const handleRemoveExample = (index: number) => {
    const updatedExamples = editedSection.examples.filter((_, i) => i !== index)
    handleSectionUpdate('examples', updatedExamples)
  }

  return (
    <div
      className={`overflow-hidden transition-all duration-200 border-2 rounded-lg p-2 ${
        isDragged ? 'opacity-40 scale-95 border-transparent' :
        isDropTarget ? 'border-blue-400 bg-blue-50' :
        'border-transparent'
      }`}
      onDragOver={(e) => {
        if (isEditMode && onDragOver) {
          e.preventDefault()
          onDragOver(e, index)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        if (isEditMode) onDrop?.(index)
      }}
    >
      {/* Header Row with Drag Handle and Content */}
      <div className="w-full py-4 flex items-center gap-3">
        {/* Drag Handle - Only in edit mode */}
        {isEditMode && (
          <div
            draggable
            onDragStart={(e) => {
              e.stopPropagation()
              onDragStart?.(index)
            }}
            onDragEnd={onDragEnd}
            className="cursor-move text-gray-400 hover:text-gray-600 px-2 flex-shrink-0"
            title="Drag to reorder"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="4" cy="3" r="1.5"/>
              <circle cx="4" cy="8" r="1.5"/>
              <circle cx="4" cy="13" r="1.5"/>
              <circle cx="12" cy="3" r="1.5"/>
              <circle cx="12" cy="8" r="1.5"/>
              <circle cx="12" cy="13" r="1.5"/>
            </svg>
          </div>
        )}

        {/* Clickable expand/collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center justify-between hover:opacity-80 transition-opacity text-left"
        >
          <div className="flex items-center gap-3 flex-1">
            <span
              className="flex-shrink-0 font-bold"
              style={{ color: 'var(--primary)', fontSize: '30px', lineHeight: '1' }}
            >
              {editedSection.number}
            </span>
            {isEditMode ? (
              <input
                type="text"
                value={editedSection.title}
                onChange={(e) => handleSectionUpdate('title', e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded font-semibold text-lg bg-white"
                placeholder="Section title"
              />
            ) : (
              <h3 className="font-semibold text-gray-900 text-lg">
                {editedSection.title}
              </h3>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform duration-200 flex-shrink-0 ml-4 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Content - Expandable. Uses an animated CSS grid row so we don't
          animate `max-height` (which forces a layout recalculation every frame
          and pins the duration to a fixed pixel cap). The 0fr → 1fr trick
          interpolates against the natural content height without layout
          thrash, and the inner wrapper needs min-h-0 + overflow-hidden so the
          row can actually collapse to zero. */}
      <div
        className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
        <div className="pb-6 pt-2">
          {/* Main content text */}
          {isEditMode ? (
            <textarea
              value={editedSection.content}
              onChange={(e) => handleSectionUpdate('content', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-gray-700 leading-relaxed mb-4 bg-white"
              rows={4}
              placeholder="Section content"
            />
          ) : (
            <p className="text-gray-700 leading-relaxed mb-4 text-left">
              {editedSection.content}
            </p>
          )}

          {/* Examples section */}
          {(isEditMode || (editedSection.examples && editedSection.examples.length > 0)) && (
            <div className="mt-4 space-y-3">
              {isEditMode ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-red-800 mb-2">Negative Examples (not allowed)</h4>
                    <div className="space-y-2 mb-2">
                      {editedSection.examples
                        .map((ex, idx) => ex.type === 'negative' ? idx : -1)
                        .filter(idx => idx !== -1)
                        .map((idx) => (
                          <div key={`neg-edit-${idx}`} className="flex items-start gap-2">
                            <input
                              type="text"
                              value={editedSection.examples[idx].text}
                              onChange={(e) => handleExampleChange(idx, 'text', e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                              placeholder="Example text"
                            />
                            <button
                              onClick={() => handleRemoveExample(idx)}
                              className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                    </div>
                    <button
                      onClick={() => handleAddExample('negative')}
                      className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                    >
                      + Add Negative Example
                    </button>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-800 mb-2">Positive Examples (preferred)</h4>
                    <div className="space-y-2 mb-2">
                      {editedSection.examples
                        .map((ex, idx) => ex.type === 'positive' ? idx : -1)
                        .filter(idx => idx !== -1)
                        .map((idx) => (
                          <div key={`pos-edit-${idx}`} className="flex items-start gap-2">
                            <input
                              type="text"
                              value={editedSection.examples[idx].text}
                              onChange={(e) => handleExampleChange(idx, 'text', e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                              placeholder="Example text"
                            />
                            <button
                              onClick={() => handleRemoveExample(idx)}
                              className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                    </div>
                    <button
                      onClick={() => handleAddExample('positive')}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      + Add Positive Example
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-red-50 border border-red-100 rounded-md px-4 py-3">
                    <p className="text-sm font-medium text-red-800 mb-2">
                      Folgende Aussagen sind nicht erlaubt:
                    </p>
                    <div className="space-y-2">
                      {editedSection.examples
                        .filter(ex => ex.type === 'negative')
                        .map((example, idx) => (
                          <div key={`neg-${idx}`} className="flex items-start gap-2">
                            <svg
                              className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            <span className="text-sm text-gray-700">{example.text}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {editedSection.examples.some(ex => ex.type === 'positive') && (
                    <div className="bg-blue-50 border border-blue-100 rounded-md px-4 py-3">
                      <p className="text-sm font-medium text-blue-800 mb-2">
                        Besser so:
                      </p>
                      <div className="space-y-2">
                        {editedSection.examples
                          .filter(ex => ex.type === 'positive')
                          .map((example, idx) => (
                            <div key={`pos-${idx}`} className="flex items-start gap-2">
                              <svg
                                className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              <span className="text-sm text-gray-700">{example.text}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}

export default GuidelineSection
