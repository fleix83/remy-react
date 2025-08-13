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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 md:p-4 z-50">
      <div className="bg-[#1a3442] md:bg-white w-screen h-screen md:rounded-lg md:max-w-4xl md:w-full md:max-h-[90vh] md:h-auto overflow-y-auto">
        <div className="sticky top-0 bg-[#1a3442] md:bg-white border-b border-[#2a4a57] md:border-gray-200 px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-headline font-bold text-[#37a653] md:text-gray-900">
              Beitrag bearbeiten
            </h2>
            <button
              onClick={onClose}
              className="text-[#37a653] md:text-gray-400 hover:text-[#2e8844] md:hover:text-gray-600 transition-colors p-1"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-4 md:p-6 pb-20 md:pb-6">
          <PostEditor
            editMode={true}
            mobileOptimized={true}
            initialData={{
              title: post.title,
              content: post.content,
              category_id: post.category_id,
              canton: post.canton || '',
              therapist_id: post.therapist_id || undefined
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