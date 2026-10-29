/**
 * Reglas puras de las identidades. No conoce Prisma, HTTP ni el tamaño de party.
 * El adaptador entrega todos los participantes y persiste el resultado de forma
 * atómica junto con la versión del combate. Un turno extra no crea otro ciclo.
 */
export type ElementoTactico = "fisico" | "arcano" | "fuego" | "hielo" | "agua" | "rayo" | "sagrado" | "naturaleza" | "sombras";
export type FamiliaTactica = "marca" | "preparacion" | "guardia" | "herida" | "regeneracion" | "sello" | "vinculo" | "campo" | "acompanante" | "pacto" | "exposicion" | "precision" | "resistencia";
export type EstadoTactico = {
  id: string;
  fuenteId: string;
  creadorId: string;
  familia: FamiliaTactica;
  clave: string;
  valor: number;
  restantes: number;
  reloj: "turno" | "ciclo";
  cargas: number;
  elemento?: ElementoTactico;
  destinatarioId?: string;
  mantenimientoMana?: number;
  finalNatural?: boolean;
  manual?: boolean;
};

export type UnidadTactica = {
  id: string;
  equipo: "aliado" | "enemigo";
  claseId?: string;
  hp: number;
  hpMaximo: number;
  energia: number;
  energiaMaxima: number;
  mana: number;
  manaMaximo: number;
  ataque: number;
  ataqueMagico: number;
  defensa: number;
  defensaMagica: number;
  fila: number;
  columna: number;
  estados: EstadoTactico[];
  /** Exclusivamente límites por ciclo; nunca capacidades concedidas por clase. */
  limites: Record<string, number>;
};

export type EventoTactico = {
  tipo: "dano" | "cura" | "proteccion" | "estado" | "consumo" | "recurso" | "interrupcion" | "retirada";
  actorId: string;
  objetivoId: string;
  fuenteId: string;
  cantidad: number;
  detalle?: string;
};

export type MundoTactico = { version: 2; ciclo: number; unidades: UnidadTactica[]; eventos: EventoTactico[] };

export type TecnicaTactica = {
  id: string;
  claseId: string;
  nombre: string;
  costeEnergia: number;
  costeMana: number;
  cooldown: number;
  objetivo: "enemigo" | "aliado" | "propio";
  alcance: "individual" | "fila" | "todos";
  /** El presupuesto es total incluso si hay nueve destinatarios. */
  dano?: { multiplicador: number; tipo: "fisico" | "magico" | "hibrido" };
  cura?: number;
  comandos: readonly ComandoTactico[];
};

export type ComandoTactico =
  | { tipo: "estado"; objetivo: "actor" | "objetivo"; familia: FamiliaTactica; clave: string; valor: number; duracion: number; cargas?: number; reloj?: "turno" | "ciclo"; elemento?: ElementoTactico }
  | { tipo: "consumir"; objetivo: "actor" | "objetivo"; clave: string; maximo?: number }
  | { tipo: "adelantar"; familia: "herida" | "regeneracion"; objetivo: "actor" | "objetivo" }
  | { tipo: "limpiar"; objetivo: "actor" | "objetivo"; familia?: FamiliaTactica; maximo: number }
  | { tipo: "robar"; familia: "guardia" | "precision" | "resistencia"; fraccion: number }
  | { tipo: "transferir"; familia: "regeneracion" | "guardia"; fraccion: number }
  | { tipo: "invocar"; clave: string; potencia: number; duracion: number; mantenimiento: number; manual?: boolean }
  | { tipo: "ordenar"; modo: "asalto" | "amparo" }
  | { tipo: "sacrificar"; familia: "acompanante" | "guardia" | "herida" | "pacto" | "campo" | "preparacion"; fraccion: number; resultado?: "cura_actor" }
  | { tipo: "interrumpir"; debilitamiento: number }
  | { tipo: "mover"; fila: number }
  | { tipo: "reaccion"; elemento: ElementoTactico }
  | { tipo: "vincular"; clave: string; duracion: number }
  | { tipo: "pacto"; fraccionVida: number; duracion: number }
  | { tipo: "circuito"; maximo: number }
  | { tipo: "recurso"; recurso: "energia" | "mana"; cantidad: number; devolucion?: boolean };

