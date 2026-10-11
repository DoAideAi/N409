import { brandLogo, useBranding } from '../lib/branding';

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="3" cy="3" r="2.6" fill="#0d9488" opacity=".92" />
      <circle cx="12" cy="3" r="2.6" fill="#d97706" opacity=".92" />
      <circle cx="21" cy="3" r="2.6" fill="#e11d48" opacity=".92" />
      <circle cx="3" cy="12" r="2.6" fill="#7c3aed" opacity=".92" />
      <circle cx="12" cy="12" r="2.6" fill="#0284c7" opacity=".92" />
      <circle cx="21" cy="12" r="2.6" fill="#16a34a" opacity=".92" />
      <circle cx="3" cy="21" r="2.6" fill="#db2777" opacity=".92" />
      <circle cx="12" cy="21" r="2.6" fill="#ea580c" opacity=".92" />
      <circle cx="21" cy="21" r="2.6" fill="#4f46e5" opacity=".92" />
    </svg>
  );
}

/**
 * The platform mark, or the tenant's logo where one is set. `light` means the
 * mark sits on dark chrome — the ground the dark logo variant exists for.
 */
export function BrandMark({ size = 30, light = false }: { size?: number; light?: boolean }) {
  const branding = useBranding();
  const logo = brandLogo(branding, light ? 'dark' : 'light');
  if (!logo) return <LogoMark size={size} />;
  return (
    <img
      src={logo}
      alt=""
      aria-hidden="true"
      // Firms supply whatever they have — square marks and wide lockups alike —
      // so height is fixed and width is left to the asset, up to a sane cap.
      style={{ height: size, maxWidth: size * 4 }}
      className="object-contain"
    />
  );
}

export function Wordmark({ light = false }: { light?: boolean }) {
  const branding = useBranding();
  const isPlatform = !branding.white_label;
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark size={30} light={light} />
      <span
        className={`font-display text-xl font-semibold tracking-tight ${light ? 'text-chrome-fg' : 'text-ink-900'}`}
      >
        {isPlatform ? (
          <>
            DoAide{' '}
            <span className={`mx-0.5 font-light ${light ? 'text-chrome-dim' : 'text-ink-300'}`}>|</span>{' '}
            <span className="text-bond-600">
              409A
            </span>
          </>
        ) : (
          branding.name
        )}
      </span>
      {branding.tagline && (
        <span className={`text-[0.62rem] font-sans font-semibold tracking-[0.18em] uppercase ${light ? 'text-chrome-fg/50' : 'text-ink-400'}`}>
          {branding.tagline}
        </span>
      )}
    </span>
  );
}
