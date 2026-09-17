import { OBJETOS } from "./objetos";
import type { DefinicionObjeto } from "./tiposJuego";

function obtenerFechaDelDia(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Atlantic/Canary",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const anio = partes.find((parte) => parte.type === "year")?.value ?? "";
  const mes = partes.find((parte) => parte.type === "month")?.value ?? "";
  const dia = partes.find((parte) => parte.type === "day")?.value ?? "";

  return `${anio}-${mes}-${dia}`;
}

function crearSemilla(texto: string): number {
  let semilla = 0;

  for (let i = 0; i < texto.length; i += 1) {
    semilla = (semilla * 31 + texto.charCodeAt(i)) >>> 0;
  }

  return semilla;
}

function numeroAleatorioSemilla(semilla: number): number {
  const x = Math.sin(semilla) * 10000;
  return x - Math.floor(x);
}

export function obtenerObjetosEnVenta(): DefinicionObjeto[] {
  const objetosDisponibles = OBJETOS.filter(
    (objeto) => objeto.tipo === "arma" || objeto.tipo === "armadura"
  );

  const fecha = obtenerFechaDelDia();

  return [...objetosDisponibles]
    .map((objeto) => ({
      objeto,
      posicion: numeroAleatorioSemilla(
        crearSemilla(`${fecha}-${objeto.id}`)
      ),
    }))
    .sort((a, b) => a.posicion - b.posicion)
    .slice(0, 2)
    .map(({ objeto }) => objeto);
}

export function obtenerFechaTiendaObjetos(): string {
  return obtenerFechaDelDia();
}