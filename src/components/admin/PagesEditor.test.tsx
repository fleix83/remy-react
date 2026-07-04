// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Document } from '../../types/database.types'

// vi.hoisted so these are initialized before the vi.mock factory below runs
// (vi.mock calls are hoisted to the top of the file; plain `vi.fn()` consts
// declared after them would still be in the temporal dead zone when the
// factory executes on import — see StaticDocumentPage.test.tsx for the same note).
const getDocumentBySlug = vi.hoisted(() => vi.fn())
const updateDocument = vi.hoisted(() => vi.fn())
vi.mock('../../services/documents.service', () => ({
  DocumentsService: class {
    getDocumentBySlug = getDocumentBySlug
    updateDocument = updateDocument
  },
}))

import PagesEditor from './PagesEditor'

const DOC: Document = {
  id: 'doc-1', slug: 'impressum', title: 'Impressum',
  lead_text: 'Lead', published: true, locale: 'de', created_at: '', updated_at: '',
  sections: [{ number: 1, title: 'Kontakt', content: 'Adresse folgt', examples: [] }],
}

function renderEditor() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <PagesEditor />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  getDocumentBySlug.mockReset()
  updateDocument.mockReset()
  getDocumentBySlug.mockResolvedValue(DOC)
})

afterEach(cleanup)

describe('PagesEditor', () => {
  it('loads the selected document into editable fields', async () => {
    renderEditor()
    expect(await screen.findByDisplayValue('Impressum')).toBeTruthy()
    expect(screen.getByDisplayValue('Kontakt')).toBeTruthy()
    expect(screen.getByDisplayValue('Adresse folgt')).toBeTruthy()
  })

  it('saves edited fields through updateDocument', async () => {
    updateDocument.mockResolvedValue(DOC)
    renderEditor()
    const title = await screen.findByDisplayValue('Impressum')
    await userEvent.clear(title)
    await userEvent.type(title, 'Impressum NEU')
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    expect(updateDocument).toHaveBeenCalledWith(
      'doc-1',
      expect.objectContaining({ title: 'Impressum NEU' })
    )
  })
})
