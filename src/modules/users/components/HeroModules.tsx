import HeroModulesImg from "@/assets/hero_modules.webp";
import HeroPhraseImg from "@/assets/hero_phrase.webp";
import { HERO_CLIP_ID, HERO_EDGE_D } from "@/modules/users/components/WaveClipDefs";
import { Sparkles } from "lucide-react";

/** Ancho de la foto dentro del hero. Lo comparten la foto y la línea decorativa. */
const PHOTO_WIDTH = "67%";

export default function HeroModules() {
  return (
    /* Alto compacto y proporcional: el hero ya no ocupa un alto excesivo fijo
       y cede espacio limpio a la cuadrícula de módulos en cualquier pantalla. */
    <section className="relative w-full shrink-0 overflow-hidden py-5 sm:py-6 lg:h-[165px] xl:h-[185px] lg:py-0">
      {/* Foto. El borde curvo se recorta por CSS (no viene incrustado en el asset),
          así la altura del hero y la forma de la curva se ajustan por separado.
          En móvil se oculta: el recorte curvo y el 67% de ancho dejarían el texto
          ilegible, y el valor de la pantalla está en las tarjetas de módulo. */}
      <div
        className="hidden lg:block absolute inset-y-0 right-0"
        style={{ width: PHOTO_WIDTH, clipPath: `url(#${HERO_CLIP_ID})` }}
      >
        <img
          src={HeroModulesImg}
          alt="Cultivo de palta de Agro Exportaciones F.V."
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Línea decorativa: el mismo borde, corrido 14px a la izquierda. */}
      <svg
        className="hidden lg:block absolute inset-y-0 right-0 h-full z-10 pointer-events-none -translate-x-[14px]"
        style={{ width: PHOTO_WIDTH }}
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={HERO_EDGE_D}
          fill="none"
          stroke="var(--brand)"
          strokeOpacity="0.3"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Lema decorativo a la derecha */}
      <img
        src={HeroPhraseImg}
        alt="Del campo al mundo. Frutas que conectan futuros."
        className="hidden lg:block absolute right-4 top-1/2 -translate-y-1/2 z-10 h-[88%] xl:h-[92%] w-auto object-contain pointer-events-none"
      />

      {/* Columna de textos: ancho suficiente para que el título no se quiebre en 3 líneas */}
      <div className="relative z-20 h-full flex flex-col justify-center px-4 sm:px-8 lg:px-0 lg:pl-12 xl:pl-14 max-w-full lg:max-w-[48%] xl:max-w-[46%]">
        <div className="flex items-center gap-2 mb-1.5 lg:mb-2">
          <Sparkles size={15} className="text-brand shrink-0" strokeWidth={2} />
          <span className="text-[11px] font-medium tracking-[0.15em] sm:text-[13px] sm:tracking-[0.2em] md:text-[14px] md:tracking-[0.25em] xl:text-[15px] uppercase text-ink-muted">
            Bienvenido a tu
          </span>
        </div>

        <h1 className="text-[24px] font-semibold leading-[1.12] tracking-tight text-brand-dark sm:text-3xl lg:text-[32px] xl:text-[36px]">
          <span className="block whitespace-nowrap">Centro de operaciones</span>
          <span className="block text-brand font-medium">Agro F.V.</span>
        </h1>
      </div>
    </section>
  );
}