const finito = (n: number, minimo = 0, maximo = Number.MAX_SAFE_INTEGER) => Number.isFinite(n) ? Math.max(minimo, Math.min(maximo, n)) : minimo;
const entero = (n: number, minimo = 0, maximo = Number.MAX_SAFE_INTEGER) => Math.floor(finito(n, minimo, maximo));

export function clonarMundoTactico(mundo: MundoTactico): MundoTactico {
  return { version: 2, ciclo: entero(mundo.ciclo), eventos: [], unidades: mundo.unidades.map(u => ({ ...u, estados: u.estados.map(e => ({ ...e })), limites: { ...u.limites } })) };
}

function unidad(mundo: MundoTactico, id: string): UnidadTactica {
  const u = mundo.unidades.find(entrada => entrada.id === id);
  if (!u) throw new Error("OBJETIVO_TACTICO_INEXISTENTE");
  return u;
}

function registrar(mundo: MundoTactico, tipo: EventoTactico["tipo"], actorId: string, objetivoId: string, fuenteId: string, cantidad: number, detalle?: string) {
  mundo.eventos.push({ tipo, actorId, objetivoId, fuenteId, cantidad: entero(cantidad), ...(detalle ? { detalle } : {}) });
}

/** Un efecto débil mantiene únicamente su propia expiración, no extiende al fuerte. */
export function potenciaFamiliaTactica(u: UnidadTactica, familia: FamiliaTactica): number {
  return Math.max(0, ...u.estados.filter(e => e.familia === familia && e.restantes > 0).map(e => e.valor));
}

export function aplicarEstadoTactico(mundo: MundoTactico, objetivoId: string, estado: EstadoTactico): void {
  const u = unidad(mundo, objetivoId);
  if (u.hp <= 0) return;
  const seguro: EstadoTactico = { ...estado, valor: finito(estado.valor), restantes: entero(estado.restantes, 1, 20), cargas: entero(estado.cargas, 1, estado.familia==="acompanante"?3:2) };
  const creador=mundo.unidades.find(o=>o.id===estado.creadorId);
  if(creador&&creador.equipo!==u.equipo&&["herida","exposicion","precision","marca","sello"].includes(estado.familia)){
    const resistencia=u.estados.filter(e=>e.familia==="resistencia").sort((a,b)=>b.valor-a.valor)[0];
    if(resistencia){seguro.valor*=1-Math.min(.3,resistencia.valor);u.estados=u.estados.filter(e=>e!==resistencia);}
  }
  u.estados = u.estados.filter(e => !(e.creadorId === seguro.creadorId && e.clave === seguro.clave && e.familia === seguro.familia));
  u.estados.push(seguro);
  registrar(mundo, "estado", estado.creadorId, objetivoId, estado.fuenteId, seguro.valor, estado.clave);
}

export function curarTactico(mundo: MundoTactico, actorId: string, objetivoId: string, fuenteId: string, cantidad: number): { efectiva: number; exceso: number } {
  const u = unidad(mundo, objetivoId);
  if (u.hp <= 0) return { efectiva: 0, exceso: 0 };
  const solicitada = entero(cantidad);
  const efectiva = Math.min(solicitada, Math.max(0, u.hpMaximo - u.hp));
  u.hp += efectiva;
  registrar(mundo, "cura", actorId, objetivoId, fuenteId, efectiva);
  return { efectiva, exceso: solicitada - efectiva };
}

