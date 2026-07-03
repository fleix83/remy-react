import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotificationsStore } from '../../stores/notifications.store'
import { useAuthStore } from '../../stores/auth.store'
import { useActiveLanguage } from '../../hooks/useActiveLanguage'
import { intlLocale } from '../../utils/dateFormat'
import { useTranslation } from 'react-i18next'
import rIcon from '../../assets/r.svg'
import type { Notification } from '../../types/database.types'

interface HostThreadProps {
  onClose: () => void
}

/**
 * Read-only "conversation" with Remy, the system account: renders all in-app
 * notifications (moderation notices, comment replies, …) as incoming chat
 * bubbles on the Messages page. Opening it marks every notification read, so
 * the red dots that pointed here are cleared. There is no composer — Remy
 * doesn't take replies.
 */
const HostThread: React.FC<HostThreadProps> = ({ onClose }) => {
  const { t } = useTranslation('messaging')
  const navigate = useNavigate()
  const lang = useActiveLanguage()
  const { user } = useAuthStore()
  const { notifications, markAllAsRead } = useNotificationsStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Opening the thread = reading the inbox.
  useEffect(() => {
    markAllAsRead()
  }, [markAllAsRead])

  useEffect(() => {
    bottomRef.current?.scrollIntoView()
  }, [])

  // Chat order: oldest at the top, newest at the bottom.
  const ordered = [...notifications].sort(
    (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
  )

  const openNotification = (n: Notification) => {
    if (n.type === 'system') {
      // Moderation notices: the rejected item (badge + explanation) lives on
      // the own profile — rejected posts are not reachable via /post/:id.
      if (user) navigate(`/user/${user.id}`)
    } else if (n.related_post_id) {
      navigate(`/post/${n.related_post_id}`)
    }
  }

  const formatTime = (dateString: string | null) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleString(intlLocale(lang), {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#f7f5ef' }}>
      {/* Header — mirrors ConversationHeader */}
      <div className="px-5 py-4" style={{ background: 'linear-gradient(180deg, #e6eeff 0%, #f7f5ef 100%)' }}>
        <div className="flex items-center space-x-3">
          {/* Back button (mobile only) */}
          <button
            onClick={onClose}
            className="md:hidden p-1 -ml-1 text-[var(--primary)]"
            aria-label={t('host.back')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <img src={rIcon} alt="Remy" className="w-10 h-10 rounded-full bg-white p-1.5 shadow-sm flex-shrink-0" />
          <div className="min-w-0 text-left">
            <h3 className="text-sm font-semibold" style={{ color: '#5a5a5a' }}>Remy</h3>
            <p className="text-xs text-gray-400">{t('host.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Notification bubbles */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {ordered.map((n) => {
          const clickable = n.type === 'system' || !!n.related_post_id
          return (
            <div key={n.id} className="flex justify-start items-end space-x-2">
              <img src={rIcon} alt="" className="w-8 h-8 rounded-full bg-white p-1 shadow-sm flex-shrink-0" />
              <button
                type="button"
                onClick={() => clickable && openNotification(n)}
                className={`max-w-xs lg:max-w-md text-left ${clickable ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
              >
                <div className="px-4 py-2 rounded-2xl bg-white shadow-sm break-words">
                  {n.title && (
                    <p className="text-sm font-semibold mb-0.5" style={{ color: '#5a5a5a' }}>{n.title}</p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">{n.message}</p>
                </div>
                <div className="text-xs text-gray-400 mt-1 text-left">{formatTime(n.created_at ?? null)}</div>
              </button>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* No composer — Remy is a system account */}
      <div className="px-5 py-3 text-center">
        <p className="text-xs text-gray-400">{t('host.noReply')}</p>
      </div>
    </div>
  )
}

export default HostThread
