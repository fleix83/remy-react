import React, { useState, useEffect, useRef } from 'react'
import { TagsService } from '../../services/tags.service'
import type { Tag } from '../../types/database.types'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  className?: string
}

const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder = 'Tag hinzufügen...',
  className = ''
}) => {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<Tag[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const tagsService = new TagsService()

  // Fetch suggestions when input changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (inputValue.trim().length > 0) {
        const results = await tagsService.searchTags(inputValue)
        // Filter out already selected tags
        const filtered = results.filter(tag => !tags.includes(tag.name))
        setSuggestions(filtered)
        setShowSuggestions(true)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }

    const debounce = setTimeout(fetchSuggestions, 200)
    return () => clearTimeout(debounce)
  }, [inputValue, tags])

  const addTag = (tagName: string) => {
    const trimmed = tagName.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
      setInputValue('')
      setSuggestions([])
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addTag(suggestions[selectedIndex].name)
      } else if (inputValue.trim()) {
        addTag(inputValue)
      }
    } else if (e.key === ',' || e.key === ' ') {
      e.preventDefault()
      if (inputValue.trim()) {
        addTag(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      onChange(tags.slice(0, -1))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }
  }

  const handleSuggestionClick = (tagName: string) => {
    addTag(tagName)
    inputRef.current?.focus()
  }

  return (
    <div className={`relative ${className}`}>
      <label className="block mb-2 text-left" style={{ fontSize: '0.75rem', color: '#4785ff' }}>
        Tags (optional)
      </label>

      {/* Tags display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-3 py-1 rounded-lg text-xs md:text-sm"
            style={{
              color: 'grey',
              background: '#fbfffc',
              border: '1px solid #e5e5e5'
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-2 hover:text-red-600 transition-colors"
              title="Tag entfernen"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Input field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue.trim() && setShowSuggestions(true)}
          onBlur={() => {
            // Delay to allow click on suggestion
            setTimeout(() => setShowSuggestions(false), 200)
          }}
          className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          placeholder={placeholder}
        />

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-100'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => handleSuggestionClick(suggestion.name)}
              >
                {suggestion.name}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-1">
        Drücke Enter, Komma oder Leertaste um einen Tag hinzuzufügen
      </p>
    </div>
  )
}

export default TagInput
