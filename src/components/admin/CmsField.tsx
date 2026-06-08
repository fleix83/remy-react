import React from 'react'

const inputClass =
  'w-full rounded-lg border border-[#efe9df] bg-[#ffffff] px-3 py-2 text-left text-sm text-[var(--type)] ' +
  'focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]'

interface CmsFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  rows?: number
  hint?: string
}

/** Labelled text input / textarea used throughout the CMS editors. */
export const CmsField: React.FC<CmsFieldProps> = ({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
  hint,
}) => (
  <label className="block text-left">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </span>
    {multiline ? (
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} resize-y`}
      />
    ) : (
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    )}
    {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
  </label>
)

/** Titled group of fields. */
export const CmsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="rounded-xl border border-[#efe9df] bg-[#f8f6f4] p-5 text-left">
    <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--primary)]">{title}</h3>
    <div className="space-y-4">{children}</div>
  </section>
)

interface CmsSaveBarProps {
  dirty: boolean
  isSaving: boolean
  saved: boolean
  error: string | null
  onSave: () => void
  onDiscard: () => void
  onLoadDefaults: () => void
}

/** Sticky action bar: save / discard / load-defaults with status feedback. */
export const CmsSaveBar: React.FC<CmsSaveBarProps> = ({
  dirty,
  isSaving,
  saved,
  error,
  onSave,
  onDiscard,
  onLoadDefaults,
}) => (
  <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 border-t border-[#efe9df] bg-[var(--bg-body)]/90 px-1 py-3 backdrop-blur">
    <button
      type="button"
      onClick={onSave}
      disabled={!dirty || isSaving}
      className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {isSaving ? 'Speichern…' : 'Speichern'}
    </button>
    <button
      type="button"
      onClick={onDiscard}
      disabled={!dirty || isSaving}
      className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:text-[var(--type)] disabled:opacity-40"
    >
      Änderungen verwerfen
    </button>
    <button
      type="button"
      onClick={onLoadDefaults}
      disabled={isSaving}
      className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:text-[var(--type)] disabled:opacity-40"
    >
      Standardtext laden
    </button>
    <div className="ml-auto text-sm">
      {error ? (
        <span className="text-red-600">{error}</span>
      ) : isSaving ? null : saved && !dirty ? (
        <span className="text-[var(--primary)]">Gespeichert ✓</span>
      ) : dirty ? (
        <span className="text-slate-400">Ungespeicherte Änderungen</span>
      ) : null}
    </div>
  </div>
)