/** Sin redirecciones recursivas. El daño periódico no consume protección directa. */
export function danarTactico(mundo: MundoTactico, actorId: string, objetivoId: string, fuenteId: string, cantidad: number, periodico = false): number {
  const objetivo = unidad(mundo, objetivoId);
  if (objetivo.hp <= 0) return 0;
  let dano = entero(cantidad);
  if (!periodico && dano > 0) {
    const guardias=objetivo.estados.filter(e=>e.familia==="guardia"&&e.restantes>0);
    const guardia = guardias.sort((a,b) => b.valor - a.valor)[0];
    if (guardia) {
      const absorbido = Math.min(dano, entero(guardia.valor));
      for(const e of guardias)e.valor=Math.max(0,e.valor-absorbido);
      dano -= absorbido;
      objetivo.estados = objetivo.estados.filter(e => e.familia!=="guardia"||e.valor>0);
      registrar(mundo, "proteccion", guardia.creadorId, objetivoId, guardia.fuenteId, absorbido);
    }
    const vinculo = objetivo.estados.find(e => e.familia === "vinculo" && e.clave === "custodia");
    const protector = vinculo ? mundo.unidades.find(u => u.id === vinculo.creadorId && u.hp > 0 && u.id !== objetivoId && u.equipo === objetivo.equipo) : undefined;
    if (protector && protector.limites.intercepcion !== mundo.ciclo) {
      const redirigido = Math.min(dano, Math.floor(dano * 0.3), protector.hp);
      protector.limites.intercepcion = mundo.ciclo;
      protector.hp -= redirigido;
      dano -= redirigido;
      registrar(mundo, "dano", actorId, protector.id, fuenteId, redirigido, "intercepcion");
    }
  }
  const efectivo = Math.min(objetivo.hp, dano);
  objetivo.hp -= efectivo;
  registrar(mundo, "dano", actorId, objetivoId, fuenteId, efectivo, periodico ? "periodico" : "directo");
  return efectivo;
}

/** El área distribuye un único presupuesto. El orden de entrada no crea potencia. */
export function repartirPresupuestoTactico(total: number, ids: readonly string[]): Record<string, number> {
  const unicos = [...new Set(ids)].sort();
  if (unicos.length === 0) return {};
  const presupuesto = entero(total);
  const base = Math.floor(presupuesto / unicos.length);
  const sobrante = presupuesto % unicos.length;
  return Object.fromEntries(unicos.map((id, indice) => [id, base + (indice < sobrante ? 1 : 0)]));
}

export function devolverRecursoTactico(mundo: MundoTactico, actorId: string, fuenteId: string, recurso: "energia" | "mana", solicitado: number, pagado: number, pagoId = fuenteId): number {
  const u = unidad(mundo, actorId);
  const clave = `devolucion:${recurso}`;
  const reloj = `${clave}:ciclo`;
  if (u.limites[reloj] !== mundo.ciclo) { u.limites[reloj] = mundo.ciclo; u.limites[clave] = 0; }
  const tope = recurso === "energia" ? 10 : 5;
  const maximo = recurso === "energia" ? u.energiaMaxima : u.manaMaximo;
  const pago = `pago:${mundo.ciclo}:${pagoId}:${recurso}`;
  const recuperado = Math.min(entero(solicitado), Math.max(0, entero(pagado * 0.25) - (u.limites[pago] ?? 0)), Math.max(0, tope - (u.limites[clave] ?? 0)), Math.max(0, maximo - u[recurso]));
  u[recurso] += recuperado;
  u.limites[clave] = (u.limites[clave] ?? 0) + recuperado;
  u.limites[pago] = (u.limites[pago] ?? 0) + recuperado;
  registrar(mundo, "recurso", actorId, actorId, fuenteId, recuperado, recurso);
  return recuperado;
}

export function adelantarPulsoTactico(mundo: MundoTactico, actorId: string, objetivoId: string, fuenteId: string, familia: "herida" | "regeneracion"): number {
  const objetivo = unidad(mundo, objetivoId);
  const efecto = objetivo.estados.find(e => e.familia === familia && e.creadorId === actorId && e.restantes > 0);
  if (!efecto) return 0;
  const cantidad = familia === "herida"
    ? danarTactico(mundo, actorId, objetivoId, fuenteId, efecto.valor, true)
    : curarTactico(mundo, actorId, objetivoId, fuenteId, efecto.valor).efectiva;
  efecto.restantes--;
  objetivo.estados = objetivo.estados.filter(e => e.restantes > 0);
  return cantidad;
}

function quitarEstado(mundo: MundoTactico, propietario: UnidadTactica, efecto: EstadoTactico, fuenteId: string) {
  propietario.estados = propietario.estados.filter(e => e !== efecto);
  registrar(mundo, "consumo", efecto.creadorId, propietario.id, fuenteId, efecto.valor, efecto.clave);
}

