import React, { useState } from 'react'
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

  if (!isOpen || !item || !actionType) return null

  const getTitle = () => {
    switch (actionType) {
      case 'approve':
        return `${item.content_type === 'post' ? 'Beitrag' : 'Kommentar'} genehmigen`
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
        return { text: 'Genehmigen', color: 'bg-[#37a653] hover:bg-[#2e8844]' }
      case 'reject':
        return { text: 'Ablehnen', color: 'bg-red-600 hover:bg-red-700' }
      case 'message':
        return { text: 'Nachricht senden', color: 'bg-blue-600 hover:bg-blue-700' }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {getTitle()}
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          {getDescription()}
        </p>

        {/* Content Preview */}
        <div className="bg-gray-50 p-3 rounded-lg mb-4">
          <div className="text-xs text-gray-500 mb-1">
            {item.content_type === 'post' ? 'Beitragstitel:' : 'Kommentar:'}
          </div>
          <div className="text-sm text-gray-800">
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
          <div className="mb-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={sendMessage}
                onChange={(e) => setSendMessage(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Nachricht an Benutzer senden
              </span>
            </label>
          </div>
        )}

        {/* Message Input */}
        {(actionType === 'message' || sendMessage) && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {actionType === 'reject' ? 'Grund für Ablehnung' : 'Nachricht'}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder={
                actionType === 'reject' 
                  ? 'Erklären Sie, warum dieser Inhalt nicht geeignet ist...'
                  : 'Ihre Nachricht an den Benutzer...'
              }
            />
          </div>
        )}
        
        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
          >
            Abbrechen
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 ${action.color}`}
          >
            {isProcessing ? 'Verarbeitung...' : action.text}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModerationMessageModal