import React, { useState, useCallback, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Blockquote from '@tiptap/extension-blockquote'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

// Citation manager hook
const useCitationManager = () => {
  const [selectedText, setSelectedText] = useState('')
  const [citationMode, setCitationMode] = useState(false)
  const [_selectionRange, setSelectionRange] = useState<Range | null>(null)
  
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString().trim()
      setSelectedText(text)
      setCitationMode(true)
      
      // Store the range for later use
      if (selection.rangeCount > 0) {
        setSelectionRange(selection.getRangeAt(0).cloneRange())
      }
    } else {
      setSelectedText('')
      setCitationMode(false)
      setSelectionRange(null)
    }
  }, [])
  
  const insertCitation = useCallback((editor: any) => {
    if (selectedText && editor) {
      // Format citation with blockquote
      const citationText = `> ${selectedText}\n\n`
      
      // Insert at cursor position
      editor.chain().focus().insertContent(citationText).run()
      
      // Clear selection
      setSelectedText('')
      setCitationMode(false)
      setSelectionRange(null)
    }
  }, [selectedText])
  
  const clearSelection = useCallback(() => {
    setSelectedText('')
    setCitationMode(false)
    setSelectionRange(null)
  }, [])
  
  return { 
    selectedText, 
    citationMode, 
    handleTextSelection, 
    insertCitation,
    clearSelection
  }
}

// Selectable text component for citation support
const SelectableText: React.FC<{ children: React.ReactNode; onTextSelect: () => void }> = ({ 
  children, 
  onTextSelect 
}) => {
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()
      if (selection && selection.toString().trim()) {
        onTextSelect()
      }
    }
    
    document.addEventListener('mouseup', handleSelection)
    document.addEventListener('keyup', handleSelection)
    
    return () => {
      document.removeEventListener('mouseup', handleSelection)
      document.removeEventListener('keyup', handleSelection)
    }
  }, [onTextSelect])
  
  return <div className="selectable-content">{children}</div>
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  content, 
  onChange, 
  placeholder = "Write your content...",
  className = "",
  minHeight = "150px"
}) => {
  const { selectedText, citationMode, insertCitation, clearSelection } = useCitationManager()
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Blockquote.configure({
        HTMLAttributes: {
          class: 'border-l-4 border-primary-500 pl-4 italic text-gray-700 my-4'
        }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-600 hover:text-primary-800 underline'
        }
      }),
      Bold,
      Italic,
      Underline
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none p-4 ${className}`,
        style: `min-height: ${minHeight}`
      }
    }
  })
  
  if (!editor) return null

  const addLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }

  const removeLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
  }
  
  return (
    <div className="relative border border-gray-300 rounded-lg bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-3 flex items-center gap-1 flex-wrap">
        {/* Text formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('bold') ? 'bg-gray-200 text-primary-600' : 'text-gray-600'
          }`}
          title="Bold"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 5a1 1 0 011-1h5.5a2.5 2.5 0 010 5H4v2.5h4.5a2.5 2.5 0 010 5H4a1 1 0 01-1-1V5z"/>
          </svg>
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('italic') ? 'bg-gray-200 text-primary-600' : 'text-gray-600'
          }`}
          title="Italic"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 5v14l4-2V9h5l-2-4H8z"/>
          </svg>
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('underline') ? 'bg-gray-200 text-primary-600' : 'text-gray-600'
          }`}
          title="Underline"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 3v8c0 2.761 2.239 5 5 5s5-2.239 5-5V3h-2v8c0 1.657-1.343 3-3 3s-3-1.343-3-3V3H5zM3 17h14v2H3v-2z"/>
          </svg>
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        {/* Quote and lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('blockquote') ? 'bg-gray-200 text-primary-600' : 'text-gray-600'
          }`}
          title="Quote"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 17V7c0-1.1.9-2 2-2h3l-2 4v8H3zM14 17V7c0-1.1.9-2 2-2h3l-2 4v8h-3z"/>
          </svg>
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('bulletList') ? 'bg-gray-200 text-primary-600' : 'text-gray-600'
          }`}
          title="Bullet List"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 100 2 1 1 0 000-2zM6 4h11a1 1 0 110 2H6a1 1 0 110-2zM3 9a1 1 0 100 2 1 1 0 000-2zM6 9h11a1 1 0 110 2H6a1 1 0 110-2zM3 14a1 1 0 100 2 1 1 0 000-2zM6 14h11a1 1 0 110 2H6a1 1 0 110-2z"/>
          </svg>
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('orderedList') ? 'bg-gray-200 text-primary-600' : 'text-gray-600'
          }`}
          title="Numbered List"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 100 2 1 1 0 000-2zM6 4h11a1 1 0 110 2H6a1 1 0 110-2zM3 9a1 1 0 100 2 1 1 0 000-2zM6 9h11a1 1 0 110 2H6a1 1 0 110-2zM3 14a1 1 0 100 2 1 1 0 000-2zM6 14h11a1 1 0 110 2H6a1 1 0 110-2z"/>
          </svg>
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        {/* Link controls */}
        <button
          type="button"
          onClick={addLink}
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('link') ? 'bg-gray-200 text-primary-600' : 'text-gray-600'
          }`}
          title="Add Link"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"/>
          </svg>
        </button>
        
        {editor.isActive('link') && (
          <button
            type="button"
            onClick={removeLink}
            className="p-2 rounded hover:bg-gray-100 transition-colors text-red-600"
            title="Remove Link"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.293 6.293a1 1 0 011.414 0L10 8.586l2.293-2.293a1 1 0 111.414 1.414L11.414 10l2.293 2.293a1 1 0 01-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 01-1.414-1.414L8.586 10 6.293 7.707a1 1 0 010-1.414z"/>
            </svg>
          </button>
        )}
        
        {/* Citation button - only show when text is selected */}
        {citationMode && (
          <div className="flex items-center ml-2">
            <div className="w-px h-6 bg-gray-300 mr-2"></div>
            <button
              type="button"
              onClick={() => insertCitation(editor)}
              className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition-colors"
              title="Quote Selected Text"
            >
              <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 17V7c0-1.1.9-2 2-2h3l-2 4v8H3zM14 17V7c0-1.1.9-2 2-2h3l-2 4v8h-3z"/>
              </svg>
              Quote
            </button>
          </div>
        )}
      </div>
      
      {/* Editor content */}
      <div className="relative">
        <EditorContent 
          editor={editor}
          className="focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-opacity-50 rounded-b-lg overflow-hidden"
        />
        
        {editor.isEmpty && (
          <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>
      
      {/* Selected text preview */}
      {selectedText && (
        <div className="absolute top-2 right-2 bg-primary-600 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
          <div className="flex items-center">
            <span className="mr-2">Text selected: "{selectedText.substring(0, 30)}..."</span>
            <button
              type="button"
              onClick={clearSelection}
              className="hover:text-gray-200 transition-colors"
              title="Clear selection"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.293 6.293a1 1 0 011.414 0L10 8.586l2.293-2.293a1 1 0 111.414 1.414L11.414 10l2.293 2.293a1 1 0 01-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 01-1.414-1.414L8.586 10 6.293 7.707a1 1 0 010-1.414z"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RichTextEditor
export { SelectableText, useCitationManager }