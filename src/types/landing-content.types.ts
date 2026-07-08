/**
 * Editable landing-page CMS content.
 *
 * These shapes mirror every in-scope text string on the landing page
 * (`src/App.tsx`, the unauthenticated `AuthForm` view), excluding the top nav.
 *
 * The DEFAULT_* constants below reproduce the exact current copy and act as the
 * canonical fallback: the landing page renders them instantly (TanStack Query
 * `initialData`) and the Supabase `site_content` row only stores admin overrides.
 *
 * `­` = soft hyphen (invisible hyphenation hint), `’` = typographic apostrophe.
 */

export interface LandingFeature {
  title: string
  lead: string
}

export interface LandingContent {
  hero: {
    /** Claim lines next to the REMY wordmark (mobile logo); `\n` renders as a line break. */
    claim: string
    /** Mobile tagline; `\n` renders as a line break (uppercased via CSS). */
    taglineMobile: string
    /** Desktop word-pills — exactly 4, mapped to fixed positioned slots. */
    taglineWords: string[]
    ctaLabel: string
    registerPrompt: string
    registerSubmit: string
    loginLinkPrefix: string
    loginLinkLabel: string
  }
  registrationComplete: {
    title: string
    body: string
    hint: string
    loginLabel: string
  }
  login: {
    title: string
    subtitle: string
    emailLabel: string
    passwordLabel: string
    forgotPrefix: string
    forgotLabel: string
    submit: string
    registerPrefix: string
    registerLabel: string
  }
  /** Desktop feature row — exactly 4; layout is tuned for 4 entries. */
  features: LandingFeature[]
  about: {
    /**
     * Exactly 3 paragraphs — the text section on both desktop and the mobile
     * landing page; the word "Remy" is auto-styled in cursive on desktop.
     */
    paragraphs: string[]
  }
}

export interface FooterContent {
  /** Short project description — crawlable entity text on every page. */
  description: string
  aboutLabel: string
  aboutHref: string
  impressumLabel: string
  impressumHref: string
  datenschutzLabel: string
  datenschutzHref: string
  madeByPrefix: string
  madeByName: string
}

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  hero: {
    claim: 'Forum für\nMenschen in\nPsychotherapie',
    taglineMobile: 'Du machst eine\nPsycho­therapie?',
    taglineWords: ['Du', 'machst', 'eine', 'Psycho­therapie?'],
    ctaLabel: 'Austauschen',
    registerPrompt: 'Melde Dich anonym und sicher an',
    registerSubmit: 'Registrieren',
    loginLinkPrefix: 'Schon registriert? Zum ',
    loginLinkLabel: 'Login.',
  },
  registrationComplete: {
    title: 'Registrierung erfolgreich!',
    body: 'Bitte überprüfe deine E-Mails und klicke auf den Bestätigungslink.',
    hint: 'Nach der Bestätigung kannst du dich einloggen.',
    loginLabel: 'Login',
  },
  login: {
    title: 'REMY',
    subtitle: 'Willkommen zurück',
    emailLabel: 'E-Mail',
    passwordLabel: 'Passwort',
    forgotPrefix: 'Passwort vergessen? ',
    forgotLabel: 'Zurücksetzen',
    submit: 'Einloggen',
    registerPrefix: 'Noch kein Konto? ',
    registerLabel: 'Registrieren',
  },
  features: [
    {
      title: 'Austausch',
      lead: 'Teile deine Erfahrungen mit Menschen, die Ähnliches erleben.',
    },
    {
      title: 'Anonym',
      lead: 'Schreib offen und geschützt — ohne deinen Namen preiszugeben.',
    },
    {
      title: 'Moderiert',
      lead: 'Ein respektvoller Raum, sorgfältig betreut und moderiert.',
    },
    {
      title: 'Schweiz',
      lead: 'Eine unabhängige Patient:innen­initiative aus der Schweiz.',
    },
  ],
  about: {
    paragraphs: [
      'Über 400’000 Men­schen in der Schweiz machen eine Psycho­therapie. Aber wenige reden darüber, ver­ständ­licher­weise.',
      'Therapie ist kompli­ziert und kann ver­unsichern. ==Remy ist der Ort, an dem du dich anonym aus­tauschen kannst.== Über das, was dich be­schäftigt. Über Therapeut:innen. Über den Weg, den du gehst.',
      'Remy ist eine un­ab­hängige Patienten­initiative für die Schweiz.',
    ],
  },
}

export const DEFAULT_FOOTER_CONTENT: FooterContent = {
  description:
    'Remy ist eine unabhängige Patienteninitiative für die Schweiz – das anonyme, moderierte Forum für Menschen in Psychotherapie.',
  aboutLabel: 'Über Remy',
  aboutHref: '/about',
  impressumLabel: 'Impressum',
  impressumHref: '/impressum',
  datenschutzLabel: 'Datenschutz',
  datenschutzHref: '/datenschutz',
  madeByPrefix: 'Made by',
  madeByName: 'Studio LUMINELLI',
}
