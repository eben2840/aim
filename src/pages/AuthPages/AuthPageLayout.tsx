import logoLight from "../../aseets/logo/2.png";
import logoDark from "../../aseets/logo/1.png";
import React from "react";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-900">
      {/* Left — form */}
      <div className="flex flex-col flex-1 relative">
        {children}
      </div>

      {/* Right — branding panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col items-center justify-center bg-brand-950 dark:bg-white/5 relative overflow-hidden px-12">
        {/* Grid decoration */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          <img src={logoDark} alt="AbiTrack" className="h-5 w-auto sm:h-6 mb-8" />
          <h2 className="text-2xl font-bold text-white mb-4">
            Inventory Management Built for Modern Business
          </h2>
          <p className="text-brand-200 text-sm leading-relaxed mb-8">
            Track stock, manage orders, and get low-stock alerts — all in one place.
            Upload invoices and let OCR do the rest.
          </p>
          {/* Feature bullets */}
          <ul className="space-y-3 text-left w-full">
            {[
              "Real-time stock across multiple locations",
              "Purchase & sales order management",
              "OCR receipt upload → auto stock update",
              "Low-stock alerts with reorder suggestions",
              "Full REST API for integrations",
            ].map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-brand-100">
                <svg className="w-5 h-5 mt-0.5 text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Theme toggler */}
      <div className="fixed z-50 bottom-6 right-6">
        <ThemeTogglerTwo />
      </div>
    </div>
  );
}
