import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="font-display text-3xl text-text-primary">
          Page not found
        </h1>
        <p className="text-sm text-text-secondary">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent/90 transition-colors"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}

