import { Leaf } from "lucide-react";

export default function ModulesFooter() {
  return (
    <footer className="w-full mt-auto py-3.5 sm:py-4 px-4 sm:px-8 lg:px-12 xl:px-14 flex items-center justify-between gap-4 lg:gap-6 overflow-hidden shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <Leaf size={16} className="text-brand shrink-0" />
        <span className="text-[9px] sm:text-[10px] md:text-[11px] font-bold tracking-[0.15em] sm:tracking-[0.25em] text-brand-dark uppercase whitespace-nowrap relative -top-0.25 sm:top-0">
          Agricultura que conecta personas
        </span>
      </div>

      <div className="hidden sm:block flex-1 h-px bg-ink-muted/20 min-w-12.5"></div>

      {/* El aviso legal completo no cabe en móvil; ahí basta la marca */}
      <span className="hidden sm:inline text-[10px] md:text-[11px] font-bold tracking-[0.25em] text-brand-dark uppercase whitespace-nowrap shrink-0">
        Agro Exportaciones F.V.
        <span className="opacity-40 mx-2">|</span>
        Todos los derechos reservados © 2024
      </span>
    </footer>
  );
}
