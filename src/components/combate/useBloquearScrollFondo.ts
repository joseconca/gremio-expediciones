"use client";

import { useEffect } from "react";

/** Evita el desplazamiento de la página al abrir una batalla y restaura el scroll al desmontar. */
export function useBloquearScrollFondo(): void {
    useEffect(() => {
      const scrollY = window.scrollY;
      const body = document.body;
      const html = document.documentElement;

      const bodyOverflow = body.style.overflow;
      const bodyPosition = body.style.position;
      const bodyTop = body.style.top;
      const bodyWidth = body.style.width;
      const htmlOverflow = html.style.overflow;

      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.top = `-${scrollY}px`;
      body.style.width = "100%";
      html.style.overflow = "hidden";

      return () => {
        body.style.overflow = bodyOverflow;
        body.style.position = bodyPosition;
        body.style.top = bodyTop;
        body.style.width = bodyWidth;
        html.style.overflow = htmlOverflow;
        window.scrollTo(0, scrollY);
      };
    }, []);
}
