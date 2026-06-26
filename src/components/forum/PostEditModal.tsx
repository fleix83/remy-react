import React, { useState } from 'react'
import PostEditor from './PostEditor'
import type { PostWithRelations } from '../../types/database.types'

interface PostEditModalProps {
  isOpen: boolean
  post: PostWithRelations
  onClose: () => void
  onUpdate: (postData: any) => Promise<void>
}

const PostEditModal: React.FC<PostEditModalProps> = ({
  isOpen,
  post,
  onClose,
  onUpdate
}) => {
  // Tint of the post's selected category, reported by the editor — drives the
  // category-coloured top-header gradient (matches the new-post modal).
  const [editorTint, setEditorTint] = useState<string | null>(null)

  const handleSubmit = async (postData: any) => {
    try {
      await onUpdate(postData)
      onClose()
    } catch (error) {
      console.error('Error updating post:', error)
      throw error
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center p-0 md:p-4 z-40"
      onClick={onClose}
    >
      <div
        className="post-editor-surface relative w-full h-full md:rounded-[28px] md:max-w-3xl md:max-h-[90vh] md:h-auto overflow-y-auto hide-scrollbar-desktop md:border md:border-[#a9a9ff]"
        style={{ '--editor-cat-tint': editorTint ?? undefined } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 md:px-[30px] pb-0 pt-[120px] md:pt-[30px]">
          <button
            onClick={onClose}
            className="fixed md:absolute z-10 text-[var(--primary)] hover:text-[#3b71e6] transition-colors p-1.5 md:p-1 rounded-full bg-white/70 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none top-[44px] right-[28px] md:top-[24px] md:right-[24px]"
          >
            <svg className="w-8 h-8 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="font-headline font-bold text-left mb-1 md:mb-6" style={{ color: '#4785ff', fontSize: '20px' }}>
            Beitrag bearbeiten
          </h2>
        </div>
        <div className="px-4 md:px-[30px] pb-20 md:pb-[30px]">
          <PostEditor
            editMode={true}
            mobileOptimized={true}
            onCategoryTintChange={setEditorTint}
            initialData={{
              title: post.title || undefined,
              content: post.content,
              category_id: post.category_id,
              canton: post.canton || undefined,
              therapist_id: post.therapist_id || undefined,
              tags: (post.tags || []) as string[]
            }}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  )
}

export default PostEditModal