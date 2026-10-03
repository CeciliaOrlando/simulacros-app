"use client";

import { useEffect, useId } from "react";

export function Modal({
  titulo,
  onCerrar,
  children,
  ancho = "md",
}: {
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
  ancho?: "md" | "xl";
}) {
  const idTitulo = useId();

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alPresionar);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alPresionar);
      document.body.style.overflow = overflowPrevio;
    };
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className={`flex max-h-[92vh] w-full flex-col rounded-t-xl bg-white shadow-xl sm:rounded-xl ${
          ancho === "xl" ? "sm:max-w-5xl" : "sm:max-w-lg"
        }`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <h2 id={idTitulo} className="text-lg font-semibold text-gray-900">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
