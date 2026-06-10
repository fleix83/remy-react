import React from 'react'
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
    <div className="fixed inset-0 bg-black/50 md:bg-[#edffef] flex items-center justify-center p-0 md:p-4 z-40">
      <div className="w-full h-full md:rounded-lg md:max-w-4xl md:max-h-[90vh] md:h-auto overflow-y-auto hide-scrollbar-desktop" style={{backgroundColor: '#ecffef'}}>
        <div className="px-4 md:px-6 pb-0 pt-[120px] md:pt-[35px]">
          <button
            onClick={onClose}
            className="fixed md:absolute z-10 text-[var(--primary)] hover:text-[#3b71e6] transition-colors p-1.5 md:p-1 rounded-full bg-[#ecffef]/85 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none top-[44px] right-[28px] md:top-[50px] md:right-[50px]"
          >
            <svg className="w-8 h-8 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="hidden md:block mb-10"></div>
          <h2 className="font-headline font-bold text-left mb-12 md:mb-0" style={{ color: '#4785ff', fontSize: '20px' }}>
            Beitrag bearbeiten
          </h2>
        </div>
        <div className="px-4 md:px-6 pb-20 md:pb-6">
          <PostEditor
            editMode={true}
            mobileOptimized={true}
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