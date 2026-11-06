import { velocidadConDanza } from "@/lib/expediciones/combate/danzas-combate";
import {
  aplicarImpactoTier35, cerrarAccionTier35, corteEntrePlanos, prepararCompas, registrarContraofensiva, registrarEsquivaTier35,
} from "@/lib/expediciones/combate/rasgos-tier35";
import {
  multiplicadorCriticoTier3, potenciaRetaguardia, acortarPerjuicioAsceta, aplicarImpactoTier3, cargarLuzGuardia, cerrarAccionTier3, cobrarAlma,
  consumirHuellas, criticoTier3, defensaReducida, esDisparoTier3, expiraPresagio, marcarPresagio,
  golpeConLanza, ponerLineaLanzas, potenciaVigia, precisionHuellas, pulsarRuna, registrarEsquivaTier3,
} from "@/lib/expediciones/combate/rasgos-tier3";
import { anotarProteccionTier3, crearRepresaliaRuptura, curaConsagracion } from "@/lib/expediciones/combate/protecciones-rasgos";
import {
  cerrarAccionHibrida, oroAbordaje, consumirSemillaSilvestre, curacionSemilla, multiplicadorOrden,
  registrarEsquivaHibrida, resolverApoyoHibrido, resolverImpactoHibrido,
} from "@/lib/expediciones/combate/rasgos-hibridos";
import {
  activarContraataque,
  activarDeudaOscura,
  activarSegundoAire,
  actualizarRachaSuperNovato,
  ajustarVidaAscension,
  aplicarAmparo,
  bonosContraObjetivo,
  cerrarRasgoAccion,
  consumirAbsolucion,
  consumirEstribillo,
  consumirNotaAlMargen,
  contarPerjuicios,
  hayMaldicionBrujo,
  limitarGolpeLetal,
  limitarVidaFueraCombate,
  marcarNotaAlMargen,
  multiplicadorAscension,
  multiplicadorAtaqueRasgo,
  multiplicadorDefensaRasgo,
  obtenerClaseRasgo,
  obtenerJobRasgo,
  penetrarResistenciaMagica,
  prepararEstribillo,
  purificarConCura,
  registrarObjetivoRasgo,
  resolverFlechasRasgo,
} from "@/lib/expediciones/combate/rasgos-clase";
import { avanzarSecuenciaTurnosVelocidad, crearSecuenciaTurnosVelocidad, normalizarSecuenciaTurnosVelocidad } from "@/lib/expediciones/combate/iniciativa-combate";
import { adjuntarPulsosEstado } from "./efectos-visualizacion";
import { establecerCooldownHabilidad, reducirCooldowns } from "@/lib/expediciones/combate/cooldowns-habilidades";
import { consumirPrecisionTactica } from "@/lib/expediciones/combate/estados-combate";
import { crearContextoTecnicaTactica } from "@/server/services/combate/contexto-tactico";
import { aplicarBarreraAccion } from "@/lib/expediciones/combate/estados-combate";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { obtenerObjetoPorId } from "@/lib/objetos";
import { obtenerPresentacionAtaqueBasico } from "@/lib/expediciones/presentacion/presentacion-combate";
import { usaAtaqueMagicoBasico } from "@/lib/expediciones/combate/ataque-basico-arma";

import { actualizarCombateVersionado } from "@/server/services/combate/actualizar-combate-versionado";
import { resolverAtaqueJugador, resolverAtaqueEnemigo } from "@/lib/expediciones/combate/ataques-basicos";
import {
  calcularBonusDefensaMuralla,
  type AccionAnimadaCombate,
  resolverHabilidadJugador,
} from "@/lib/expediciones/combate";
import {
  determinarGanadorAsedio,
  finalizarAsedio,
} from "@/lib/expediciones/asedios/asedio";
import {
  calcularAtaqueModificado,
  calcularPrecisionModificada,
  calcularEvasionModificada,
  comenzarTurnoCombatiente,
} from "../../../lib/expediciones/combate/estados-combate";
import { normalizarActorHabilidadDefensor, distribuirEfectosHabilidadPvp } from "@/lib/expediciones/combate/contrato-accion-combate";
import {
  prepararAccionCombate,
  manejarErrorAccionCombate,
  gastarRecursosHabilidad,
  regenerarRecursosPorTurno,
  type ContextoAccionCombate,
} from "./accion-combate";

export async function ejecutarAccionPvp(request: Request) {
  const preparado = await prepararAccionCombate(request, "pvp");
  if (!("contexto" in preparado)) return preparado;
  return ejecutarAccionPvpConContexto(preparado.contexto);
}

