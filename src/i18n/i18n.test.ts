import { describe, it, expect } from 'vitest'
import i18n, { i18nReady } from './index'

describe('i18n runtime chain', () => {
  it('initialises and serves German source strings', async () => {
    await i18nReady
    expect(i18n.t('actions.save')).toBe('Speichern')
    expect(i18n.t('language.en')).toBe('English')
  })

  it('changeLanguage switches the selected language and translates common chrome', async () => {
    // NOTE: assert on i18n.language, not resolvedLanguage. resolvedLanguage
    // skips languages whose bundles are empty and would report 'de' — that gap
    // was the original "switch does nothing" bug.
    await i18n.changeLanguage('fr')
    expect(i18n.language).toBe('fr')
    expect(i18n.t('nav.therapists')).toBe('Thérapeutes')
    expect(i18n.t('actions.save')).toBe('Enregistrer')

    await i18n.changeLanguage('it')
    expect(i18n.language).toBe('it')
    expect(i18n.t('nav.therapists')).toBe('Terapeuti')

    await i18n.changeLanguage('en')
    expect(i18n.language).toBe('en')
    expect(i18n.t('nav.therapists')).toBe('Therapists')

    await i18n.changeLanguage('de')
    expect(i18n.language).toBe('de')
    expect(i18n.t('nav.therapists')).toBe('Therapeuten')
  })

  it('lazy-loads the forum namespace and translates (incl. interpolation) per language', async () => {
    await i18n.changeLanguage('fr')
    await i18n.loadNamespaces('forum')
    expect(i18n.t('forum:new')).toBe('Nouveau')
    expect(i18n.t('forum:regionBanner', { canton: 'Zürich' })).toContain('Zürich')
    expect(i18n.t('forum:editor.publish')).toBe('Publier')
    expect(i18n.t('forum:filterModal.allCantons')).toBe('Tous les cantons')
    expect(i18n.t('forum:filterModal.onlyCanton', { canton: 'Bern' })).toContain('Bern')

    await i18n.changeLanguage('de')
    await i18n.loadNamespaces('forum')
    expect(i18n.t('forum:new')).toBe('Neu')
    expect(i18n.t('forum:editor.publish')).toBe('Veröffentlichen')
    expect(i18n.t('forum:editor.saveDraft')).toBe('Als Entwurf speichern')
  })

  it('translates the brand claim and comment chrome added in this slice', async () => {
    await i18n.changeLanguage('de')
    await i18n.loadNamespaces('forum')
    expect(i18n.t('brandClaim')).toContain('PSYCHOTHERAPIE')
    expect(i18n.t('menu')).toBe('Menü')
    expect(i18n.t('forum:comments.submit')).toBe('Kommentieren')
    expect(i18n.t('forum:comments.showReplies', { count: 3 })).toBe('3 Antworten anzeigen')

    await i18n.changeLanguage('en')
    await i18n.loadNamespaces('forum')
    expect(i18n.t('brandClaim')).toContain('PSYCHOTHERAPY')
    expect(i18n.t('forum:comments.submit')).toBe('Comment')

    await i18n.changeLanguage('de')
  })

  it('lazy-loads the auth namespace and passes raw (non-key) messages through t()', async () => {
    await i18n.changeLanguage('fr')
    await i18n.loadNamespaces('auth')
    expect(i18n.t('auth:forgot.title')).toBe('Réinitialiser le mot de passe')
    expect(i18n.t('auth:backToLogin')).toBe('Retour à la connexion')

    await i18n.changeLanguage('de')
    await i18n.loadNamespaces('auth')
    expect(i18n.t('auth:welcome.continue')).toBe('Weiter')
    // ConfirmEmail stores i18n keys in state and renders them via t(); a raw
    // backend message (not a known key) must pass through t() unchanged.
    expect(i18n.t('Some raw backend message')).toBe('Some raw backend message')
  })

  it('lazy-loads the messaging namespace incl. interpolation and plurals', async () => {
    await i18n.changeLanguage('de')
    await i18n.loadNamespaces('messaging')
    expect(i18n.t('messaging:conversationCount', { count: 1 })).toBe('1 Konversation')
    expect(i18n.t('messaging:conversationCount', { count: 3 })).toBe('3 Konversationen')
    expect(i18n.t('messaging:startWith', { username: 'Lea' })).toBe('Beginne eine Konversation mit Lea')

    await i18n.changeLanguage('en')
    await i18n.loadNamespaces('messaging')
    expect(i18n.t('messaging:conversationCount', { count: 2 })).toBe('2 conversations')
    expect(i18n.t('messaging:send.sendMessage')).toBe('Send message')

    await i18n.changeLanguage('de')
  })
})
