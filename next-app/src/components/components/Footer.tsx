import { Link } from "react-router-dom";

const footerLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About us" },
  { to: "/who-is-this-for", label: "Who is this for" },
  { to: "/how-does-it-work", label: "How does it work" },
  { to: "/what-else-do-we-do", label: "What else do we do" },
  { to: "/mission", label: "Mission" },
  { to: "/vision", label: "Vision" },
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface-0 mt-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-text-secondary" aria-label="Footer">
          {footerLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
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
