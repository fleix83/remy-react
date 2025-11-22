import React, { useState } from 'react'
import type { DocumentSection } from '../../types/database.types'

interface GuidelineSectionProps {
  section: DocumentSection
}

const GuidelineSection: React.FC<GuidelineSectionProps> = ({ section }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="overflow-hidden">
      {/* Header - Always visible, clickable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-4 flex items-center justify-between hover:opacity-80 transition-opacity text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className="flex-shrink-0 font-bold"
            style={{ color: 'var(--primary)', fontSize: '30px', lineHeight: '1' }}
          >
            {section.number}
          </span>
          <h3 className="font-semibold text-gray-900 text-lg">
            {section.title}
          </h3>
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

      {/* Content - Expandable */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="pb-6 pt-2">
          {/* Main content text */}
          <p className="text-gray-700 leading-relaxed mb-4 text-left">
            {section.content}
          </p>

          {/* Examples section */}
          {section.examples && section.examples.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="bg-red-50 border border-red-100 rounded-md px-4 py-3">
                <p className="text-sm font-medium text-red-800 mb-2">
                  Folgende Aussagen sind nicht erlaubt:
                </p>
                <div className="space-y-2">
                  {section.examples
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

              {section.examples.some(ex => ex.type === 'positive') && (
                <div className="bg-blue-50 border border-blue-100 rounded-md px-4 py-3">
                  <p className="text-sm font-medium text-blue-800 mb-2">
                    Besser so:
                  </p>
                  <div className="space-y-2">
                    {section.examples
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GuidelineSection
