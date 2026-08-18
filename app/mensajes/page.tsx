import { Suspense } from "react";
import MensajesPage from "./MensajesPageClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen somnus-bg-main flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <MensajesPage />
    </Suspense>
  );
}
