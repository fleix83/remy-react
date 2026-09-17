import React from 'react'
import { useLandingContent, useFooterContent } from '../../hooks/useSiteContent'

/**
 * Site footer (CMS-driven), shared by the landing page and every public
 * screen (static pages, community guidelines, auth flows). Layout + type
 * rhythm live in .landing-footer-* (App.css); the claim is the landing's
 * third "about" paragraph.
 */
const LandingFooter: React.FC = () => {
  const { content: landing } = useLandingContent()
  const { content: footer } = useFooterContent()

  return (
    <footer
      className="landing-footer flex h-auto flex-shrink-0 items-start px-[50px] pt-[62px] pb-[43px] md:h-[350px] md:items-center md:px-0 md:py-0"
      style={{ background: 'linear-gradient(#f6f6f6 0%, rgb(225 225 225) 100%)' }}
    >
      {/* Mobile stacks everything left-aligned per the mockup — logo, claim,
          link column, "Made by" — via the wrappers' own flex-col classes;
          type sizes + vertical rhythm live in .landing-footer-* (App.css).
          Desktop keeps the nested flex layout. */}
      <div className="landing-footer-inner mx-auto flex w-full max-w-7xl flex-col items-start text-left md:flex-row md:items-center md:justify-between md:gap-10 md:px-6 md:text-left lg:px-8">
        {/* Left: logo + credits on one line, aligned to the REMY baseline */}
        <div className="landing-footer-brand flex flex-col items-start gap-[20px] md:flex-row md:items-end md:gap-12">
          <img
            src="/images/logo_claim.png"
            alt="Remy"
            width={346}
            height={166}
            loading="lazy"
            decoding="async"
            className="landing-footer-logo w-[153px] h-auto md:w-auto md:h-[65px] md:shrink-0"
            style={{ filter: 'grayscale(100%)' }}
          />
          <div className="landing-footer-textcol flex flex-col md:pb-[5px]">
            <p
              className="landing-footer-claim w-full max-w-md text-left font-bold leading-snug md:mb-[13px] md:text-[19px] md:text-left"
              style={{ fontFamily: '"Nunito", sans-serif', color: 'rgb(130, 130, 130)' }}
            >
              {landing.about.paragraphs[2]}
            </p>
            <div
              className="landing-footer-links flex items-center text-[#828282] md:flex-wrap md:justify-start md:gap-x-8 md:gap-y-8 md:whitespace-nowrap md:text-[17px]"
              style={{ fontFamily: '"Nunito", sans-serif' }}
            >
              <a href={footer.forumHref} className="transition-opacity hover:opacity-70 md:hidden">{footer.forumLabel}</a>
              <a href={footer.aboutHref} className="underline transition-opacity hover:opacity-70">{footer.aboutLabel}</a>
              <a href={footer.impressumHref} className="underline transition-opacity hover:opacity-70">{footer.impressumLabel}</a>
              <a href={footer.datenschutzHref} className="underline transition-opacity hover:opacity-70">{footer.datenschutzLabel}</a>
            </div>
            {/* Own row below the links at every width — it has never fit
                inline next to them, not even at 1920px. */}
            <span
              className="landing-footer-made text-[#959595] md:mt-8 md:text-[17px]"
              style={{ fontFamily: '"Nunito", sans-serif' }}
            >
              {footer.madeByPrefix} {footer.madeByName}
            </span>
          </div>
        </div>

        {/* Right: lead text (desktop only) */}
        <div
          className="hidden shrink-0 uppercase leading-[1.18] text-[#828282] md:block md:text-right md:text-[30px] lg:text-[36px] xl:text-[42px]"
          style={{ fontFamily: '"Nunito", sans-serif', fontWeight: 700, letterSpacing: '0.06em', wordSpacing: '0.1em' }}
        >
          REMY, DAS FORUM<br />FÜR MENSCHEN IN<br />PSYCHOTHERAPIE
        </div>
      </div>
    </footer>
  )
}

export default LandingFooter
