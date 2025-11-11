import React, { useState, useRef, useEffect } from 'react'

interface InlineEditCellProps {
  value: string
  onSave: (newValue: string) => Promise<void>
  placeholder?: string
  className?: string
  inputClassName?: string
  displayClassName?: string
  readOnly?: boolean
  required?: boolean
}

/**
 * Reusable inline edit cell component
 * Click to edit, auto-save on blur
 * Shows loading state during save
 */
const InlineEditCell: React.FC<InlineEditCellProps> = ({
  value,
  onSave,
  placeholder = 'Click to edit...',
  className = '',
  inputClassName = '',
  displayClassName = '',
  readOnly = false,
  required = false
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update editValue when value prop changes
  useEffect(() => {
    setEditValue(value)
  }, [value])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleClick = () => {
    if (!readOnly) {
      setIsEditing(true)
      setError(null)
    }
  }

  const handleBlur = async () => {
    // Don't save if value hasn't changed
    if (editValue.trim() === value.trim()) {
      setIsEditing(false)
      return
    }

    // Validate required fields
    if (required && !editValue.trim()) {
      setError('This field is required')
      return
    }

    // Save the new value
    setIsSaving(true)
    setError(null)

    try {
      await onSave(editValue.trim())
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving inline edit:', err)
      setError('Failed to save. Please try again.')
      // Keep editing mode open on error
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      inputRef.current?.blur() // Trigger blur to save
    } else if (e.key === 'Escape') {
      setEditValue(value) // Reset to original value
      setIsEditing(false)
      setError(null)
    }
  }

  if (readOnly) {
    return (
      <div className={`px-3 py-2 ${className} ${displayClassName}`}>
        {value || <span className="text-gray-400 italic">{placeholder}</span>}
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className={`relative ${className}`}>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${isSaving ? 'bg-gray-50 cursor-wait' : 'bg-white'} ${inputClassName}`}
          disabled={isSaving}
          placeholder={placeholder}
        />
        {isSaving && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
        {error && (
          <div className="absolute left-0 top-full mt-1 text-xs text-red-600">
            {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      className={`px-3 py-2 cursor-pointer hover:bg-gray-50 rounded transition-colors ${className} ${displayClassName}`}
      title="Click to edit"
    >
      {value || <span className="text-gray-400 italic">{placeholder}</span>}
    </div>
  )
}

export default InlineEditCell
