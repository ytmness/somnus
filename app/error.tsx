"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset: _reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  const isChunkError =
    error?.name === "ChunkLoadError" ||
    error?.message?.toLowerCase().includes("chunk") ||
    error?.message?.toLowerCase().includes("loading chunk");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-white mb-4">
          {isChunkError ? "Update available" : "Something went wrong"}
        </h1>
        <p className="text-gray-400 mb-6">
          {isChunkError
            ? "A newer version of the site is available. Please reload the page to continue."
            : "An unexpected error occurred. Try reloading the page."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-white text-black font-semibold rounded hover:bg-gray-200 transition-colors"
        >
          Reload page
        </button>
      </div>
    </div>
  );
}