/** Ejecuta instrucciones explícitas; nunca deduce una mecánica del texto o nombre. */
export function ejecutarComandosTacticos(mundo: MundoTactico, actorId: string, objetivoId: string, fuenteId: string, comandos: readonly ComandoTactico[]): void {
  const actor = unidad(mundo, actorId);
  const objetivo = unidad(mundo, objetivoId);
  if (actor.hp <= 0) return;
  for (const c of comandos) {
    switch (c.tipo) {
      case "estado": {
        const destino = c.objetivo === "actor" ? actor : objetivo;
        aplicarEstadoTactico(mundo, destino.id, { id: `${actorId}:${fuenteId}:${c.clave}`, creadorId: actorId, fuenteId, familia: c.familia, clave: c.clave, valor: c.valor, restantes: c.duracion, reloj: c.reloj ?? "turno", cargas: c.cargas ?? 1, ...(c.elemento ? { elemento: c.elemento } : {}) });
        break;
      }
      case "consumir": {
        const destino = c.objetivo === "actor" ? actor : objetivo;
        const e = destino.estados.find(e => e.creadorId === actorId && e.clave === c.clave);
        if (e) { e.cargas -= entero(c.maximo ?? 1, 1, 2); if (e.cargas <= 0) quitarEstado(mundo, destino, e, fuenteId); }
        break;
      }
      case "adelantar": adelantarPulsoTactico(mundo, actorId, c.objetivo === "actor" ? actorId : objetivoId, fuenteId, c.familia); break;
      case "limpiar": {
        const destino = c.objetivo === "actor" ? actor : objetivo;
        const elegibles = destino.estados.filter(e => c.familia ? e.familia === c.familia : ["herida", "exposicion"].includes(e.familia));
        for (const e of elegibles.slice(0, entero(c.maximo, 1, 2))) quitarEstado(mundo, destino, e, fuenteId);
        break;
      }
      case "robar": {
        const e = objetivo.estados.filter(e => e.familia === c.familia).sort((a,b)=>b.valor-a.valor)[0];
        if (e) {
          quitarEstado(mundo, objetivo, e, fuenteId);
          aplicarEstadoTactico(mundo, actorId, { ...e, id: `${actorId}:${fuenteId}:robo`, creadorId: actorId, fuenteId, valor: e.valor * finito(c.fraccion, 0, 0.5), restantes: Math.min(2, e.restantes) });
        }
        break;
      }
      case "transferir": {
        if (actor.equipo !== objetivo.equipo) break;
        const e = actor.estados.find(e => e.familia === c.familia && e.creadorId === actorId);
        if(actorId===objetivoId){
          if(e){
            const valor=entero(e.valor*.2);e.valor-=valor;
            if(c.familia==="regeneracion")curarTactico(mundo,actorId,actorId,fuenteId,valor*e.restantes);
            else if(valor>0)aplicarEstadoTactico(mundo,actorId,{...e,id:`${actorId}:relevo`,fuenteId,familia:"regeneracion",clave:"relevo_personal",valor:Math.floor(valor/2),restantes:2});
          }
          break;
        }
        if (e) {
          const valor = entero(e.valor * finito(c.fraccion, 0, 1));
          e.valor -= valor;
          if (valor > 0) aplicarEstadoTactico(mundo, objetivoId, { ...e, id: `${actorId}:${fuenteId}:traslado`, fuenteId, valor });
        }
        break;
      }
      case "invocar": {
        // Reemplazar no es morir ni acabar de forma natural.
        actor.estados = actor.estados.filter(e => e.familia !== "acompanante");
        aplicarEstadoTactico(mundo, actorId, { id: `${actorId}:acompanante`, creadorId: actorId, fuenteId, familia: "acompanante", clave: c.clave, valor: c.potencia, restantes: c.duracion, reloj: "ciclo", cargas: 3, mantenimientoMana: entero(c.mantenimiento), destinatarioId: objetivoId,manual:c.manual });
        break;
      }
      case "ordenar": {
        const e = actor.estados.find(e => e.familia === "acompanante");
        if (!e || actor.limites.pulsoAcompanante === mundo.ciclo) break;
        const coste = e.mantenimientoMana ?? 0;
        if (actor.mana < coste) { quitarEstado(mundo,actor,e,fuenteId); break; }
        actor.mana -= coste;
        actor.limites.pulsoAcompanante = mundo.ciclo;
        if (c.modo === "asalto" && actor.equipo !== objetivo.equipo) danarTactico(mundo, actorId, objetivoId, fuenteId, e.valor);
        else if (c.modo === "amparo") aplicarEstadoTactico(mundo, actor.equipo === objetivo.equipo ? objetivoId : actorId, { ...e, id: `${actorId}:amparo`, familia: "guardia", clave: "amparo_familiar", restantes: 1, reloj: "turno", mantenimientoMana: 0, valor: e.valor });
        e.destinatarioId = objetivoId;
        e.cargas--;
        if(e.cargas<=0)quitarEstado(mundo,actor,e,fuenteId);
        break;
      }
      case "sacrificar": {
        const dueno = c.familia === "herida" ? objetivo : actor;
        const e = dueno.estados.find(e => e.familia === c.familia && e.creadorId === actorId);
        if (e) {
          const pulsos = ["herida", "regeneracion", "acompanante", "campo"].includes(e.familia) ? Math.min(3, e.restantes) : 1;
          const calculado=entero(e.valor * pulsos * finito(c.fraccion, 0, 1));
          const presupuesto=["pacto","campo","acompanante"].includes(c.familia)?Math.min(calculado,Math.floor(Math.max(actor.ataque,actor.ataqueMagico)*.65)):calculado;
          quitarEstado(mundo, dueno, e, fuenteId);
          if (c.resultado === "cura_actor") curarTactico(mundo,actorId,actorId,fuenteId,presupuesto);
          else if (actor.equipo !== objetivo.equipo) danarTactico(mundo, actorId, objetivoId, fuenteId, presupuesto);
          else curarTactico(mundo, actorId, objetivoId, fuenteId, presupuesto);
        }
        break;
      }
      case "interrumpir": {
        const e = objetivo.estados.find(e => e.familia === "preparacion");
        const clave = `interrupcion:${actorId}`;
        if (e && objetivo.limites[clave] !== mundo.ciclo) {
          objetivo.limites[clave] = mundo.ciclo;
          e.valor *= 1 - finito(c.debilitamiento, 0, 0.5);
          registrar(mundo, "interrupcion", actorId, objetivoId, fuenteId, e.valor, "preparacion_debilitada");
        }else if(!e)aplicarEstadoTactico(mundo,objetivoId,{id:`${actorId}:distraccion`,creadorId:actorId,fuenteId,familia:"precision",clave:"distraccion",valor:5,restantes:1,reloj:"turno",cargas:1});
        break;
      }
      case "mover": actor.fila = entero(c.fila, 0, 2); break;
      case "reaccion": {
        const anterior = objetivo.estados.find(e => e.clave === "elemento" && e.creadorId === actorId);
        const reloj = `reaccion:${fuenteId}`;
        const compatible=anterior&&(anterior.elemento==="agua"&&(c.elemento==="hielo"||c.elemento==="rayo")||anterior.elemento==="fuego"&&c.elemento==="hielo");
        if (anterior && compatible && actor.limites[reloj] !== mundo.ciclo) {
          actor.limites[reloj] = mundo.ciclo;
          if (anterior.elemento === "agua" && c.elemento === "hielo") ejecutarComandosTacticos(mundo, actorId, objetivoId, fuenteId, [{ tipo: "estado", objetivo: "objetivo", familia: "precision", clave: "escarcha", valor: 10, duracion: 1 }]);
          if (anterior.elemento === "fuego" && c.elemento === "hielo") adelantarPulsoTactico(mundo, actorId, objetivoId, fuenteId, "herida");
          if (anterior.elemento === "agua" && c.elemento === "rayo") {
            const adyacente = mundo.unidades.filter(u => u.equipo === objetivo.equipo && u.hp > 0 && u.id !== objetivoId && u.fila === objetivo.fila && Math.abs(u.columna - objetivo.columna) === 1).sort((a,b)=>a.id.localeCompare(b.id))[0];
            {
              // Se desplaza un pulso pendiente; no se crea otro presupuesto.
              const herida = objetivo.estados.find(e => e.familia === "herida" && e.creadorId === actorId);
              if (herida) { danarTactico(mundo, actorId, adyacente?.id??objetivoId, fuenteId, herida.valor, true); herida.restantes--; objetivo.estados = objetivo.estados.filter(e => e.restantes > 0); }
            }
          }
          quitarEstado(mundo, objetivo, anterior, fuenteId);
        } else aplicarEstadoTactico(mundo, objetivoId, { id: `${actorId}:elemento`, creadorId: actorId, fuenteId, familia: "marca", clave: "elemento", valor: 0, restantes: 2, reloj: "turno", cargas: 1, elemento: c.elemento });
        break;
      }
      case "vincular": {
        for (const u of mundo.unidades) u.estados = u.estados.filter(e => !(e.creadorId === actorId && e.clave === c.clave));
        aplicarEstadoTactico(mundo, objetivoId, { id: `${actorId}:vinculo:${c.clave}`, creadorId: actorId, fuenteId, familia: c.clave==="presa"?"marca":"vinculo", clave: c.clave, valor: 0.3, restantes: c.duracion, reloj: "turno", cargas: 1, destinatarioId: objetivoId });
        break;
      }
      case "pacto": {
        const coste = Math.min(actor.hp - 1, entero(actor.hpMaximo * finito(c.fraccionVida, 0, 0.2)));
        if (coste <= 0) break;
        actor.hp -= coste;
        aplicarEstadoTactico(mundo, actorId, { id: `${actorId}:pacto`, creadorId: actorId, fuenteId, familia: "pacto", clave: "vida_comprometida", valor: coste, restantes: c.duracion, reloj: "turno", cargas: 1 });
        registrar(mundo, "recurso", actorId, actorId, fuenteId, coste, "vida_comprometida");
        break;
      }
      case "circuito": {
        const sellos = mundo.unidades.filter(u => u.equipo === objetivo.equipo && u.hp > 0 && u.fila === objetivo.fila).flatMap(u => u.estados.filter(e => e.familia === "sello" && e.creadorId === actorId).map(e => ({u,e}))).slice(0, entero(c.maximo, 1, 3));
        const total = sellos.reduce((s, {e})=>s+e.valor,0);
        for(const {u,e} of sellos) quitarEstado(mundo,u,e,fuenteId);
        const reparto = repartirPresupuestoTactico(total, sellos.map(({u})=>u.id));
        for(const [id,valor] of Object.entries(reparto)) danarTactico(mundo,actorId,id,fuenteId,valor);
        break;
      }
      case "recurso": {
        if (c.devolucion) break; // Las devoluciones requieren el pago verificado: devolverRecursoTactico.
        const maximo = c.recurso === "energia" ? actor.energiaMaxima : actor.manaMaximo;
        const recuperado = Math.min(entero(c.cantidad), Math.max(0, maximo - actor[c.recurso]));
        actor[c.recurso] += recuperado;
        registrar(mundo, "recurso", actorId, actorId, fuenteId, recuperado, c.recurso);
        break;
      }
    }
  }
}