export async function ejecutarAccionPvpConContexto(contexto: ContextoAccionCombate) {
  const {
    accion,
    usuario,
    personaje,
    bonusCuracion,
    expedicion,
    combate,
    actor,
    habilidad,
  } = contexto;
  let {
    cooldowns,
    efectos,
    cooldownsDefensor,
    efectosDefensor,
    jugadorHp,
    jugadorDefensa,
    enemigoHp,
    enemigoDefensa,
  } = contexto;
  const { log } = contexto;
  const armaEquipadaId = personaje.equipoEquipado?.arma?.objetoId;
  const subtipoArma = armaEquipadaId ? obtenerObjetoPorId(armaEquipadaId)?.subtipo : undefined;
  const usarAtaqueMagico = usaAtaqueMagicoBasico(subtipoArma);
  let accionAnimada: AccionAnimadaCombate;
  let premioAbordaje = 0;
  let recursosHabilidad = { energia:0,mana:0 };
  let filaActorTactica: number | undefined;
  const contextoTecnicaPvp = (defensor:boolean) => {
    const aliado=habilidad?.objetivo?.equipo!=="enemigo" && habilidad?.efecto!=="dano";
    const atacante={id:combate.atacanteUsuarioId??"atacante",hp:jugadorHp,hpMaximo:combate.jugadorHpMaximo,ataque:combate.jugadorAtaque,ataqueMagico:combate.jugadorAtaqueMagico??combate.jugadorAtaque,defensa:jugadorDefensa,defensaMagica:combate.jugadorDefensaMagica??jugadorDefensa,posicion:combate.jugadorPosicion,efectos};
    const defensa={id:combate.defensorUsuarioId??"defensor",hp:enemigoHp,hpMaximo:combate.enemigoHpMaximo??enemigoHp,ataque:combate.enemigoAtaque,ataqueMagico:combate.enemigoAtaqueMagico??combate.enemigoAtaque,defensa:enemigoDefensa,defensaMagica:combate.enemigoDefensaMagica??enemigoDefensa,posicion:combate.enemigoPosicion,efectos:efectosDefensor};
    const propio=defensor?defensa:atacante;
    return crearContextoTecnicaTactica(personaje,0,propio,aliado?propio:defensor?atacante:defensa,aliado);
  };
  try {
    // PVP
    // ============================================================

    if (!combate.atacanteUsuarioId || !combate.defensorUsuarioId) {
      return NextResponse.json(
        {
          error: "El combate PvP no tiene atacante y defensor válidos.",
        },
        { status: 500 }
      );
    }

    const atacanteUsuarioId = combate.atacanteUsuarioId;

    const defensorUsuarioId = combate.defensorUsuarioId;

    const atacanteEsUsuario = usuario.id === atacanteUsuarioId;

    const defensorEsUsuario = usuario.id === defensorUsuarioId;

    if (!atacanteEsUsuario && !defensorEsUsuario) {
      return NextResponse.json(
        {
          error: "No perteneces a este combate.",
        },
        { status: 403 }
      );
    }

    const rival = await prisma.personaje.findUnique({
      where: { usuarioId: actor === "defensor" ? atacanteUsuarioId : defensorUsuarioId },
      select: { id: true, profesionActivaId: true },
    });
    const clase = obtenerClaseRasgo(personaje);
    const claseRival = rival ? obtenerClaseRasgo(rival) : "";
    const job = obtenerJobRasgo(personaje);
    const esDefensor = actor === "defensor";
    const hpRivalAntes = esDefensor ? jugadorHp : enemigoHp;
    const hpPropioAntes = esDefensor ? enemigoHp : jugadorHp;
    let maximoPropio = esDefensor ? combate.enemigoHpMaximo : combate.jugadorHpMaximo;
    const maximoRival = esDefensor ? combate.jugadorHpMaximo : combate.enemigoHpMaximo;
    const propiosAntes = esDefensor ? efectosDefensor : efectos;
    const perjuiciosAntes = contarPerjuicios(propiosAntes);
    const factorRecursos = multiplicadorAscension(propiosAntes);
    const ajenosAntes = esDefensor ? efectos : efectosDefensor;
    const previosHibridos = ["espadachin_runico", "chaman", "alquimista", "domabestias", "nigromante", "saqueador", "runista", "cazador_espectral"].includes(clase) ? structuredClone(ajenosAntes) : ajenosAntes;
    const defensaRasgo = multiplicadorDefensaRasgo(claseRival, hpRivalAntes, maximoRival, ajenosAntes);
    const idRival = esDefensor ? atacanteUsuarioId : defensorUsuarioId;
    const bono = bonosContraObjetivo(clase, idRival, hpRivalAntes, maximoRival, propiosAntes, job);
    bono.precision += precisionHuellas(propiosAntes, ajenosAntes, clase === "rastreador");
    const corteBasico = corteEntrePlanos(clase, propiosAntes,
      esDefensor ? jugadorDefensa : enemigoDefensa,
      esDefensor ? combate.jugadorDefensaMagica ?? jugadorDefensa : combate.enemigoDefensaMagica ?? enemigoDefensa);
    const danoCriticoBasico = multiplicadorCriticoTier3(clase, propiosAntes, idRival);
    const potenciaContraRival = potenciaRetaguardia(clase, (esDefensor ? combate.jugadorPosicion : combate.enemigoPosicion) === "retaguardia");
    const criticoBasico = criticoTier3(clase, propiosAntes, idRival, esDisparoTier3(null, subtipoArma));
    const defensaFisicaBasica = clase === "verdugo" && defensaReducida(ajenosAntes) && !usarAtaqueMagico ? defensaRasgo * 0.5 : defensaRasgo;
    if (esDefensor) enemigoHp -= habilidad?.costeVidaRasgo ?? 0;
    else jugadorHp -= habilidad?.costeVidaRasgo ?? 0;
    const ataqueRasgo = multiplicadorAtaqueRasgo(clase, hpPropioAntes, maximoPropio, propiosAntes, job) * bono.dano;
    const resistenciaRasgo = (defensa: number) => clase === "mago" ? penetrarResistenciaMagica(defensa * defensaRasgo, job) : defensa * defensaRasgo;

    const basicoAtacante = () => resolverAtaqueJugador({
      efectosEnemigo: efectosDefensor,
      jugadorAtaque: calcularAtaqueModificado(combate.jugadorAtaque, efectos) * ataqueRasgo,
      jugadorAtaqueMagico: calcularAtaqueModificado(combate.jugadorAtaqueMagico ?? combate.jugadorAtaque, efectos, true) * ataqueRasgo,
      usarMejorAtaqueMagico: usarAtaqueMagico,
      danoMagicoDesdeAtaqueFisico: corteBasico,
      multiplicadorDano: multiplicadorOrden(propiosAntes) * potenciaVigia(clase, propiosAntes, esDisparoTier3(null, subtipoArma)) * potenciaContraRival,
      jugadorNivel: combate.jugadorNivel,
      jugadorProbCritico: combate.jugadorProbCritico * multiplicadorAscension(efectos) + bono.critico + criticoBasico,
      jugadorDanoCritico: combate.jugadorDanoCritico * multiplicadorAscension(efectos) * danoCriticoBasico,
      jugadorPrecision: calcularPrecisionModificada((combate.jugadorPrecision ?? 75) * multiplicadorAscension(efectos), efectos) + bono.precision,
      enemigoEvasion: calcularEvasionModificada((combate.enemigoEvasion ?? 0) * multiplicadorAscension(efectosDefensor), efectosDefensor),
      enemigoDefensa: (enemigoDefensa + calcularBonusDefensaMuralla(combate.murallaNivel ?? 0)) * defensaFisicaBasica,
      enemigoDefensaMagica: resistenciaRasgo((combate.enemigoDefensaMagica ?? enemigoDefensa) + calcularBonusDefensaMuralla(combate.murallaNivel ?? 0)),
      enemigoNombre: combate.enemigoNombre ?? "Defensor",
    });
    const basicoDefensor = () => resolverAtaqueEnemigo({
      efectosJugador: efectos,
      enemigoAtaque: calcularAtaqueModificado(combate.enemigoAtaque, efectosDefensor) * ataqueRasgo,
      enemigoAtaqueMagico: calcularAtaqueModificado(combate.enemigoAtaqueMagico ?? combate.enemigoAtaque, efectosDefensor, true) * ataqueRasgo,
      usarMejorAtaqueMagico: usarAtaqueMagico,
      danoMagicoDesdeAtaqueFisico: corteBasico,
      multiplicadorDano: multiplicadorOrden(propiosAntes) * potenciaVigia(clase, propiosAntes, esDisparoTier3(null, subtipoArma)) * potenciaContraRival,
      enemigoProbCritico: combate.enemigoProbCritico * multiplicadorAscension(efectosDefensor) + bono.critico + criticoBasico,
      enemigoDanoCritico: combate.enemigoDanoCritico * multiplicadorAscension(efectosDefensor) * danoCriticoBasico,
      enemigoPrecision: calcularPrecisionModificada((combate.enemigoPrecision ?? 75) * multiplicadorAscension(efectosDefensor), efectosDefensor) + bono.precision,
      jugadorEvasion: calcularEvasionModificada((combate.jugadorEvasion ?? 0) * multiplicadorAscension(efectos), efectos),
      jugadorDefensa: jugadorDefensa * defensaFisicaBasica,
      jugadorDefensaMagica: resistenciaRasgo(combate.jugadorDefensaMagica ?? jugadorDefensa),
      enemigoNombre: personaje.nombre,
    });

    // En PvP:
    //
    // jugadorHp      = HP del atacante
    // enemigoHp      = HP del defensor
    //
    // jugadorAtaque  = ataque del atacante
    // enemigoAtaque  = ataque del defensor
    //
    // jugadorDefensa = defensa del atacante
    // enemigoDefensa = defensa del defensor

    if (actor === "atacante") {
      if (!atacanteEsUsuario) {
        return NextResponse.json(
          {
            error: "No es tu turno.",
          },
          { status: 409 }
        );
      }

      if (accion === "atacar") {
        accionAnimada = basicoAtacante();

        aplicarBarreraAccion(accionAnimada, efectosDefensor);
        consumirPrecisionTactica(efectos);
        enemigoHp = Math.max(0, enemigoHp - accionAnimada.dano);
      } else {
        if (!habilidad) {
          return NextResponse.json(
            {
              error: "Habilidad no encontrada.",
            },
            { status: 404 }
          );
        }

        const resultadoHabilidad = resolverHabilidadJugador(habilidad, {
          contextoTactico: habilidad.versionReglas===2 ? contextoTecnicaPvp(false) : undefined,
          bonusCuracion,
          efectosEnemigo: efectosDefensor,
          jugadorAtaque: calcularAtaqueModificado(combate.jugadorAtaque, efectos) * ataqueRasgo,
          jugadorAtaqueMagico: calcularAtaqueModificado(combate.jugadorAtaqueMagico ?? combate.jugadorAtaque, efectos, true) * ataqueRasgo,
          jugadorPrecision: calcularPrecisionModificada(combate.jugadorPrecision ?? 75, efectos) + bono.precision,
          enemigoEvasion: calcularEvasionModificada(combate.enemigoEvasion ?? 0, efectosDefensor),
          jugadorProbCritico: combate.jugadorProbCritico * multiplicadorAscension(efectos) + bono.critico,
          jugadorDanoCritico: combate.jugadorDanoCritico * multiplicadorAscension(efectos),
          jugadorDefensa,
          jugadorDefensaMagica: combate.jugadorDefensaMagica ?? jugadorDefensa,
          jugadorNivel: combate.jugadorNivel,
          jugadorHp,
          jugadorHpMaximo: combate.jugadorHpMaximo,
          enemigoDefensa:
            combate.enemigoDefensa +
            calcularBonusDefensaMuralla(combate.murallaNivel ?? 0),
          multiplicadorDefensaFisica: defensaRasgo,
          enemigoDefensaMagica: resistenciaRasgo((combate.enemigoDefensaMagica ?? combate.enemigoDefensa) +
            calcularBonusDefensaMuralla(combate.murallaNivel ?? 0)),
          enemigoNombre: combate.enemigoNombre ?? "Defensor",
        });

        accionAnimada = resultadoHabilidad.accion;

        jugadorHp = resultadoHabilidad.jugadorHp;
        jugadorDefensa = resultadoHabilidad.jugadorDefensa;
        enemigoDefensa = resultadoHabilidad.enemigoDefensa;

        if(habilidad.versionReglas!==2)aplicarBarreraAccion(accionAnimada, efectosDefensor);
        enemigoHp = Math.max(0, enemigoHp - accionAnimada.dano);

        const efectosRepartidos = distribuirEfectosHabilidadPvp(resultadoHabilidad.efectos, "atacante");
        efectos = [...efectos, ...efectosRepartidos.efectosAtacante];
        efectosDefensor = [...efectosDefensor, ...efectosRepartidos.efectosDefensor];
        if (resultadoHabilidad.efectosJugadorActualizados) efectos = resultadoHabilidad.efectosJugadorActualizados;
        if(resultadoHabilidad.efectosEnemigoActualizados)efectosDefensor=resultadoHabilidad.efectosEnemigoActualizados;
        recursosHabilidad=resultadoHabilidad.recursosRecuperados??recursosHabilidad;
        filaActorTactica=resultadoHabilidad.filaActorActualizada;


        const cooldownTurnos = habilidad.cooldownTurnos ?? 0;

        if (cooldownTurnos > 0) {
          establecerCooldownHabilidad(cooldowns,habilidad);
        }
      }
    } else if (actor === "defensor") {
      if (!defensorEsUsuario) {
        return NextResponse.json(
          {
            error: "No es tu turno.",
          },
          { status: 409 }
        );
      }

      if (accion === "atacar") {
        accionAnimada = basicoDefensor();

        aplicarBarreraAccion(accionAnimada, efectos);
        consumirPrecisionTactica(efectosDefensor);
        jugadorHp = Math.max(0, jugadorHp - accionAnimada.dano);
      } else {
        if (!habilidad) {
          return NextResponse.json(
            {
              error: "Habilidad no encontrada.",
            },
            { status: 404 }
          );
        }

        const resultadoHabilidad = resolverHabilidadJugador(habilidad, {
          contextoTactico: habilidad.versionReglas===2 ? contextoTecnicaPvp(true) : undefined,
          bonusCuracion,
          efectosEnemigo: efectos,
          jugadorAtaque: calcularAtaqueModificado(combate.enemigoAtaque, efectosDefensor) * ataqueRasgo,
          jugadorAtaqueMagico: calcularAtaqueModificado(combate.enemigoAtaqueMagico ?? combate.enemigoAtaque, efectosDefensor, true) * ataqueRasgo,
          jugadorProbCritico: combate.enemigoProbCritico * multiplicadorAscension(efectosDefensor) + bono.critico,
          jugadorDanoCritico: combate.enemigoDanoCritico * multiplicadorAscension(efectosDefensor),
          jugadorPrecision: calcularPrecisionModificada((combate.enemigoPrecision ?? 75) * multiplicadorAscension(efectosDefensor), efectosDefensor) + bono.precision,
          enemigoEvasion: calcularEvasionModificada((combate.jugadorEvasion ?? 0) * multiplicadorAscension(efectos), efectos),
          jugadorDefensa: enemigoDefensa,
          jugadorDefensaMagica: combate.enemigoDefensaMagica ?? enemigoDefensa,
          jugadorNivel: combate.enemigoNivel,
          jugadorHp: enemigoHp,
          jugadorHpMaximo: combate.enemigoHpMaximo,
          enemigoDefensa: jugadorDefensa,
          multiplicadorDefensaFisica: defensaRasgo,
          enemigoDefensaMagica: resistenciaRasgo(combate.jugadorDefensaMagica ?? jugadorDefensa),
          enemigoNombre: "Atacante",
          efectosJugador: efectosDefensor,
        });

        // En PvP, el resolver compartido etiqueta como "jugador" al atacante.
        // Al resolver la habilidad del defensor, traducimos el actor real.
        accionAnimada = normalizarActorHabilidadDefensor(resultadoHabilidad.accion);

        enemigoHp = resultadoHabilidad.jugadorHp;
        enemigoDefensa = resultadoHabilidad.jugadorDefensa;
        jugadorDefensa = resultadoHabilidad.enemigoDefensa;

        if(habilidad.versionReglas!==2)aplicarBarreraAccion(accionAnimada, efectos);
        jugadorHp = Math.max(0, jugadorHp - accionAnimada.dano);

        const efectosRepartidos = distribuirEfectosHabilidadPvp(resultadoHabilidad.efectos, "defensor");
        efectos = [...efectos, ...efectosRepartidos.efectosAtacante];
        efectosDefensor = [...efectosDefensor, ...efectosRepartidos.efectosDefensor];
        if (resultadoHabilidad.efectosJugadorActualizados) efectosDefensor = resultadoHabilidad.efectosJugadorActualizados;
        if(resultadoHabilidad.efectosEnemigoActualizados)efectos=resultadoHabilidad.efectosEnemigoActualizados;
        recursosHabilidad=resultadoHabilidad.recursosRecuperados??recursosHabilidad;
        filaActorTactica=resultadoHabilidad.filaActorActualizada;


        const cooldownTurnos = habilidad.cooldownTurnos ?? 0;

        if (cooldownTurnos > 0) {
          establecerCooldownHabilidad(cooldownsDefensor,habilidad);
        }
      }
    } else {
      return NextResponse.json(
        {
          error: "Turno de combate PvP no válido.",
        },
        { status: 409 }
      );
    }

    if (accion === "atacar") {
      const presentacionArma = obtenerPresentacionAtaqueBasico(subtipoArma);
      if (presentacionArma) accionAnimada = { ...accionAnimada, presentacion: presentacionArma };
    }

    // ============================================================
    // DETERMINAR GANADOR PVP
    const propios = esDefensor ? efectosDefensor : efectos;
    const habiaEstribillo = consumirEstribillo(propios);
    const ajenos = esDefensor ? efectos : efectosDefensor;
    let hpRival = esDefensor ? jugadorHp : enemigoHp;
    if (habiaEstribillo) {
      recursosHabilidad.energia += 5;
      recursosHabilidad.mana += 3;
    }
    let hpPropio = esDefensor ? enemigoHp : jugadorHp;
    const hpGanadoConTecnica = hpPropio - hpPropioAntes;
    const danoAntes = accionAnimada.dano;
    resolverImpactoHibrido(clase, usuario.id, subtipoArma, habilidad, propios, previosHibridos, ajenos, hpRivalAntes,
      esDefensor ? combate.enemigoAtaqueMagico ?? combate.enemigoAtaque : combate.jugadorAtaqueMagico ?? combate.jugadorAtaque,
      esDefensor ? combate.jugadorDefensaMagica ?? jugadorDefensa : combate.enemigoDefensaMagica ?? enemigoDefensa,
      accionAnimada, (esDefensor ? jugadorDefensa : enemigoDefensa) * defensaRasgo, maximoRival);
    const curaTier3 = aplicarImpactoTier3(clase, usuario.id, habilidad, accionAnimada, propios, previosHibridos, ajenos,
      esDefensor ? combate.jugadorDefensaMagica ?? jugadorDefensa : combate.enemigoDefensaMagica ?? enemigoDefensa, true, hpRivalAntes);
    hpPropio = Math.min(maximoPropio, hpPropio + curaTier3);
    pulsarRuna(habilidad, accionAnimada, previosHibridos, id => clase === "runista" && id === usuario.id ? propios : undefined);
    registrarEsquivaTier3(claseRival, accionAnimada, ajenos, usuario.id);
    registrarEsquivaTier35(claseRival, accionAnimada, ajenos, usuario.id);
    cargarLuzGuardia(claseRival, accionAnimada.proteccion?.mitigado ?? 0, maximoRival, ajenos);
    let manaRuptura = 0;
    const resolverRuptura = (golpe: AccionAnimadaCombate, hp: number, atacanteClase: string, efectosAtacante: typeof propios, defensorId: string) => {
      const autorContraofensiva = golpe.proteccion?.contraofensiva;
      if (autorContraofensiva === defensorId) {
        const sonPropios = defensorId === usuario.id;
        registrarContraofensiva(sonPropios ? propios : ajenos, sonPropios ? idRival : usuario.id);
      }
      const ruptura = golpe.proteccion?.ruptura;
      if (ruptura?.creadorId === defensorId) {
        if (defensorId === usuario.id) recursosHabilidad.mana += ruptura.mana;
        else manaRuptura += ruptura.mana;
      }
      const represalia = crearRepresaliaRuptura(golpe.proteccion);
      limitarGolpeLetal(atacanteClase, hp, efectosAtacante, represalia);
      golpe.texto += represalia.texto;
      return Math.max(0, hp - represalia.dano);
    };
    hpPropio = resolverRuptura(accionAnimada, hpPropio, clase, propios, idRival);
    hpRival = Math.max(0, hpRival - (accionAnimada.dano - danoAntes));
    registrarEsquivaHibrida(claseRival, accionAnimada, ajenos);
    if (hpRival <= 0 && accionAnimada.dano >= hpRivalAntes) {
      limitarGolpeLetal(claseRival, hpRivalAntes, ajenos, accionAnimada);
      hpRival = Math.max(0, hpRivalAntes - accionAnimada.dano);
    }
    hpRival += curaConsagracion(accionAnimada.proteccion, hpRival, maximoRival);
    if (hpRival <= 0) cobrarAlma(clase, usuario.id, propios, [...previosHibridos, ...ajenos]);
    if (hpPropio > 0 && clase === "arquero" && (accion === "atacar" || habilidad?.efecto === "dano")) {
      const danoExtra = resolverFlechasRasgo(job, hpRival, accionAnimada, ajenos,
        esDefensor ? basicoDefensor : basicoAtacante,
        (flecha, hp) => {
          limitarGolpeLetal(claseRival, hp, ajenos, flecha);
          hpPropio = resolverRuptura(flecha, hpPropio, clase, propios, idRival);
          return hpPropio > 0;
        });
      hpRival = Math.max(0, hpRival - danoExtra);
    }
    const impactoTier35 = aplicarImpactoTier35({
      clase, actorId: usuario.id, objetivoId: idRival, arma: subtipoArma, habilidad, golpe: accionAnimada,
      propios, anteriores: previosHibridos, destino: ajenos, hpRival: hpRivalAntes,
      defensa: esDefensor ? jugadorDefensa : enemigoDefensa, job,
    });
    if (esDefensor) jugadorDefensa = impactoTier35.defensa;
    else enemigoDefensa = impactoTier35.defensa;
    const drenajeEspectral = hpPropio > 0 ? Math.min(maximoPropio - hpPropio, impactoTier35.cura) : 0;
    hpPropio += drenajeEspectral;
    if (drenajeEspectral > 0) accionAnimada.texto += ` Disparo de ultratumba restaura ${drenajeEspectral} PV.`;
    recursosHabilidad.energia += impactoTier35.energia;
    if (habilidad?.efecto === "curacion") {
      aplicarAmparo(clase, job, hpPropioAntes, maximoPropio, accionAnimada, propios, propios);
      const defensaRecuperada = purificarConCura(clase, accionAnimada, propios, propios, perjuiciosAntes);
      if (esDefensor) enemigoDefensa += defensaRecuperada;
      else jugadorDefensa += defensaRecuperada;
    }
    registrarObjetivoRasgo(clase, accion === "atacar" || habilidad?.efecto === "dano" ? idRival : undefined, propios, hpRival > 0);
    if (accion === "atacar" || habilidad?.efecto === "dano") consumirNotaAlMargen(propios);
    if (habilidad?.efecto !== "dano") prepararEstribillo(clase, habilidad, propios);
    if (habilidad?.efecto === "dano" && accionAnimada.tipo !== "fallo") marcarNotaAlMargen(clase, propios, ajenos);
    const defensaDisipada = consumirAbsolucion(clase, accionAnimada, propios, ajenos);
    if (esDefensor) jugadorDefensa = Math.max(0, jugadorDefensa - defensaDisipada);
    else enemigoDefensa = Math.max(0, enemigoDefensa - defensaDisipada);
    if (habilidad && habilidad.efecto !== "dano" && habilidad.objetivo?.equipo !== "enemigo") {
      resolverApoyoHibrido(clase, habilidad, propios, propios);
      marcarPresagio(clase, habilidad, accionAnimada, usuario.id, propios);
      anotarProteccionTier3(clase, usuario.id, habilidad, propios);
    }
    if (clase === "mariscal" && golpeConLanza(subtipoArma, habilidad, accionAnimada)) ponerLineaLanzas(propios);
    if (accion === "atacar" || habilidad?.efecto === "dano") consumirHuellas(propios, ajenosAntes, clase === "rastreador");
    cerrarAccionTier3(clase, habilidad, accion === "atacar", subtipoArma, accionAnimada, propios, idRival);
    prepararCompas(clase, habilidad, usuario.id, [{ efectos: propios, hpMaximo: maximoPropio }], job);
    cerrarAccionTier35({
      clase, habilidad, basico: accion === "atacar", accion: accionAnimada, propios,
      actorId: usuario.id, hpGanado: hpGanadoConTecnica, efectosAliado: id => id === usuario.id ? propios : undefined,
    });
    const energiaAbordaje = cerrarAccionHibrida(clase, habilidad, accion === "atacar", accionAnimada, propios, job, impactoTier35.energia > 0);
    recursosHabilidad.energia += energiaAbordaje;
    if (energiaAbordaje > 0 || impactoTier35.energia > 0) premioAbordaje = oroAbordaje(job, clase);
    actualizarRachaSuperNovato(clase, propios, habilidad);
    const vidaAscension = ajustarVidaAscension(propios, hpPropio, maximoPropio);
    hpPropio = vidaAscension.hp;
    maximoPropio = vidaAscension.maximo;
    cerrarRasgoAccion(clase, propios, habilidad);
    const enemigoEnAlcance = (esDefensor ? combate.enemigoPosicion : combate.jugadorPosicion) !== "retaguardia";
    if (hpRival > 0 && enemigoEnAlcance && activarContraataque(claseRival, accionAnimada, ajenos)) {
      const replica = resolverAtaqueJugador({
        jugadorAtaque: esDefensor ? combate.jugadorAtaque : combate.enemigoAtaque,
        jugadorNivel: esDefensor ? combate.jugadorNivel : combate.enemigoNivel,
        jugadorProbCritico: esDefensor ? combate.jugadorProbCritico : combate.enemigoProbCritico,
        jugadorDanoCritico: esDefensor ? combate.jugadorDanoCritico : combate.enemigoDanoCritico,
        enemigoDefensa: esDefensor ? enemigoDefensa : jugadorDefensa,
        enemigoNombre: personaje.nombre,
      });
      aplicarBarreraAccion(replica, propios);
      hpRival = resolverRuptura(replica, hpRival, claseRival, ajenos, usuario.id);
      limitarGolpeLetal(clase, hpPropio, propios, replica);
      hpPropio = Math.max(0, hpPropio - replica.dano);
      accionAnimada.texto += " Respuesta de acero: " + replica.texto;
    }
    const activaDeuda = rival && hpRival > 0 &&
      activarDeudaOscura(claseRival, hayMaldicionBrujo(propiosAntes, esDefensor ? atacanteUsuarioId : defensorUsuarioId), ajenos);
    const segundoAire = rival && hpRival > 0 && activarSegundoAire(claseRival, accionAnimada.dano, ajenos);
    if (activaDeuda) hpRival = Math.min(maximoRival, hpRival + Math.max(1, Math.floor(maximoRival * 0.05)));
    jugadorHp = esDefensor ? hpRival : hpPropio;
    enemigoHp = esDefensor ? hpPropio : hpRival;

    if (hpRival <= 0 && consumirSemillaSilvestre(ajenos)) {
      const cura = curacionSemilla(hpPropio, maximoPropio);
      if (esDefensor) enemigoHp += cura;
      else jugadorHp += cura;
      if (cura > 0) accionAnimada.texto += ` Semilla silvestre restaura ${cura} PV.`;
    }

    log.push(accionAnimada.texto);

    const maximoAtacante = esDefensor ? maximoRival : maximoPropio;
    const maximoDefensor = esDefensor ? maximoPropio : maximoRival;
    const velocidad = (id: string, hp: number, maximo: number, base: number, efectosActor: typeof efectos) =>
      velocidadConDanza(base, efectosActor) * (id === "berserker" ? multiplicadorAtaqueRasgo(id, hp, maximo, efectosActor) : multiplicadorAscension(efectosActor));
    const participantes = [
      { actorId: "atacante", equipo: "jugador" as const, velocidad: velocidad(esDefensor ? claseRival : clase, jugadorHp, maximoAtacante, combate.jugadorVelocidad, efectos) },
      { actorId: "defensor", equipo: "enemigo" as const, velocidad: velocidad(esDefensor ? clase : claseRival, enemigoHp, maximoDefensor, combate.enemigoVelocidad, efectosDefensor) },
    ];
    const cola = normalizarSecuenciaTurnosVelocidad(combate.turnosPendientes);
    const avance = avanzarSecuenciaTurnosVelocidad({
      actoresVivos: participantes,
      turnosPendientes: cola[0]?.actorId === actor ? cola : crearSecuenciaTurnosVelocidad(participantes, combate.id, actor),
      ronda: combate.ronda,
      semilla: combate.id,
    });
    const siguienteTurno = avance.turnoActual?.actorId === "defensor" ? "defensor" : "atacante";
    const siguienteRonda = avance.ronda;

    if (jugadorHp > 0 && enemigoHp > 0 && siguienteTurno === "atacante") {
      cooldowns = reducirCooldowns(cooldowns);

      efectos = efectos.filter(efecto => !expiraPresagio(efecto, atacanteUsuarioId));
      efectosDefensor = efectosDefensor.filter(efecto => !expiraPresagio(efecto, atacanteUsuarioId));
      acortarPerjuicioAsceta(esDefensor ? claseRival : clase, efectos);
      const antesDelTurno = efectos;
      const efectosActualizados = comenzarTurnoCombatiente(
        efectos, jugadorHp, maximoAtacante, jugadorDefensa, combate.atacanteNombre ?? personaje.nombre
      );

      efectos = efectosActualizados.efectos;
      jugadorHp = efectosActualizados.hp;
      if (jugadorHp <= 0) cobrarAlma(esDefensor ? clase : claseRival, defensorUsuarioId, efectosDefensor, antesDelTurno);
      if (jugadorHp <= 0 && consumirSemillaSilvestre(efectos)) enemigoHp += curacionSemilla(enemigoHp, maximoDefensor);
      jugadorDefensa = efectosActualizados.defensa;
      accionAnimada = adjuntarPulsosEstado(accionAnimada, "jugador", efectosActualizados);
      log.push(...efectosActualizados.mensajes);
    }

    if (jugadorHp > 0 && enemigoHp > 0 && siguienteTurno === "defensor") {
      cooldownsDefensor = reducirCooldowns(cooldownsDefensor);

      efectos = efectos.filter(efecto => !expiraPresagio(efecto, defensorUsuarioId));
      efectosDefensor = efectosDefensor.filter(efecto => !expiraPresagio(efecto, defensorUsuarioId));
      acortarPerjuicioAsceta(esDefensor ? clase : claseRival, efectosDefensor);
      const antesDelTurno = efectosDefensor;
      const efectosActualizados = comenzarTurnoCombatiente(
        efectosDefensor, enemigoHp, maximoDefensor ?? enemigoHp, enemigoDefensa, combate.defensorNombre ?? combate.enemigoNombre ?? "Defensor"
      );

      efectosDefensor = efectosActualizados.efectos;
      enemigoHp = efectosActualizados.hp;
      if (enemigoHp <= 0) cobrarAlma(esDefensor ? claseRival : clase, atacanteUsuarioId, efectos, antesDelTurno);
      if (enemigoHp <= 0 && consumirSemillaSilvestre(efectosDefensor)) jugadorHp += curacionSemilla(jugadorHp, maximoAtacante);
      enemigoDefensa = efectosActualizados.defensa;
      accionAnimada = adjuntarPulsosEstado(accionAnimada, "enemigo", efectosActualizados);
      log.push(...efectosActualizados.mensajes);
    }

    // ============================================================

    const ganador = determinarGanadorAsedio({
      hpAtacante: jugadorHp,
      hpDefensor: enemigoHp,
    });

    if (ganador) {
      const atacanteGana = ganador === "atacante";

      if (atacanteGana) {
        log.push(
          `🏆 ¡${combate.enemigoNombre ?? "El defensor"} ha sido derrotado!`
        );
      } else {
        log.push(`🏆 ¡El atacante ha sido derrotado!`);
      }

      const resultado = await prisma.$transaction(async (tx) => {
        await gastarRecursosHabilidad(tx, personaje.id, habilidad, recursosHabilidad, factorRecursos);
        if (premioAbordaje > 0) await tx.usuario.update({ where: { id: usuario.id }, data: { oro: { increment: premioAbordaje } } });
        if (rival && (activaDeuda || segundoAire || manaRuptura > 0)) await gastarRecursosHabilidad(tx, rival.id, null, { energia: 0, mana: (activaDeuda ? 5 : 0) + manaRuptura, fraccionEnergiaFaltante: segundoAire ? 0.15 : 0 });
        return finalizarAsedio({
          tx,

          combate: {
            id: combate.id,
            version: combate.version,

            atacanteUsuarioId: combate.atacanteUsuarioId,
            defensorUsuarioId: combate.defensorUsuarioId,

            jugadorHpMaximo: maximoAtacante,

            almacenNivel: combate.almacenNivel,
            capacidadCarruaje: combate.capacidadCarruaje,

            estadoDefensorAnterior: combate.estadoDefensorAnterior,
          },

          expedicionId: expedicion.id,

          jugadorHp: limitarVidaFueraCombate(jugadorHp, efectos),
          enemigoHp,

          jugadorDefensa,
          enemigoDefensa,

          cooldowns,
          efectos: efectos as unknown as import("@/lib/tiposJuego").EstadoEfectoHabilidad[],
          cooldownsDefensor,
          efectosDefensor: efectosDefensor as unknown as import("@/lib/tiposJuego").EstadoEfectoHabilidad[],

          accion: accionAnimada,
          log,

          ganador,
        });
      });

      return NextResponse.json({
        exito: true,
        combate: resultado.combate,
        terminado: true,
        accion: accionAnimada,
        botin: resultado.botin,
      });
    }

    // ============================================================
    // SIGUIENTE TURNO PVP
    // ============================================================

    const combateActualizado = await prisma.$transaction(async (tx) => {
      await gastarRecursosHabilidad(tx, personaje.id, habilidad, recursosHabilidad, factorRecursos);
      if (premioAbordaje > 0) await tx.usuario.update({ where: { id: usuario.id }, data: { oro: { increment: premioAbordaje } } });
        if (rival && (activaDeuda || segundoAire || manaRuptura > 0)) await gastarRecursosHabilidad(tx, rival.id, null, { energia: 0, mana: (activaDeuda ? 5 : 0) + manaRuptura, fraccionEnergiaFaltante: segundoAire ? 0.15 : 0 });
      const siguienteUsuarioId =
        siguienteTurno === "atacante" ? atacanteUsuarioId : defensorUsuarioId;
      await regenerarRecursosPorTurno(tx, siguienteUsuarioId, multiplicadorAscension(siguienteTurno === "atacante" ? efectos : efectosDefensor));

      return actualizarCombateVersionado(tx, combate.id, combate.version, {
        jugadorHp,
        enemigoHp,
        ...(filaActorTactica!==undefined?(actor==="atacante"?{jugadorPosicion:["mele","centro","retaguardia"][filaActorTactica]}:{enemigoPosicion:["mele","centro","retaguardia"][filaActorTactica]}):{}),
        jugadorDefensa,
        enemigoDefensa,
        ronda: siguienteRonda,
        turnosPendientes: avance.turnosPendientes as unknown as Prisma.InputJsonValue,
        turno: siguienteTurno,
        jugadorHpMaximo: maximoAtacante,
        enemigoHpMaximo: maximoDefensor,
        cooldowns,
        efectos: efectos as unknown as Prisma.InputJsonValue,
        cooldownsDefensor,
        efectosDefensor: efectosDefensor as unknown as Prisma.InputJsonValue,
        ultimoTurnoEn: new Date(),
        log,
        ultimaAccion: accionAnimada,
      });
    });

    return NextResponse.json({
      exito: true,
      combate: combateActualizado,
      terminado: false,
      accion: accionAnimada,
    });

  } catch (error) {
    return manejarErrorAccionCombate(error);
  }
}
