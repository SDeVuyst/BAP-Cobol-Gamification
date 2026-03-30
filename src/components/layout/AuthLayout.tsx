import type { ReactNode } from "react";
import { MainframeStrip } from "@/components/mainframe/MainframeStrip";

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#060608] text-slate-200">
      <div className="mainframe-glow-soft-tl" />
      <div className="mainframe-glow-soft-br" />

      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12 sm:max-w-none sm:py-16">
        <div className="mx-auto mb-10 flex w-full max-w-md flex-col items-center gap-4 text-center">
          <img
            src="/logo.png"
            alt="Learn Cobol logo"
            className="h-16 w-16 shrink-0 select-none sm:h-20 sm:w-20"
            draggable={false}
          />
          <div>
            <p className="mb-1 font-mono text-[10px] text-slate-500 md:text-xs">* AUTH - ENVIRONMENT DIVISION *</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">Learn Cobol</h1>
          </div>
        </div>

        <div className="mainframe-panel-muted mainframe-card-l-sky mx-auto w-full max-w-md overflow-hidden">
          <MainframeStrip variant="muted" left="PROCEDURE DIVISION" right="AUTH" />
          <div className="p-6 sm:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
