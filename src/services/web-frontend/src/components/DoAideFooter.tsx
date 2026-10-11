const TOOLS = [
  { icon: '\u{1F4C4}', name: 'Docs', url: 'https://docs.doaide.com', desc: 'Free document generators' },
  { icon: '\u{1F4DD}', name: 'Resume', url: 'https://resume.doaide.com', desc: 'AI resume builder' },
  { icon: '\u{1F3F7}️', name: 'GST Bot', url: 'https://gst.doaide.com', desc: 'GST filing & compliance' },
  { icon: '\u{1F6E1}️', name: 'InsureKit', url: 'https://insure.doaide.com', desc: 'Insurance calculators' },
  { icon: '\u{1F4B0}', name: 'TaxFile', url: 'https://tax.doaide.com', desc: 'Tax & financial calculators' },
  { icon: '\u{1F4C8}', name: 'Pulse', url: 'https://pulse.doaide.com', desc: 'Newsletter growth tools' },
  { icon: '\u{1F9FE}', name: 'Invoicer', url: 'https://invoicer.doaide.com', desc: 'GST invoices in seconds' },
  { icon: '\u{1F4DD}', name: 'Contracts', url: 'https://contracts.doaide.com', desc: 'Business contracts' },
  { icon: '\u{1F3E0}', name: 'HomeNex', url: 'https://homenex.doaide.com', desc: 'AI CRM for real estate' },
];

export function DoAideFooter() {
  return (
    <section className="border-t border-paper-300 bg-paper-100 px-5 py-8" aria-label="More free tools from DoAide">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
            More free tools from DoAide
          </p>
          <a
            href="https://doaide.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-paper-300 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500 transition-colors hover:border-bond-500 hover:text-ink-900"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
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
            A DoAide Product
          </a>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TOOLS.map((t) => (
            <a
              key={t.url}
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 rounded-lg border border-paper-300 bg-surface px-3 py-3 text-left no-underline transition-colors hover:border-bond-400"
            >
              <span className="text-lg leading-none">{t.icon}</span>
              <span>
                <strong className="block text-sm text-ink-900">{t.name}</strong>
                <span className="text-xs text-ink-500">{t.desc}</span>
              </span>
            </a>
          ))}
        </div>
        <p className="mt-4 text-xs">
          <a href="https://doaide.com" target="_blank" rel="noopener noreferrer" className="text-bond-600 no-underline hover:underline">
            View all 40+ tools &rarr;
          </a>
        </p>
      </div>
    </section>
  );
}
