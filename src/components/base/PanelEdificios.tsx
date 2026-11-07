import Image from "next/image";
import Link from "next/link";
import { useId, type CSSProperties } from "react";
import { CONFIGURACION_EDIFICIOS, type Edificio, type IdEdificio } from "@/lib/base/edificios";
import { dibujarSenda, trazarPoblado } from "./plano-poblado";
import PersonajesPoblado, { type HabitantePoblado } from "./PersonajesPoblado";
import styles from "./PanelEdificios.module.css";

// Posición de la puerta (en píxeles) dentro de cada sprite de 128 × 64.
const PUERTAS: Partial<Record<IdEdificio | "armeria-herreria", readonly [number, number]>> = {
  taberna: [71, 52],
  armeria: [64, 46],
  "armeria-herreria": [59, 47],
  herreria: [64, 46],
  mercado: [61, 50],
  botica: [79, 56],
  escuelaCombate: [64, 48],
  embajada: [65, 48],
  almacen: [40, 47],
};

interface PanelEdificiosProps {
  edificios: Edificio[];
  aventureros?: HabitantePoblado[];
}

export default function PanelEdificios({ edificios, aventureros = [] }: PanelEdificiosProps) {
  const idSenda = useId();
  const plano = trazarPoblado(edificios);
  const camino = plano.caminos
    .map((puntos, indice) => dibujarSenda(puntos, indice === 0))
    .join(" ");

  return (
    <section aria-label="Poblado del campamento" data-town-scene="campamento" className={styles.escena}>
      {plano.parcelas.length > 0 ? (
        <div className={styles.mapa} style={{ height: plano.alto }}>
          <svg
            className={styles.caminos}
            data-world-layer="paths"
            viewBox={`0 0 ${plano.ancho} ${plano.alto}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <path d={camino} id={`${idSenda}-trazado`} vectorEffect="non-scaling-stroke" />
              <pattern id={`${idSenda}-textura`} width="112" height="76" patternUnits="userSpaceOnUse">
                <image href="/sprites/buildings/textura-senda.svg" width="112" height="76" />
              </pattern>
              <filter id={`${idSenda}-borde`} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.18 0.27" numOctaves="2" seed="16" result="grano" />
                <feDisplacementMap in="SourceGraphic" in2="grano" scale="12" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
            <g filter={`url(#${idSenda}-borde)`}>
              <use href={`#${idSenda}-trazado`} className={styles.verge} />
              <use href={`#${idSenda}-trazado`} className={styles.bordeCamino} />
              <use href={`#${idSenda}-trazado`} className={styles.senda} />
            </g>
            <use href={`#${idSenda}-trazado`} className={styles.granoSenda} stroke={`url(#${idSenda}-textura)`} />
          </svg>

          <ul className={styles.edificios} aria-label="Edificios construidos">
            {plano.parcelas.map(({ edificio, herreria, entrada }) => {
              const sprite = herreria ? "armeria-herreria" : edificio.id;
              const rutaSprite = `/sprites/buildings/${sprite}.png`;
              const accesos = herreria ? [edificio, herreria] : [edificio];
              const [puertaX, puertaY] = PUERTAS[sprite] ?? [64, 48];

              return (
                <li
                  className={styles.parcela}
                  key={edificio.id}
                  data-world-layer="building"
                  data-edificio={edificio.id}
                  style={{
                    top: entrada.y,
                    "--entrada-x": `${entrada.x * 100 / plano.ancho}%`,
                    "--sprite-x": puertaX / 128,
                    "--sprite-y": `${puertaY * -100 / 64}%`,
                  } as CSSProperties}
                >
                  <span className={styles.sombra} aria-hidden="true" />
                  <Image
                    className={styles.sombraProyectada}
                    data-world-layer="shadow"
                    src={rutaSprite}
                    alt=""
                    width={128}
                    height={64}
                    unoptimized
                  />
                  <Image
                    className={styles.sprite}
                    src={rutaSprite}
                    alt=""
                    width={128}
                    height={64}
                    unoptimized
                  />
                  <div className={styles.accesos}>
                    {accesos.map(({ id, nombre, descripcion }) => (
                      <Link
                        key={id}
                        href={CONFIGURACION_EDIFICIOS[id].ruta}
                        className={styles.acceso}
                        aria-label={`Entrar en ${nombre}`}
                        title={descripcion}
                      >
                        <span className={styles.rotulo}>{nombre}</span>
                      </Link>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
          <PersonajesPoblado plano={plano} aventureros={aventureros} />
        </div>
      ) : (
        <div className={styles.vacio}>
          <p>La plaza aún está vacía</p>
          <p>Construye tu primera instalación para dar vida al poblado.</p>
          <div className={styles.plazaVacia}>
            <PersonajesPoblado plano={plano} aventureros={aventureros} />
          </div>
        </div>
      )}
    </section>
  );
}
