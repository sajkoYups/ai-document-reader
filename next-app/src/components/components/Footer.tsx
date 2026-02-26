import Link from "next/link";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About us" },
  { href: "/who-is-this-for", label: "Who is this for" },
  { href: "/how-does-it-work", label: "How does it work" },
  { href: "/what-else-do-we-do", label: "What else do we do" },
  { href: "/mission", label: "Mission" },
  { href: "/vision", label: "Vision" },
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface-0 mt-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-text-secondary" aria-label="Footer">
          {footerLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="hover:text-accent transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
