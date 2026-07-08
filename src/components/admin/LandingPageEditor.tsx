import React, { useState } from 'react'
import { useLandingContent, useContentEditor } from '../../hooks/useSiteContent'
import { DEFAULT_LANDING_CONTENT, type LandingContent } from '../../types/landing-content.types'
import { CmsField, CmsSection, CmsSaveBar, CmsLanguageTabs } from './CmsField'

/** Admin editor for the landing page marketing copy (per language). */
const LandingPageEditor: React.FC = () => {
  const [lng, setLng] = useState('de')
  return (
    <div className="space-y-4">
      <CmsLanguageTabs value={lng} onChange={setLng} />
      {lng !== 'de' && (
        <p className="text-xs text-slate-500">
          Nicht übersetzte Felder zeigen auf der Seite automatisch den deutschen Text.
        </p>
      )}
      <LandingPageEditorBody key={lng} lng={lng} />
    </div>
  )
}

const LandingPageEditorBody: React.FC<{ lng: string }> = ({ lng }) => {
  const doc = useLandingContent(lng)
  const editor = useContentEditor<LandingContent>(doc, DEFAULT_LANDING_CONTENT)
  const { draft, setDraft } = editor

  const setHero = (patch: Partial<LandingContent['hero']>) =>
    setDraft((d) => ({ ...d, hero: { ...d.hero, ...patch } }))
  const setWord = (index: number, value: string) =>
    setDraft((d) => ({
      ...d,
      hero: { ...d.hero, taglineWords: d.hero.taglineWords.map((w, i) => (i === index ? value : w)) },
    }))
  const setRegComplete = (patch: Partial<LandingContent['registrationComplete']>) =>
    setDraft((d) => ({ ...d, registrationComplete: { ...d.registrationComplete, ...patch } }))
  const setLogin = (patch: Partial<LandingContent['login']>) =>
    setDraft((d) => ({ ...d, login: { ...d.login, ...patch } }))
  const setFeature = (index: number, patch: Partial<LandingContent['features'][number]>) =>
    setDraft((d) => ({
      ...d,
      features: d.features.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    }))
  const setParagraph = (index: number, value: string) =>
    setDraft((d) => ({
      ...d,
      about: { paragraphs: d.about.paragraphs.map((p, i) => (i === index ? value : p)) },
    }))

  if (!editor.isFetched) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
        <span className="ml-3 text-slate-500">Lade Inhalte…</span>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-2">
      <CmsSection title="Hero">
        <CmsField
          label="Logo-Claim (mobil)"
          value={draft.hero.claim}
          onChange={(v) => setHero({ claim: v })}
          multiline
          rows={3}
          hint="Text neben dem REMY-Schriftzug. Zeilenumbruch = neue Zeile."
        />
        <CmsField
          label="Slogan (mobil)"
          value={draft.hero.taglineMobile}
          onChange={(v) => setHero({ taglineMobile: v })}
          multiline
          rows={2}
          hint="Zeilenumbruch = neue Zeile. Wird auf Mobile in Grossbuchstaben dargestellt."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {draft.hero.taglineWords.map((word, i) => (
            <CmsField key={i} label={`Slogan-Wort ${i + 1} (Desktop)`} value={word} onChange={(v) => setWord(i, v)} />
          ))}
        </div>
        <CmsField label="Button (Registrieren öffnen)" value={draft.hero.ctaLabel} onChange={(v) => setHero({ ctaLabel: v })} />
        <CmsField label="Hinweis über dem Formular" value={draft.hero.registerPrompt} onChange={(v) => setHero({ registerPrompt: v })} />
        <CmsField label="Absende-Button (Registrieren)" value={draft.hero.registerSubmit} onChange={(v) => setHero({ registerSubmit: v })} />
        <CmsField label="Login-Link Text davor" value={draft.hero.loginLinkPrefix} onChange={(v) => setHero({ loginLinkPrefix: v })} />
        <CmsField label="Login-Link" value={draft.hero.loginLinkLabel} onChange={(v) => setHero({ loginLinkLabel: v })} />
      </CmsSection>

      <CmsSection title="Registrierung abgeschlossen">
        <CmsField label="Titel" value={draft.registrationComplete.title} onChange={(v) => setRegComplete({ title: v })} />
        <CmsField label="Text" value={draft.registrationComplete.body} onChange={(v) => setRegComplete({ body: v })} multiline rows={2} />
        <CmsField label="Hinweis" value={draft.registrationComplete.hint} onChange={(v) => setRegComplete({ hint: v })} />
        <CmsField label="Login-Link" value={draft.registrationComplete.loginLabel} onChange={(v) => setRegComplete({ loginLabel: v })} />
      </CmsSection>

      <CmsSection title="Login-Formular">
        <CmsField label="Titel" value={draft.login.title} onChange={(v) => setLogin({ title: v })} />
        <CmsField label="Untertitel" value={draft.login.subtitle} onChange={(v) => setLogin({ subtitle: v })} />
        <div className="grid grid-cols-2 gap-3">
          <CmsField label="Feld-Label E-Mail" value={draft.login.emailLabel} onChange={(v) => setLogin({ emailLabel: v })} />
          <CmsField label="Feld-Label Passwort" value={draft.login.passwordLabel} onChange={(v) => setLogin({ passwordLabel: v })} />
        </div>
        <CmsField label="Passwort-vergessen Text davor" value={draft.login.forgotPrefix} onChange={(v) => setLogin({ forgotPrefix: v })} />
        <CmsField label="Passwort-vergessen Link" value={draft.login.forgotLabel} onChange={(v) => setLogin({ forgotLabel: v })} />
        <CmsField label="Absende-Button (Einloggen)" value={draft.login.submit} onChange={(v) => setLogin({ submit: v })} />
        <CmsField label="Registrieren-Link Text davor" value={draft.login.registerPrefix} onChange={(v) => setLogin({ registerPrefix: v })} />
        <CmsField label="Registrieren-Link" value={draft.login.registerLabel} onChange={(v) => setLogin({ registerLabel: v })} />
      </CmsSection>

      <CmsSection title="Features (Desktop)">
        <div className="grid gap-4 sm:grid-cols-2">
          {draft.features.map((feature, i) => (
            <div key={i} className="space-y-3 rounded-lg border border-[#f3eee4] bg-[#fbfaf7] p-3">
              <CmsField label={`Feature ${i + 1} – Titel`} value={feature.title} onChange={(v) => setFeature(i, { title: v })} />
              <CmsField label={`Feature ${i + 1} – Text`} value={feature.lead} onChange={(v) => setFeature(i, { lead: v })} multiline rows={2} />
            </div>
          ))}
        </div>
      </CmsSection>

      <CmsSection title="Textabschnitt «Über Remy» (Mobile & Desktop)">
        {draft.about.paragraphs.map((paragraph, i) => (
          <CmsField
            key={i}
            label={`Absatz ${i + 1}`}
            value={paragraph}
            onChange={(v) => setParagraph(i, v)}
            multiline
            rows={4}
            hint={'Das Wort „Remy" wird auf Desktop automatisch kursiv dargestellt. ==Text== erhält auf Mobile eine gelbe Markierung.'}
          />
        ))}
      </CmsSection>

      <CmsSaveBar
        dirty={editor.dirty}
        isSaving={editor.isSaving}
        saved={editor.saved}
        error={editor.error}
        onSave={editor.handleSave}
        onDiscard={editor.handleDiscard}
        onLoadDefaults={editor.handleLoadDefaults}
      />
    </div>
  )
}

export default LandingPageEditor
