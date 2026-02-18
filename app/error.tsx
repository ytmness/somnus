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
          {isChunkError ? "Actualización disponible" : "Algo salió mal"}
        </h1>
        <p className="text-gray-400 mb-6">
          {isChunkError
            ? "Hay una versión más reciente del sitio. Por favor recarga la página para continuar."
            : "Ocurrió un error inesperado. Intenta recargar la página."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-white text-black font-semibold rounded hover:bg-gray-200 transition-colors"
        >
          Recargar página
        </button>
      </div>
    </div>
  );
}
