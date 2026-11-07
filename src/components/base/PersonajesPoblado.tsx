import { useEffect, useRef } from "react";
import SpriteHeroeAnimado from "@/components/combate/SpriteHeroeAnimado";
import { dibujarSenda, type trazarPoblado } from "./plano-poblado";
import styles from "./PanelEdificios.module.css";

export interface HabitantePoblado {
  id: string;
  nombre: string;
  clase?: string | null;
  sexo?: string | null;
  profesionActivaId?: string | null;
}

type Plano = ReturnType<typeof trazarPoblado>;

function rutaEntreEdificios(plano: Plano, origen: number, destino: number) {
  const edificioDestino = plano.parcelas[destino];
  if (!edificioDestino) return "";

  const edificioOrigen = plano.parcelas[origen];
  const caminoCentral = plano.caminos[0].slice(origen + 2, destino + 3);
  return [
    edificioOrigen && dibujarSenda([...edificioOrigen.acceso].reverse(), false),
    dibujarSenda(caminoCentral, true),
    dibujarSenda(edificioDestino.acceso, false),
  ].filter(Boolean).join(" ");
}

function Habitante({ personaje, ancho, x, y, ruta = "", fase = 0, soloDeDia = false }: {
  personaje: HabitantePoblado;
  ancho: number;
  x: number;
  y: number;
  ruta?: string;
  fase?: number;
  soloDeDia?: boolean;
}) {
  const figura = useRef<HTMLDivElement>(null);
  const cuerpo = useRef<HTMLDivElement>(null);
  const sendero = useRef<SVGPathElement>(null);

  useEffect(() => {
    const actor = figura.current;
    const sprite = cuerpo.current;
    const camino = sendero.current;
    if (!actor || !sprite || !camino) return;

    const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animaciones: Animation[] = [];
    function iniciar() {
      animaciones.forEach((animacion) => animacion.cancel());
      if (movimientoReducido.matches || !actor || !sprite || !camino) return;

      const longitud = camino.getTotalLength();
      const puntos = Array.from({ length: 41 }, (_, indice) => camino.getPointAtLength(longitud * indice / 40));
      const vuelta = [...puntos, ...puntos.slice(0, -1).reverse()];
      const escala = (actor.parentElement?.clientWidth ?? ancho) / ancho;
      const distancia = puntos.slice(1).reduce((total, punto, indice) =>
        total + Math.hypot((punto.x - puntos[indice].x) * escala, punto.y - puntos[indice].y), 0);
      const duracion = Math.max(5000, distancia * 36) * 2;
      const opciones = { duration: duracion, iterations: Infinity, delay: -duracion * fase };
      let orientacion = 1;

      animaciones = [
        actor.animate(vuelta.map((punto) => ({ left: `${punto.x * 100 / ancho}%`, top: `${punto.y}px` })), opciones),
        sprite.animate(vuelta.map((punto, indice) => {
          const siguiente = vuelta[indice + 1] ?? vuelta[1];
          const diferencia = siguiente.x - punto.x;
          if (diferencia) orientacion = Math.sign(diferencia);
          return { transform: `scaleX(${orientacion})`, easing: "steps(1, end)" };
        }), opciones),
      ];
    }

    iniciar();
    movimientoReducido.addEventListener("change", iniciar);
    return () => {
      animaciones.forEach((animacion) => animacion.cancel());
      movimientoReducido.removeEventListener("change", iniciar);
    };
  }, [ancho, fase, ruta]);

  return (
    <>
      {ruta && <svg width="0" height="0" className={styles.rutaHabitante}><path ref={sendero} d={ruta} /></svg>}
      <div
        ref={figura}
        className={`${styles.habitante} ${soloDeDia ? styles.habitanteDiurno : ""}`}
        data-habitante={personaje.id}
        style={{ left: `${x * 100 / ancho}%`, top: y }}
      >
        {!ruta && personaje.id !== "guardia" && <span className={styles.nombreHabitante}>{personaje.nombre}</span>}
        <div ref={cuerpo} className={styles.cuerpoHabitante}>
          <SpriteHeroeAnimado {...personaje} accion={ruta ? "walk" : "idle"} />
        </div>
      </div>
    </>
  );
}

export default function PersonajesPoblado({ plano, aventureros }: { plano: Plano; aventureros: HabitantePoblado[] }) {
  const cantidad = plano.parcelas.length;
  const centro = plano.ancho / 2;
  return (
    <div className={styles.habitantes} aria-hidden="true" data-world-layer="inhabitants">
      <Habitante personaje={{ id: "guardia", nombre: "Guardia", clase: "caballero" }} ancho={plano.ancho}
        x={centro} y={100} ruta={rutaEntreEdificios(plano, -1, 0)} fase={0.16} />
      {cantidad > 0 && (
        <Habitante personaje={{ id: "mercader", nombre: "Mercader", clase: "comerciante" }} ancho={plano.ancho}
          x={plano.parcelas[0].cruce.x - 65} y={plano.parcelas[0].cruce.y} soloDeDia
          ruta={rutaEntreEdificios(plano, cantidad > 1 ? 0 : -1, Math.min(1, cantidad - 1))} fase={0.63} />
      )}
      {cantidad > 2 && (
        <Habitante personaje={{ id: "vecina", nombre: "Vecina", clase: "comerciante", sexo: "chica" }} ancho={plano.ancho}
          x={plano.parcelas[2].cruce.x - 65} y={plano.parcelas[2].cruce.y} soloDeDia
          ruta={rutaEntreEdificios(plano, 1, 2)} fase={0.41} />
      )}
      {aventureros.map((personaje, indice) => (
        <Habitante key={personaje.id} personaje={personaje} ancho={plano.ancho}
          x={centro + (indice % 2 === 0 ? -92 : 92)} y={48 + indice * 28} />
      ))}
    </div>
  );
}
