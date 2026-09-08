"use client";

import {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReceiptPrinterStage = "processing" | "printing" | "complete";
export type ReceiptFeedMotion = "smooth" | "stepped";

export type ReceiptPrinterRootProps = Omit<
  ComponentPropsWithoutRef<"section">,
  "children"
> & {
  animate?: boolean;
  children: ReactNode;
  feedMotion?: ReceiptFeedMotion;
  stage: ReceiptPrinterStage;
};

export type ReceiptPrinterMachineProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterHeaderProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterScreenProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterOutputProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterPaperProps = ComponentPropsWithoutRef<"article">;
export type ReceiptPrinterStatusProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  children?: ReactNode;
};

type ReceiptPrinterContextValue = {
  animate: boolean;
  feedMotion: ReceiptFeedMotion;
  shouldMove: boolean;
  stage: ReceiptPrinterStage;
};

const ReceiptPrinterContext = createContext<ReceiptPrinterContextValue | null>(
  null
);

const receiptToothCount = 40;
const receiptToothDepth = 4;
const receiptToothPoints = Array.from(
  { length: receiptToothCount * 2 },
  (_, index) => {
    const x = 100 - ((index + 1) * 100) / (receiptToothCount * 2);
    const y = index % 2 === 0 ? "100%" : `calc(100% - ${receiptToothDepth}px)`;
    return `${x}% ${y}`;
  }
).join(", ");
const receiptClipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${receiptToothDepth}px), ${receiptToothPoints})`;

const statusLabels: Record<ReceiptPrinterStage, string> = {
  processing: "Procesando tu pedido",
  printing: "Imprimiendo tu recibo",
  complete: "Pedido completado",
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

function useReceiptPrinter(component: string) {
  const context = useContext(ReceiptPrinterContext);
  if (!context) {
    throw new Error(`${component} must be used inside ReceiptPrinter.Root.`);
  }
  return context;
}

function ReceiptPrinterRoot({
  "aria-label": ariaLabel = "Impresora de recibo",
  animate = true,
  children,
  className,
  feedMotion = "stepped",
  stage,
  ...props
}: ReceiptPrinterRootProps) {
  const shouldReduceMotion = usePrefersReducedMotion();
  const shouldMove = animate && !shouldReduceMotion;
  const context = {
    animate,
    feedMotion,
    shouldMove,
    stage,
  };

  return (
    <ReceiptPrinterContext.Provider value={context}>
      <section
        aria-label={ariaLabel}
        className={cn(
          "receipt-printer relative isolate flex w-full max-w-sm flex-col items-center",
          className
        )}
        data-feed={feedMotion}
        data-move={shouldMove ? "true" : "false"}
        data-stage={stage}
        {...props}
      >
        {children}
      </section>
    </ReceiptPrinterContext.Provider>
  );
}

function ReceiptPrinterMachine({
  children,
  className,
  ...props
}: ReceiptPrinterMachineProps) {
  return (
    <div
      className={cn(
        "relative isolate w-full overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#161616] p-3 pb-8 shadow-[0_18px_32px_-18px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.08)] [--printer-inner-radius:1rem] before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-[inherit] before:bg-[radial-gradient(rgba(255,255,255,0.05)_0.6px,transparent_0.6px)] before:bg-[length:3px_3px] before:opacity-40 before:content-['']",
        className
      )}
      {...props}
    >
      {children}
      <div
        aria-hidden="true"
        className="absolute inset-x-6 bottom-3 z-40 h-2 rounded-[0.25rem] border border-black/80 bg-[#0A0A0A] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"
      />
    </div>
  );
}

function ReceiptPrinterHeader({
  children,
  className,
  ...props
}: ReceiptPrinterHeaderProps) {
  return (
    <div
      className={cn(
        "relative z-10 flex h-11 items-start justify-between",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function ReceiptPrinterScreen({
  children,
  className,
  ...props
}: ReceiptPrinterScreenProps) {
  return (
    <div
      className={cn(
        "relative z-10 isolate overflow-hidden rounded-[var(--printer-inner-radius)] border border-[#5B8DEF]/35 bg-[#0B1220] p-4 text-white shadow-[inset_0_0_24px_4px_rgba(11,18,32,0.85)] after:pointer-events-none after:absolute after:inset-0 after:z-20 after:rounded-[inherit] after:shadow-[inset_0_0_18px_3px_rgba(91,141,239,0.12)] after:content-['']",
        className
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function StatusIndicator({
  animate,
  stage,
}: {
  animate: boolean;
  stage: ReceiptPrinterStage;
}) {
  const isComplete = stage === "complete";

  return (
    <span
      aria-hidden="true"
      className="relative grid size-5 shrink-0 place-items-center"
    >
      {isComplete ? (
        <span
          className="receipt-status-icon col-start-1 row-start-1 grid place-items-center text-emerald-400"
          key="complete"
        >
          <CheckCircle2 className="size-[18px]" strokeWidth={2.2} />
        </span>
      ) : (
        <span
          className="receipt-status-icon col-start-1 row-start-1 grid place-items-center text-[#7BA3E8]"
          key="working"
        >
          <Loader2
            className={cn(
              "size-[18px]",
              animate && "animate-spin motion-reduce:animate-none"
            )}
            strokeWidth={2.2}
          />
        </span>
      )}
    </span>
  );
}

function ReceiptPrinterStatus({
  children,
  className,
  ...props
}: ReceiptPrinterStatusProps) {
  const { animate, stage } = useReceiptPrinter("ReceiptPrinter.Status");

  return (
    <div
      className={cn("flex min-w-0 items-center gap-2", className)}
      {...props}
    >
      <StatusIndicator animate={animate} stage={stage} />
      <div
        aria-live="polite"
        className="grid min-w-0 flex-1 items-center"
        role="status"
      >
        <div
          className="receipt-status-copy col-start-1 row-start-1 truncate font-medium text-xs leading-none text-white/70"
          key={stage}
        >
          {children ?? statusLabels[stage]}
        </div>
      </div>
    </div>
  );
}

function ReceiptPrinterPaper({
  children,
  className,
  style,
  ...props
}: ReceiptPrinterPaperProps) {
  return (
    <article
      className={cn(
        "relative z-10 min-h-80 bg-[#F3F1EC] bg-[radial-gradient(rgba(20,20,20,0.035)_0.7px,transparent_0.7px)] bg-[length:4px_4px] px-6 pt-7 pb-8 font-mono text-[#161616]",
        className
      )}
      style={{
        clipPath: receiptClipPath,
        WebkitClipPath: receiptClipPath,
        ...style,
      }}
      {...props}
    >
      {children}
    </article>
  );
}

function ReceiptPrinterOutput({
  children,
  className,
  ...props
}: ReceiptPrinterOutputProps) {
  const { stage } = useReceiptPrinter("ReceiptPrinter.Output");
  const isReceiptVisible = stage !== "processing";

  return (
    <div
      className={cn(
        "receipt-output relative z-50 -mt-4 h-5 w-[calc(80%+3rem)] max-w-full overflow-hidden px-6",
        className
      )}
      {...props}
    >
      {isReceiptVisible ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 -top-1 z-20 h-2 bg-black/50 blur-[6px]"
        />
      ) : null}

      <div
        aria-hidden={stage !== "complete"}
        className="receipt-output-sheet relative isolate before:pointer-events-none before:absolute before:inset-x-3 before:top-3 before:bottom-4 before:z-0 before:rounded-sm before:shadow-[0_8px_24px_rgba(0,0,0,0.28)] before:content-[''] after:pointer-events-none after:absolute after:right-[8%] after:bottom-0 after:left-[8%] after:z-0 after:h-3 after:translate-y-1.5 after:rounded-full after:bg-black/20 after:blur-lg after:content-['']"
      >
        {children}
      </div>
    </div>
  );
}

export const ReceiptPrinter = {
  Header: ReceiptPrinterHeader,
  Machine: ReceiptPrinterMachine,
  Output: ReceiptPrinterOutput,
  Paper: ReceiptPrinterPaper,
  Root: ReceiptPrinterRoot,
  Screen: ReceiptPrinterScreen,
  Status: ReceiptPrinterStatus,
};
