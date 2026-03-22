import Image from "next/image";
import Link from "next/link";

type SiteBrandProps = {
  /** Use on LCP-critical headers (e.g. homepage). */
  priority?: boolean;
};

export default function SiteBrand({ priority = false }: SiteBrandProps) {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 font-display text-xl text-text-primary tracking-tight hover:text-accent transition-colors"
      aria-label="PIA home"
    >
      <Image
        src="/pia.svg"
        alt=""
        width={36}
        height={28}
        className="h-7 w-auto shrink-0"
        priority={priority}
        unoptimized
      />
      <span>PIA</span>
    </Link>
  );
}
