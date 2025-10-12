import React, { useState, useCallback, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Blockquote from '@tiptap/extension-blockquote'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Heading from '@tiptap/extension-heading'
import TextStyle from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import { PDFExporter } from '../../utils/pdf-export'

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
  
  // Page spacing state
  const [pageSpacing, setPageSpacing] = useState({
    top: 16,
    right: 20,
    bottom: 16,
    left: 20
  })
  
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
      Heading.configure({
        levels: [1, 2, 3]
      }),
      TextStyle,
      FontFamily.configure({
        types: ['textStyle']
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
        class: `prose prose-sm max-w-none focus:outline-none text-left ${className}`,
        style: `min-height: ${dynamicMinHeight}; text-align: left; padding: ${pageSpacing.top}px ${pageSpacing.right}px ${pageSpacing.bottom}px ${pageSpacing.left}px; margin: 0; page-break-inside: avoid;`
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

  const exportToPDF = async () => {
    try {
      // Get the editor content element
      const editorElement = document.querySelector('.ProseMirror') as HTMLElement
      if (!editorElement) {
        throw new Error('Editor element not found')
      }
      
      await PDFExporter.exportElementToPDF(editorElement, {
        filename: 'document.pdf',
        quality: 1.2,
        format: 'a4',
        orientation: 'portrait'
      })
    } catch (error) {
      console.error('PDF Export Error:', error)
      alert('PDF export failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }
  
  // Render simplified toolbar for mobile
  const renderToolbar = () => {
    if (mobileOptimized) {
      // Simplified mobile toolbar with only essential tools
      return (
        <div className="border-b border-gray-200 p-2 flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            className={`p-2 rounded hover:bg-gray-100 transition-colors ${
              !editor.isActive('bold') && !editor.isActive('italic') && !editor.isActive('underline') ? 'bg-gray-200 text-primary-600' : 'text-gray-600'
            }`}
            title="Normal"
          >
            <span className="text-sm">N</span>
          </button>
          
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
          
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          
          {/* Font Size */}
          <select
            value={
              editor.isActive('heading', { level: 1 }) ? 'h1' :
              editor.isActive('heading', { level: 2 }) ? 'h2' :
              editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'
            }
            onChange={(e) => {
              const value = e.target.value
              if (value === 'p') {
                editor.chain().focus().setParagraph().run()
              } else if (value === 'h1') {
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              } else if (value === 'h2') {
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              } else if (value === 'h3') {
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
            }}
            className="text-xs border border-gray-300 rounded px-1 py-1 text-gray-600"
            title="Text Size"
          >
            <option value="p">Normal</option>
            <option value="h3">H3</option>
            <option value="h2">H2</option>
            <option value="h1">H1</option>
          </select>
        </div>
      )
    }

    // Full desktop toolbar
    return (
      <div className="border-b border-gray-200 p-3 flex items-center gap-1 flex-wrap">
        {/* Text formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${
            !editor.isActive('bold') && !editor.isActive('italic') && !editor.isActive('underline') ? 'bg-gray-200 text-primary-600' : 'text-gray-600'
          }`}
          title="Normal"
        >
          <span className="text-sm">N</span>
        </button>
        
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
        
        {/* Text Size */}
        <select
          value={
            editor.isActive('heading', { level: 1 }) ? 'h1' :
            editor.isActive('heading', { level: 2 }) ? 'h2' :
            editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'
          }
          onChange={(e) => {
            const value = e.target.value
            if (value === 'p') {
              editor.chain().focus().setParagraph().run()
            } else if (value === 'h1') {
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            } else if (value === 'h2') {
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            } else if (value === 'h3') {
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          }}
          className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-600"
          title="Text Size"
        >
          <option value="p">Normal</option>
          <option value="h3">Heading 3</option>
          <option value="h2">Heading 2</option>
          <option value="h1">Heading 1</option>
        </select>
        
        {/* Font Family */}
        <select
          value=""
          onChange={(e) => {
            const value = e.target.value
            if (value) {
              editor.chain().focus().setFontFamily(value).run()
            }
          }}
          className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-600 ml-1"
          title="Font Family"
        >
          <option value="">Font</option>
          <option value="Inter, system-ui, sans-serif">Default</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="Helvetica, sans-serif">Helvetica</option>
          <option value="Times, serif">Times</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="Courier, monospace">Courier</option>
        </select>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        {/* Page Spacing Controls */}
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-500">Spacing:</span>
          <input
            type="number"
            value={pageSpacing.top}
            onChange={(e) => setPageSpacing(prev => ({ ...prev, top: parseInt(e.target.value) || 0 }))}
            className="w-12 text-xs border border-gray-300 rounded px-1 py-1 text-gray-600"
            title="Top Spacing"
            min="0"
            max="100"
          />
          <input
            type="number"
            value={pageSpacing.right}
            onChange={(e) => setPageSpacing(prev => ({ ...prev, right: parseInt(e.target.value) || 0 }))}
            className="w-12 text-xs border border-gray-300 rounded px-1 py-1 text-gray-600"
            title="Right Spacing"
            min="0"
            max="100"
          />
          <input
            type="number"
            value={pageSpacing.bottom}
            onChange={(e) => setPageSpacing(prev => ({ ...prev, bottom: parseInt(e.target.value) || 0 }))}
            className="w-12 text-xs border border-gray-300 rounded px-1 py-1 text-gray-600"
            title="Bottom Spacing"
            min="0"
            max="100"
          />
          <input
            type="number"
            value={pageSpacing.left}
            onChange={(e) => setPageSpacing(prev => ({ ...prev, left: parseInt(e.target.value) || 0 }))}
            className="w-12 text-xs border border-gray-300 rounded px-1 py-1 text-gray-600"
            title="Left Spacing"
            min="0"
            max="100"
          />
        </div>
        
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
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        {/* PDF Export */}
        <button
          type="button"
          onClick={exportToPDF}
          className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600"
          title="Export to PDF"
        >
          <span className="text-sm">📄</span>
        </button>
        
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
    <div className="relative rounded-lg bg-white shadow-sm border border-gray-200">
      {/* Toolbar */}
      {renderToolbar()}
      
      {/* Editor content */}
      <div className="relative" style={{ 
        padding: '0',
        margin: '0',
        background: 'white',
        minHeight: dynamicMinHeight
      }}>
        <EditorContent 
          editor={editor}
          className="focus-within:ring-2 focus-within:ring-[#aedfb7] focus-within:ring-opacity-50 rounded-b-lg overflow-hidden"
          style={{
            padding: '0',
            margin: '0'
          }}
        />
        
        {editor.isEmpty && (
          <div className="absolute top-5 left-5 text-gray-400 pointer-events-none">
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