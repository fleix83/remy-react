import React, { useState, useEffect } from 'react'
import UserAvatar from '../user/UserAvatar'
import type { ModerationQueueItem } from '../../types/database.types'

interface ModerationMessageModalProps {
  isOpen: boolean
  item: ModerationQueueItem | null
  actionType: 'approve' | 'reject' | 'message' | null
  onClose: () => void
  onConfirm: (message?: string) => void
  isProcessing: boolean
}

const ModerationMessageModal: React.FC<ModerationMessageModalProps> = ({
  isOpen,
  item,
  actionType,
  onClose,
  onConfirm,
  isProcessing
}) => {
  const [message, setMessage] = useState('')
  const [sendMessage, setSendMessage] = useState(false)

  // Reset state whenever the modal opens for a new item/action
  useEffect(() => {
    if (isOpen) {
      setMessage('')
      setSendMessage(false)
    }
  }, [isOpen, item, actionType])

  if (!isOpen || !item || !actionType) return null

  const getTitle = () => {
    switch (actionType) {
      case 'approve':
        return `${item.content_type === 'post' ? 'Beitrag' : 'Kommentar'} publizieren`
      case 'reject':
        return `${item.content_type === 'post' ? 'Beitrag' : 'Kommentar'} ablehnen`
      case 'message':
        return `Nachricht an ${item.users?.username || 'Benutzer'} senden`
      default:
        return 'Moderation'
    }
  }

  const getDescription = () => {
    switch (actionType) {
      case 'approve':
        return `Dieser ${item.content_type === 'post' ? 'Beitrag' : 'Kommentar'} wird für alle Benutzer sichtbar gemacht.`
      case 'reject':
        return `Dieser ${item.content_type === 'post' ? 'Beitrag' : 'Kommentar'} wird abgelehnt und nur für den Autor sichtbar bleiben.`
      case 'message':
        return 'Senden Sie eine Nachricht an den Benutzer bezüglich ihres Inhalts.'
      default:
        return ''
    }
  }

  const getActionButton = () => {
    switch (actionType) {
      case 'approve':
        return { text: 'Publizieren', color: 'bg-[var(--primary)] hover:bg-[#3b71e6]' }
      case 'reject':
        return { text: 'Ablehnen', color: 'bg-red-500 hover:bg-red-600' }
      case 'message':
        return { text: 'Nachricht senden', color: 'bg-[var(--primary)] hover:bg-[#3b71e6]' }
      default:
        return { text: 'Bestätigen', color: 'bg-gray-600 hover:bg-gray-700' }
    }
  }

  const handleSubmit = () => {
    if (actionType === 'message' && !message.trim()) {
      alert('Bitte geben Sie eine Nachricht ein.')
      return
    }

    if (actionType === 'reject' && sendMessage && !message.trim()) {
      alert('Bitte geben Sie eine Nachricht ein oder deaktivieren Sie die Nachrichtenoption.')
      return
    }

    // For approve/reject: send message only if requested
    // For message: always send the message
    const finalMessage = (actionType === 'message' || sendMessage) ? message.trim() : undefined
    onConfirm(finalMessage)
  }

  const handleClose = () => {
    setMessage('')
    setSendMessage(false)
    onClose()
  }

  const action = getActionButton()

  return (
    <div className="fixed inset-0 bg-black/50 md:bg-[#f8f5e6]/90 md:backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#fff9e2] rounded-2xl max-w-md w-full relative shadow-[0_8px_30px_rgba(20,66,32,0.08)]" style={{ paddingTop: '35px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '24px' }}>
        <button
          onClick={handleClose}
          disabled={isProcessing}
          className="absolute text-gray-500 hover:text-gray-700 md:text-[var(--primary)] md:hover:text-[#3b71e6] transition-colors p-1 disabled:opacity-50"
          style={{ top: '25px', right: '25px' }}
        >
          <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h3 className="text-lg font-semibold text-[var(--post-title)] mb-2 text-left pr-10">
          {getTitle()}
        </h3>

        <p className="text-sm text-gray-600 mb-4 text-left">
          {getDescription()}
        </p>

        {/* Content Preview */}
        <div className="bg-white/80 p-3 rounded-xl mb-4 text-left">
          <div className="text-xs text-gray-500 mb-1">
            {item.content_type === 'post' ? 'Beitragstitel:' : 'Kommentar:'}
          </div>
          <div className="text-sm text-[var(--type)]">
            {item.content_type === 'post'
              ? item.title || 'Kein Titel'
              : (item.content || '').replace(/<[^>]*>/g, '').substring(0, 100) + '...'
            }
          </div>
          <div className="flex items-center mt-2">
            {item.users && (
              <div className="mr-2">
                <UserAvatar
                  user={item.users}
                  size="small"
                />
              </div>
            )}
            <div className="text-xs text-gray-500">
              von {item.users?.username || 'Unbekannt'}
            </div>
          </div>
        </div>

        {/* Message Option for Approve/Reject */}
        {(actionType === 'approve' || actionType === 'reject') && (
          <div className="mb-4 text-left">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendMessage}
                onChange={(e) => setSendMessage(e.target.checked)}
                className="w-4 h-4 accent-[var(--primary)] bg-white border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">
                Nachricht an Benutzer senden
              </span>
            </label>
          </div>
        )}

        {/* Message Input */}
        {(actionType === 'message' || sendMessage) && (
          <div className="mb-4 text-left">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {actionType === 'reject' ? 'Grund für Ablehnung' : 'Nachricht'}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--primary)]"
              rows={3}
              placeholder={
                actionType === 'reject'
                  ? 'Erklären Sie, warum dieser Inhalt nicht geeignet ist...'
                  : 'Ihre Nachricht an den Benutzer...'
              }
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-4 mt-6">
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            Abbrechen
          </button>

          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className={`rounded-full px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${action.color}`}
          >
            {isProcessing ? 'Verarbeitung...' : action.text}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModerationMessageModal
