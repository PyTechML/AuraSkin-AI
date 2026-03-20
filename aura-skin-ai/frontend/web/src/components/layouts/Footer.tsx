import Link from "next/link";

const FOOTER_NAV = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/blog", label: "Blog" },
  { href: "/help", label: "Help" },
  { href: "/contact", label: "Contact" },
] as const;

const FOOTER_LEGAL = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
  { href: "/disclaimer", label: "Disclaimer" },
] as const;

const FOOTER_SOCIAL = [
  { href: "https://instagram.com", label: "Instagram" },
  { href: "https://linkedin.com", label: "LinkedIn" },
  { href: "https://twitter.com", label: "Twitter" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/80 backdrop-blur-[20px] py-12">
      <div className="container px-4 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1">
            <span className="font-brand font-semibold text-lg text-foreground">AuraSkin AI</span>
            <p className="mt-3 text-sm text-muted-foreground font-body leading-relaxed max-w-xs">
              Clinical AI skin intelligence built for you. Get evidence-based assessments and personalized routines.
            </p>
          </div>
          <nav className="flex flex-col gap-2">
            <span className="text-xs font-label uppercase tracking-wider text-muted-foreground mb-1">Navigation</span>
            {FOOTER_NAV.map(({ href, label }) => (
              <Link key={href} href={href} className="text-sm font-label text-muted-foreground hover:text-foreground transition-colors">
                {label}
              </Link>
            ))}
          </nav>
          <nav className="flex flex-col gap-2">
            <span className="text-xs font-label uppercase tracking-wider text-muted-foreground mb-1">Legal</span>
            {FOOTER_LEGAL.map(({ href, label }) => (
              <Link key={href} href={href} className="text-sm font-label text-muted-foreground hover:text-foreground transition-colors">
                {label}
              </Link>
            ))}
          </nav>
          <nav className="flex flex-col gap-2">
            <span className="text-xs font-label uppercase tracking-wider text-muted-foreground mb-1">Social</span>
            {FOOTER_SOCIAL.map(({ href, label }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-label text-muted-foreground hover:text-foreground transition-colors">
                {label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