/** Procesa cada instancia solo en su reloj. Los límites se comparan con el ciclo. */
export function avanzarRelojTactico(mundo: MundoTactico, reloj: "turno" | "ciclo", actorId?: string): void {
  if (reloj === "ciclo") mundo.ciclo++;
  for (const u of mundo.unidades) {
    if (reloj === "ciclo") for (const clave of Object.keys(u.limites)) if (clave.startsWith("pago:")) delete u.limites[clave];
    if (reloj === "turno" && u.id !== actorId) continue;
    for (const e of [...u.estados]) {
      if (e.reloj !== reloj || u.hp <= 0 || !u.estados.includes(e)) continue;
      if (e.familia === "acompanante") {
        const coste = e.mantenimientoMana ?? 0;
        if (u.mana < coste) { quitarEstado(mundo,u,e,e.fuenteId); continue; }
        u.mana -= coste;
        const objetivo = mundo.unidades.find(o => o.id === e.destinatarioId && o.hp > 0 && o.equipo !== u.equipo);
        if (!e.manual && objetivo && u.limites.pulsoAcompanante !== mundo.ciclo) {
          u.limites.pulsoAcompanante = mundo.ciclo;
          danarTactico(mundo,u.id,objetivo.id,e.fuenteId,e.valor);
        }
      }
      if (e.familia === "herida") danarTactico(mundo,e.creadorId,u.id,e.fuenteId,e.valor,true);
      if (e.familia === "regeneracion") curarTactico(mundo,e.creadorId,u.id,e.fuenteId,e.valor);
      e.restantes--;
      if (e.restantes <= 0) {
        e.finalNatural = true;
        quitarEstado(mundo,u,e,e.fuenteId);
      }
    }
  }
}

