import React, { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
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

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  content, 
  onChange, 
  placeholder = "Write your content...",
  className = "",
  minHeight = "150px",
  mobileOptimized = false
}) => {
  // Page spacing state
  const [pageSpacing, setPageSpacing] = useState({
    top: 16,
    right: 20,
    bottom: 16,
    left: 20
  })

  const dynamicMinHeight = mobileOptimized ? '60vh' : minHeight

  const editor = useEditor({
    extensions: [
      StarterKit,
      Heading.configure({
        levels: [1, 2, 3]
      }),
      TextStyle,
      FontFamily.configure({
        types: ['textStyle']
      })
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editable: true,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none text-left ${className}`,
        style: `min-height: ${dynamicMinHeight}; text-align: left; padding: ${pageSpacing.top}px ${pageSpacing.right}px ${pageSpacing.bottom}px ${pageSpacing.left}px; margin: 0;`
      }
    }
  })

  if (!editor) return <div>Loading editor...</div>

  const exportToPDF = async () => {
    try {
      const editorElement = document.querySelector('.ProseMirror') as HTMLElement
      if (!editorElement) {
        alert('Editor content not found')
        return
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

  return (
    <div className="relative rounded-lg bg-white shadow-sm border border-gray-200">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-3 flex items-center gap-2 flex-wrap">
        {/* Normal Button */}
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600 border border-gray-300"
          title="Normal Text"
        >
          Normal
        </button>

        {/* Bold Button */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-100 transition-colors border border-gray-300 ${
            editor.isActive('bold') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
          }`}
          title="Bold"
        >
          <strong>B</strong>
        </button>

        {/* Italic Button */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-100 transition-colors border border-gray-300 ${
            editor.isActive('italic') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
          }`}
          title="Italic"
        >
          <em>I</em>
        </button>

        {/* Text Size Selector */}
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
          className="px-2 py-1 border border-gray-300 rounded text-sm"
          title="Text Size"
        >
          <option value="p">Normal</option>
          <option value="h3">Heading 3</option>
          <option value="h2">Heading 2</option>
          <option value="h1">Heading 1</option>
        </select>

        {/* Font Family Selector */}
        <select
          onChange={(e) => {
            const value = e.target.value
            if (value) {
              editor.chain().focus().setFontFamily(value).run()
            }
          }}
          className="px-2 py-1 border border-gray-300 rounded text-sm"
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

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300"></div>

        {/* Page Spacing Controls */}
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-500">Margin:</span>
          <input
            type="number"
            value={pageSpacing.top}
            onChange={(e) => setPageSpacing(prev => ({ ...prev, top: parseInt(e.target.value) || 0 }))}
            className="w-12 text-xs border border-gray-300 rounded px-1 py-1"
            title="Top"
            min="0"
            max="100"
          />
          <input
            type="number"
            value={pageSpacing.right}
            onChange={(e) => setPageSpacing(prev => ({ ...prev, right: parseInt(e.target.value) || 0 }))}
            className="w-12 text-xs border border-gray-300 rounded px-1 py-1"
            title="Right"
            min="0"
            max="100"
          />
          <input
            type="number"
            value={pageSpacing.bottom}
            onChange={(e) => setPageSpacing(prev => ({ ...prev, bottom: parseInt(e.target.value) || 0 }))}
            className="w-12 text-xs border border-gray-300 rounded px-1 py-1"
            title="Bottom"
            min="0"
            max="100"
          />
          <input
            type="number"
            value={pageSpacing.left}
            onChange={(e) => setPageSpacing(prev => ({ ...prev, left: parseInt(e.target.value) || 0 }))}
            className="w-12 text-xs border border-gray-300 rounded px-1 py-1"
            title="Left"
            min="0"
            max="100"
          />
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300"></div>

        {/* PDF Export Button */}
        <button
          type="button"
          onClick={exportToPDF}
          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
          title="Export to PDF"
        >
          📄 PDF
        </button>
      </div>

      {/* Editor Content */}
      <div className="relative" style={{ minHeight: dynamicMinHeight }}>
        <EditorContent 
          editor={editor}
          className="focus-within:ring-2 focus-within:ring-blue-200 rounded-b-lg"
        />
        
        {editor.isEmpty && (
          <div className="absolute top-5 left-5 text-gray-400 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  )
}

export default RichTextEditor