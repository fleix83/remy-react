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
  mobileOptimized?: boolean
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
  minHeight = "150px",
  mobileOptimized = false
}) => {
  const { selectedText, citationMode, insertCitation, clearSelection } = useCitationManager()
  
  // Dynamic height calculation for mobile optimization
  const dynamicMinHeight = mobileOptimized ? '60vh' : minHeight
  
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
        class: `prose prose-sm max-w-none focus:outline-none p-4 text-left ${className}`,
        style: `min-height: ${dynamicMinHeight}; text-align: left;`
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
  
  // Render simplified toolbar for mobile
  const renderToolbar = () => {
    if (mobileOptimized) {
      // Simplified mobile toolbar with only essential tools
      return (
        <div className="border-b border-gray-200 p-2 flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-gray-100 transition-colors ${
              editor.isActive('bold') ? 'bg-gray-200 text-primary-600' : 'text-gray-600'
            }`}
            title="Bold"
          >
            <span className="text-sm font-bold">B</span>
          </button>
          
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-gray-100 transition-colors ${
              editor.isActive('italic') ? 'bg-gray-200 text-primary-600' : 'text-gray-600'
            }`}
            title="Italic"
          >
            <span className="text-sm font-bold italic">I</span>
          </button>
          
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-gray-100 transition-colors ${
              editor.isActive('bulletList') ? 'bg-gray-200 text-primary-600' : 'text-gray-600'
            }`}
            title="Bullet List"
          >
            <span className="text-sm">•••</span>
          </button>
        </div>
      )
    }

    // Full desktop toolbar
    return (
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
          <span className="text-sm font-bold">B</span>
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('italic') ? 'bg-gray-200 text-primary-600' : 'text-gray-600'
          }`}
          title="Italic"
        >
          <span className="text-sm font-bold italic">I</span>
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('underline') ? 'bg-gray-200 text-primary-600' : 'text-gray-600'
          }`}
          title="Underline"
        >
          <span className="text-sm font-bold underline">U</span>
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
          <span className="text-sm">"</span>
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('bulletList') ? 'bg-gray-200 text-primary-600' : 'text-gray-600'
          }`}
          title="Bullet List"
        >
          <span className="text-sm">•••</span>
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('orderedList') ? 'bg-gray-200 text-primary-600' : 'text-gray-600'
          }`}
          title="Numbered List"
        >
          <span className="text-sm">123</span>
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
          <span className="text-sm">🔗</span>
        </button>
        
        {editor.isActive('link') && (
          <button
            type="button"
            onClick={removeLink}
            className="p-2 rounded hover:bg-gray-100 transition-colors text-red-600"
            title="Remove Link"
          >
            <span className="text-sm">❌</span>
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
              <span className="text-sm inline mr-1">”</span>
              Quote
            </button>
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className="relative rounded-lg bg-white">
      {/* Toolbar */}
      {renderToolbar()}
      
      {/* Editor content */}
      <div className="relative">
        <EditorContent 
          editor={editor}
          className="focus-within:ring-2 focus-within:ring-[#aedfb7] focus-within:ring-opacity-50 rounded-b-lg overflow-hidden"
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
              <span className="text-xs">✕</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RichTextEditor
export { SelectableText, useCitationManager }