"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  // Basic logging; Next already logs on the server, this is for client.
  // eslint-disable-next-line no-console
  console.error(error);

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-danger/10 flex items-center justify-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-danger"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <div>
          <h2 className="font-display text-2xl text-text-primary mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-text-secondary">
            The application encountered an unexpected error. Your data was not
            sent anywhere — it remains private.
          </p>
        </div>

        {error?.message && (
          <pre className="text-xs text-text-muted bg-surface-1 border border-border rounded-lg p-3 overflow-auto text-left font-mono">
            {error.message}
          </pre>
        )}

        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent/90 transition-colors"
        >
          Reload application
        </button>
      </div>
    </div>
  );
}

