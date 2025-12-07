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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 md:p-4 z-40">
      <div className="w-screen h-screen md:rounded-lg md:max-w-4xl md:w-full md:max-h-[90vh] md:h-auto overflow-y-auto" style={{backgroundColor: '#ecffef'}}>
        <div className="sticky top-0 px-4 md:px-6 pb-0 flex items-start justify-between" style={{backgroundColor: '#ecffef', paddingTop: '35px'}}>
          <h2 className="font-headline font-bold text-left flex-1" style={{ color: '#4785ff', fontSize: '20px' }}>
            Beitrag bearbeiten
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-600 transition-colors flex items-center justify-center flex-shrink-0 ml-4"
            style={{ width: '40px', height: '40px', fontWeight: '300' }}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ fontWeight: '300' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mb-10"></div>
        <div className="p-4 md:p-6 pb-20 md:pb-6">
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