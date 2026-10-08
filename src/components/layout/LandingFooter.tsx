import { forwardRef } from 'react'
import { useLandingContent, useFooterContent } from '../../hooks/useSiteContent'

interface LandingFooterProps {
  className?: string
}

/**
 * The site footer (CMS-driven), shared by the landing page, the Layout shell
 * (forum, messages, admin) and every standalone screen (post, profiles,
 * therapists, static pages, auth flows). Layout + type rhythm live in
 * .landing-footer-* (App.css); the claim is the landing's third "about"
 * paragraph. The ref lets Layout measure it for the sidebar scroll-push.
 */
const LandingFooter = forwardRef<HTMLElement, LandingFooterProps>(({ className = '' }, ref) => {
  const { content: landing } = useLandingContent()
  const { content: footer } = useFooterContent()

  return (
    <footer
      ref={ref}
      className={`${className} landing-footer flex h-auto flex-shrink-0 items-start px-[50px] pt-[62px] pb-[43px] md:h-[350px] md:items-center md:px-0 md:py-0`}
      style={{ background: 'linear-gradient(#f6f6f6 0%, rgb(225 225 225) 100%)' }}
    >
      {/* Mobile stacks everything left-aligned per the mockup — logo, claim,
          link column, "Made by" — via the wrappers' own flex-col classes;
          type sizes + vertical rhythm live in .landing-footer-* (App.css).
          Desktop lays the same pieces out as one left-aligned row: logo
          (bottom-aligned with the text block), claim, then the links in a
          line level with the claim's first line, "Made by" beneath them. */}
      <div className="landing-footer-inner mx-auto flex w-full max-w-7xl flex-col items-start text-left md:flex-row md:items-center md:justify-start md:px-6 md:text-left lg:px-8">
        <div className="landing-footer-brand flex flex-col items-start gap-[20px] md:flex-row md:items-end md:gap-[clamp(48px,5vw,96px)]">
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
          {/* Desktop: claim in the first column; links (one line, top-aligned
              with the claim) + "Made by" beneath them in the second. The
              claim's last line sits level with the logo's bottom. */}
          <div className="landing-footer-textcol flex flex-col md:grid md:grid-cols-[minmax(0,320px)_auto] md:items-start md:gap-x-[clamp(48px,5vw,96px)]">
            <p
              className="landing-footer-claim w-full max-w-md text-left font-bold leading-snug md:row-span-2 md:text-[19px] md:text-left"
              style={{ fontFamily: '"Nunito", sans-serif', color: 'rgb(130, 130, 130)' }}
            >
              {landing.about.paragraphs[2]}
            </p>
            <div
              className="landing-footer-links flex items-center text-[#828282] md:col-start-2 md:flex-row md:items-center md:gap-x-8 md:whitespace-nowrap md:text-[17px]"
              style={{ fontFamily: '"Nunito", sans-serif' }}
            >
              <a href={footer.forumHref} className="transition-opacity hover:opacity-70 md:hidden">{footer.forumLabel}</a>
              <a href={footer.aboutHref} className="underline transition-opacity hover:opacity-70">{footer.aboutLabel}</a>
              <a href={footer.impressumHref} className="underline transition-opacity hover:opacity-70">{footer.impressumLabel}</a>
              <a href={footer.datenschutzHref} className="underline transition-opacity hover:opacity-70">{footer.datenschutzLabel}</a>
            </div>
            {/* Below the links at every width. On desktop it takes no height
                (h-0 + relative offset) so the text block's bottom is the
                claim's last line, which the brand row aligns with the logo. */}
            <span
              className="landing-footer-made text-[#959595] md:relative md:top-6 md:col-start-2 md:h-0 md:overflow-visible md:whitespace-nowrap md:text-[17px]"
              style={{ fontFamily: '"Nunito", sans-serif' }}
            >
              {footer.madeByPrefix} {footer.madeByName}
            </span>
          </div>
        </div>

      </div>
    </footer>
  )
})

LandingFooter.displayName = 'LandingFooter'

export default LandingFooter
