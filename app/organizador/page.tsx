import { Suspense } from "react";
import OrganizadorPageContent from "./OrganizadorPageContent";

export default function OrganizadorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen somnus-bg-main flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <OrganizadorPageContent />
    </Suspense>
  );
}
