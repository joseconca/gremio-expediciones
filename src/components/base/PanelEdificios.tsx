import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { CONFIGURACION_EDIFICIOS, type Edificio, type IdEdificio } from "@/lib/base/edificios";
import { trazarPoblado } from "./plano-poblado";
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
}

export default function PanelEdificios({ edificios }: PanelEdificiosProps) {
  const plano = trazarPoblado(edificios);
  const camino = plano.caminos
    .map((puntos) => `M ${puntos.map(({ x, y }) => `${x} ${y}`).join(" L ")}`)
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
            <path d={camino} className={styles.bordeCamino} vectorEffect="non-scaling-stroke" />
            <path d={camino} className={styles.senda} vectorEffect="non-scaling-stroke" />
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
        </div>
      ) : (
        <div className={styles.vacio}>
          <p>La plaza aún está vacía</p>
          <p>Construye tu primera instalación para dar vida al poblado.</p>
        </div>
      )}
    </section>
  );
}
