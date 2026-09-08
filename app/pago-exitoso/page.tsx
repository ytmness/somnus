"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckoutReceipt } from "@/components/receipt/CheckoutReceipt";

function PagoExitosoContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const saleId = searchParams.get("saleId");

  return <CheckoutReceipt email={email} saleId={saleId} />;
}

export default function PagoExitosoPage() {
  return (
    <div className="min-h-[100dvh] somnus-bg-main text-white">
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6 sm:pt-10">
        <Suspense
          fallback={
            <div className="flex min-h-[50dvh] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          }
        >
          <PagoExitosoContent />
        </Suspense>
      </main>
    </div>
  );
}
