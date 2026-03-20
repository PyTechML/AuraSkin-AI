"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#F5FAE1] text-[#2d2a26] font-sans antialiased">
        <div className="max-w-md text-center space-y-6">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-[#5c5650]">
            We encountered an unexpected error. Please try again.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg bg-[#896C6C] text-white px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <p className="text-sm">
            <a href="/" className="text-[#896C6C] underline hover:no-underline">
              Go to homepage
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
