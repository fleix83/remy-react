import React, { useState, useEffect, useRef } from 'react'
import { useMessagesStore } from '../../stores/messages.store'
import { toast } from '../../stores/toast.store'
import { useTranslation } from 'react-i18next'

interface MessageComposerProps {
  recipientId: string
  recipientUsername: string
}

const MessageComposer: React.FC<MessageComposerProps> = ({
  recipientId,
  recipientUsername
}) => {
  const { sendMessage } = useMessagesStore()
  const { t } = useTranslation('messaging')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Check for post context from session storage
  useEffect(() => {
    const contextData = sessionStorage.getItem('messageContext')
    if (contextData) {
      try {
        const { postTitle } = JSON.parse(contextData)
        const contextMessage = t('composer.postContext', { title: postTitle })
        setMessage(contextMessage)
        
        // Clear context after using it
        sessionStorage.removeItem('messageContext')
        
        // Focus and position cursor at end
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(contextMessage.length, contextMessage.length)
        }
      } catch (error) {
        console.error('Error parsing message context:', error)
      }
    }
  }, [t])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [message])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedMessage = message.trim()
    if (!trimmedMessage || sending) return

    setSending(true)
    try {
      await sendMessage({
        receiver_id: recipientId,
        content: trimmedMessage
      })
      
      setMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error(t('composer.sendError', { message: error instanceof Error ? error.message : t('unknownError') }))
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  return (
    <form onSubmit={handleSendMessage} className="p-4">
      <div className="flex items-center space-x-3">
        {/* Message Input */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('composer.placeholder', { username: recipientUsername })}
            className="w-full p-3 bg-white text-[var(--type)] rounded-xl border border-[#e3ddcc] focus:border-[var(--primary)] focus:outline-none resize-none min-h-[44px] max-h-32 scrollbar-hide"
            style={{ WebkitAppearance: 'none', appearance: 'none' }}
            rows={1}
            disabled={sending}
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!message.trim() || sending || message.length > 1000}
          className="p-3 bg-[var(--primary)] hover:bg-[#3b71e6] disabled:bg-[#c8c8c8b3] disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center justify-center min-w-[48px] min-h-[48px] flex-shrink-0"
          title={t('composer.sendTitle')}
        >
          {sending ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>

      {/* Helper text */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">
          {t('composer.hint')}
        </span>
        <span className="text-xs text-gray-400">
          {message.length}/1000
        </span>
      </div>
    </form>
  )
}

export default MessageComposer