/**
 * Una única entrada para aplicar una técnica en individual o party. Se valida
 * antes de pagar; el llamante conserva el original si una petición es inválida.
 */
export function resolverTecnicaTactica(original: MundoTactico, actorId: string, objetivoId: string, tecnica: TecnicaTactica): MundoTactico {
  const mundo = clonarMundoTactico(original);
  const actor = unidad(mundo, actorId);
  const objetivo = unidad(mundo, objetivoId);
  if (actor.hp <= 0 || objetivo.hp <= 0) throw new Error("OBJETIVO_TACTICO_CAIDO");
  if (tecnica.objetivo === "propio" && actorId !== objetivoId) throw new Error("OBJETIVO_TACTICO_INVALIDO");
  if (tecnica.objetivo === "aliado" && actor.equipo !== objetivo.equipo) throw new Error("OBJETIVO_TACTICO_INVALIDO");
  if (tecnica.objetivo === "enemigo" && actor.equipo === objetivo.equipo) throw new Error("OBJETIVO_TACTICO_INVALIDO");
  const cd = actor.limites[`cd:${tecnica.id}`] ?? -1;
  if (cd > mundo.ciclo) throw new Error("COOLDOWN_TACTICO_ACTIVO");
  const energia = entero(tecnica.costeEnergia), mana = entero(tecnica.costeMana);
  if (actor.energia < energia || actor.mana < mana) throw new Error("RECURSO_HABILIDAD_INSUFICIENTE");
  actor.energia -= energia; actor.mana -= mana;
  actor.limites[`cd:${tecnica.id}`] = mundo.ciclo + entero(tecnica.cooldown);
  const objetivos = mundo.unidades.filter(u => u.hp > 0 && u.equipo === objetivo.equipo && (tecnica.alcance === "todos" || tecnica.alcance === "fila" && u.fila === objetivo.fila || u.id === objetivoId));
  if (tecnica.dano) {
    const ataque = tecnica.dano.tipo === "fisico" ? actor.ataque : tecnica.dano.tipo === "magico" ? actor.ataqueMagico : (actor.ataque + actor.ataqueMagico) / 2;
    const reparto = repartirPresupuestoTactico(ataque * finito(tecnica.dano.multiplicador, 0, 3), objetivos.map(u=>u.id));
    for (const u of objetivos) {
      const defensa = tecnica.dano.tipo === "fisico" ? u.defensa : tecnica.dano.tipo === "magico" ? u.defensaMagica : (u.defensa + u.defensaMagica) / 2;
      const mitigado = Math.floor(reparto[u.id] * 100 / (100 + finito(defensa)));
      danarTactico(mundo,actorId,u.id,tecnica.id,mitigado);
    }
  }
  if (tecnica.cura) {
    const reparto = repartirPresupuestoTactico(actor.hpMaximo * finito(tecnica.cura, 0, 0.3), objetivos.filter(u=>u.hp < u.hpMaximo).map(u=>u.id));
    for (const [id,cantidad] of Object.entries(reparto)) curarTactico(mundo,actorId,id,tecnica.id,cantidad);
  }
  // Las órdenes, recuperaciones y depósitos se ejecutan una vez por acción,
  // no una vez por cada impacto o cada receptor del área.
  ejecutarComandosTacticos(mundo,actorId,objetivoId,tecnica.id,tecnica.comandos);
  return mundo;
}
