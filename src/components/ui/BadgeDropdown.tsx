import React, { useState, useRef, useEffect } from 'react'

interface BadgeDropdownOption {
  value: string | number
  label: string
  icon?: React.ReactNode
}

interface BadgeDropdownProps {
  value: string | number
  options: BadgeDropdownOption[]
  onChange: (value: string | number) => void
  placeholder?: string
  className?: string
  badgeClassName?: string
  dropdownClassName?: string
  disabled?: boolean
  required?: boolean
}

const BadgeDropdown: React.FC<BadgeDropdownProps> = ({
  value,
  options,
  onChange,
  placeholder = "Select...",
  className = "",
  badgeClassName = "",
  dropdownClassName = "",
  disabled = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const selectedOption = options.find(option => option.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!disabled) {
        setIsOpen(!isOpen)
      }
    } else if (event.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Badge Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          inline-flex items-center px-2 py-1 rounded-lg font-medium text-xs
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
          ${badgeClassName}
        `}
        style={{ fontSize: '0.65rem' }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-required={required}
      >
        {selectedOption?.icon && (
          <span className="mr-1 flex items-center">
            {selectedOption.icon}
          </span>
        )}
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`ml-1 w-3 h-3 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`
            absolute top-full left-0 z-50 mt-1 min-w-full max-w-xs bg-white border border-gray-200 rounded-lg shadow-lg
            max-h-48 overflow-y-auto
            ${dropdownClassName}
          `}
          role="listbox"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`
                w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none
                first:rounded-t-lg last:rounded-b-lg
                transition-colors duration-150
                flex items-center
                ${value === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
              `}
              role="option"
              aria-selected={value === option.value}
            >
              {option.icon && (
                <span className="mr-2 flex items-center flex-shrink-0">
                  {option.icon}
                </span>
              )}
              <span className="truncate">{option.label}</span>
              {value === option.value && (
                <svg className="ml-auto w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default BadgeDropdown