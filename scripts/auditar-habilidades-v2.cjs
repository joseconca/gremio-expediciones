/* Ejecuta el resolver real y los mismos relojes, recursos y CD que los servicios. */
require('../tests/load-typescript.cjs');
const fs=require('node:fs');
const {HABILIDADES,obtenerHabilidadesDisponiblesParaClase}=require('../src/lib/habilidades.ts');
const {CLASES,obtenerAncestrosClase}=require('../src/lib/progresion/clases.ts');
const {calcularEstadisticasPersonaje}=require('../src/lib/estadisticasPersonaje.ts');
const {ajustarHabilidadPorNivel,nivelMaximoHabilidad}=require('../src/lib/progresion/niveles-habilidad.ts');
const {resolverHabilidadJugador,resolverAtaqueJugador}=require('../src/lib/expediciones/combate.ts');
const {procesarEfectosTurno,aplicarBarreraAccion,calcularAtaqueModificado,calcularPrecisionModificada,consumirPrecisionTactica}=require('../src/lib/expediciones/estados-combate.ts');
const {calcularPesosCuracion}=require('../src/lib/expediciones/presupuesto-curacion.ts');
const {calcularRegeneracionRecursosTurno}=require('../src/lib/expediciones/recursos-combate.ts');
const {establecerCooldownHabilidad}=require('../src/lib/expediciones/cooldowns-habilidades.ts');
const max=h=>ajustarHabilidadPorNivel(h,nivelMaximoHabilidad(h.claseId,h));
function configuraciones(claseId){
  const legales=obtenerHabilidadesDisponiblesParaClase(claseId);
  const activas=legales.filter(h=>h.tipo==='activa').map(max),pasivas=legales.filter(h=>h.tipo==='pasiva').map(max);
  const unicos=a=>[...new Map(a.map(h=>[h.id,h])).values()];
  const orden=(a,fn)=>[...a].sort((x,y)=>fn(y)-fn(x)||x.id.localeCompare(y.id));
  const ofensivas=orden(activas,h=>(h.multiplicadorDano??0)+(h.danoProgresivoPorcentaje??0)*(h.duracionTurnos??2));
  const propias=activas.filter(h=>h.claseId===claseId);
  const curas=orden(activas,h=>(h.curacionPorcentaje??0)+(h.curacionProgresivaPorcentaje??0)*3);
  const recursos=activas.filter(h=>(h.recuperarEnergia??0)>0);
  const preparaciones=activas.filter(h=>h.disenoActiva?.operaciones.some(o=>o.tipo==='estado'&&o.familia==='preparacion'));
  const areas=activas.filter(h=>h.objetivo?.patron!=='individual');
  const sets=[propias,ofensivas,curas,recursos.concat(ofensivas),preparaciones,areas];
  const conjuntosPasivos=[pasivas.filter(h=>h.claseId===claseId),pasivas.filter(h=>['mana','energia'].includes(h.reglaPasiva?.ventaja)),pasivas.filter(h=>['guardia','curacion','regeneracion'].includes(h.reglaPasiva?.ventaja)),pasivas.filter(h=>['precision','exponer','guardar_preparacion'].includes(h.reglaPasiva?.ventaja))];
  const resultado=[];
  for(const a of sets)for(const p of conjuntosPasivos){
    const aa=unicos([...a,...ofensivas,...activas]).slice(0,5),pp=unicos([...p,...pasivas]).slice(0,3);
    resultado.push({activas:aa,pasivas:pp});
  }
  return [...new Map(resultado.map(c=>[c.activas.map(h=>h.id).join(',')+'|'+c.pasivas.map(h=>h.id).join(','),c])).values()];
}
function statsClase(claseId,pasivas=[]){
  const ids=[claseId,...obtenerAncestrosClase(claseId)];
  return calcularEstadisticasPersonaje({clase:'Novato',profesionActivaId:claseId,nivel:30,nivelJob:CLASES[claseId].nivelJobMaximo,progresosClase:ids.map(id=>({claseId:id,nivelJob:CLASES[id].nivelJobMaximo,desbloqueada:true})),velocidadMejoras:0,capacidadCarruajeMejoras:0},pasivas).total;
}
function simular(claseId,cfg,{ciclos=12,objetivos=1,velocidad=1,semilla=1729}={}){
  const stats=statsClase(claseId,cfg.pasivas);
  const hpMaximo=stats.hpMaximo;
  const aliados=Array.from({length:objetivos},(_,i)=>({id:i===0?'actor':`aliado${i}`,hp:Math.floor(hpMaximo*.55),efectos:[]}));
  const enemigos=Array.from({length:objetivos},(_,i)=>({id:`enemigo${i}`,hp:1e7,efectos:[]}));
  let energia=stats.energiaMaxima,mana=stats.manaMaximo,pendiente=0;
  const cooldowns={},usos={};
  const metrica={dano:0,cura:0,absorbido:0,acciones:0,basicos:0,recuperadoE:0,recuperadoM:0,costeE:0,costeM:0};
  const aleatorio=Math.random;let estado=semilla>>>0;
  Math.random=()=>{estado=(Math.imul(estado,1664525)+1013904223)>>>0;return estado/4294967296;};
  try{
    for(let ciclo=1;ciclo<=ciclos&&aliados[0].hp>0;ciclo++){
      for(let turno=0;turno<velocidad&&aliados[0].hp>0;turno++){
        for(const aliado of aliados){if(aliado.id!=='actor'&&turno>0)continue;const t=procesarEfectosTurno(aliado.efectos,aliado.hp,hpMaximo,stats.defensa,aliado.id);aliado.hp=t.hp;aliado.efectos=t.efectos;metrica.cura+=t.curacionAplicada;}
        const reg=calcularRegeneracionRecursosTurno(energia,mana,stats.energiaMaxima,stats.manaMaximo,stats.regeneracionManaPorTurno,stats.regeneracionEnergiaPorTurno,pendiente);
        // Mantener la firma pública de la función, sin fórmulas duplicadas.
        energia=reg.energiaActual;mana=reg.manaActual;pendiente=reg.manaRegeneracionPendiente;
        const actor=aliados[0];
        const disponibles=cfg.activas.filter(h=>!(cooldowns[h.id]>0)&&(h.costeEnergia??0)<=energia&&(h.costeMana??0)<=mana);
        const h=disponibles.find(h=>(h.recuperarEnergia??0)>0&&energia<45)
          ??disponibles.find(h=>['curacion','curacion_progresiva'].includes(h.efecto)&&actor.hp<hpMaximo*.6)
          ??disponibles.find(h=>h.efecto==='dano')
          ??disponibles.find(h=>h.disenoActiva?.operaciones.some(o=>o.tipo==='guardia_porcentaje'));
        if(!h){
          const accion=resolverAtaqueJugador({jugadorAtaque:calcularAtaqueModificado(stats.ataque,actor.efectos),jugadorAtaqueMagico:stats.ataqueMagico,jugadorNivel:30,jugadorProbCritico:stats.probCritico,jugadorDanoCritico:stats.danoCritico,enemigoDefensa:45,enemigoDefensaMagica:45,enemigoNombre:'Objetivo',jugadorPrecision:calcularPrecisionModificada(stats.precision,actor.efectos),efectosEnemigo:enemigos[0].efectos});
          aplicarBarreraAccion(accion,enemigos[0].efectos);consumirPrecisionTactica(actor.efectos);metrica.dano+=accion.dano;metrica.basicos++;metrica.acciones++;continue;
        }
        const aliado=h.objetivo?.equipo!=='enemigo'&&h.efecto!=='dano';
        const afectados=h.objetivo?.patron==='individual'?[aliado?actor:enemigos[0]]:aliado?aliados:enemigos;
        const pesos=calcularPesosCuracion(afectados.map(o=>({...o,hpMaximo})));
        let recuperacion={energia:0,mana:0};
        const actorInicial={hp:actor.hp,efectos:actor.efectos};
        for(const [i,objetivo]of afectados.entries()){
          const c={actorId:actor.id,objetivoId:objetivo.id,claseId,ciclo,actorHp:actorInicial.hp,actorHpMaximo:hpMaximo,energia,energiaMaxima:stats.energiaMaxima,mana,manaMaximo:stats.manaMaximo,ataque:stats.ataque,ataqueMagico:stats.ataqueMagico,defensaActor:stats.defensa,defensaMagicaActor:stats.defensaMagica,efectosActor:actorInicial.efectos,objetivoHp:objetivo.hp,objetivoHpMaximo:aliado?hpMaximo:1e7,defensaObjetivo:aliado?stats.defensa:45,defensaMagicaObjetivo:aliado?stats.defensaMagica:45,efectosObjetivo:objetivo.efectos,objetivoAliado:aliado,filaActor:1,filaObjetivo:1,pasivas:cfg.pasivas,numeroObjetivos:afectados.length,principal:i===0,...(aliado&&afectados.length>1?{pesoCuracion:pesos[objetivo.id]}:{})};
          const r=resolverHabilidadJugador(h,{contextoTactico:c,jugadorAtaque:calcularAtaqueModificado(stats.ataque,actorInicial.efectos),jugadorAtaqueMagico:calcularAtaqueModificado(stats.ataqueMagico,actorInicial.efectos,true),jugadorDefensa:aliado?stats.defensa:stats.defensa,jugadorDefensaMagica:stats.defensaMagica,jugadorNivel:30,jugadorHp:aliado?objetivo.hp:actorInicial.hp,jugadorHpMaximo:hpMaximo,jugadorProbCritico:stats.probCritico,jugadorDanoCritico:stats.danoCritico,jugadorPrecision:calcularPrecisionModificada(stats.precision,actorInicial.efectos),enemigoDefensa:45,enemigoDefensaMagica:45,enemigoNombre:'Objetivo',efectosJugador:aliado?objetivo.efectos:actorInicial.efectos,efectosEnemigo:objetivo.efectos});
          metrica.dano+=r.accion.dano;metrica.cura+=r.accion.curacion??0;
          if(aliado){objetivo.hp=r.jugadorHp;objetivo.efectos=r.efectosJugadorActualizados??objetivo.efectos;}
          else{objetivo.hp-=r.accion.dano;objetivo.efectos=r.efectosEnemigoActualizados??objetivo.efectos;}
          if(i===0){recuperacion=r.recursosRecuperados??recuperacion;actor.hp=r.actorHpActualizado??actor.hp;actor.efectos=r.efectosActorActualizados??actor.efectos;}
        }
        energia=Math.min(stats.energiaMaxima,energia-(h.costeEnergia??0)+(h.recuperarEnergia??0)+recuperacion.energia);
        mana=Math.min(stats.manaMaximo,mana-(h.costeMana??0)+recuperacion.mana);
        metrica.costeE+=h.costeEnergia??0;metrica.costeM+=h.costeMana??0;
        metrica.recuperadoE+=recuperacion.energia;metrica.recuperadoM+=recuperacion.mana;
        if(energia<0||mana<0||!Number.isFinite(energia+mana))throw Error(`RECURSO_INVALIDO:${claseId}:${h.id}`);
        if(recuperacion.energia>10||recuperacion.mana>5)throw Error(`DEVOLUCION_EXCESIVA:${claseId}:${h.id}`);
        establecerCooldownHabilidad(cooldowns,h);usos[h.id]=(usos[h.id]??0)+1;metrica.acciones++;
      }
      for(const enemigo of enemigos){const t=procesarEfectosTurno(enemigo.efectos,enemigo.hp,1e7,45,enemigo.id);enemigo.hp=t.hp;enemigo.efectos=t.efectos;metrica.dano+=t.danoAplicado;}
      for(const aliado of aliados){const golpe={dano:Math.max(1,Math.floor(hpMaximo*.08)),critico:false,texto:'Presión'};const bruto=golpe.dano;aplicarBarreraAccion(golpe,aliado.efectos);aliado.hp=Math.max(0,aliado.hp-golpe.dano);metrica.absorbido+=bruto-golpe.dano;}
      for(const id of Object.keys(cooldowns))cooldowns[id]=Math.max(0,cooldowns[id]-1);
    }
  }finally{Math.random=aleatorio;}
  return {...metrica,energia,mana,hp:aliados[0].hp,usos};
}
function ejecutarAuditoria(){
  const filas=[];let simulaciones=0;
  for(const clase of Object.values(CLASES)){
    const cfgs=configuraciones(clase.id);let mejor=0,maxDevolucionE=0,maxDevolucionM=0;
    for(const cfg of cfgs)for(const objetivos of [1,3,9])for(const velocidad of [1,2,3])for(const ciclos of [6,12,20]){
      const r=simular(clase.id,cfg,{objetivos,velocidad,ciclos});simulaciones++;
      if(objetivos===1&&velocidad===1&&ciclos===12)mejor=Math.max(mejor,r.dano+r.cura+r.absorbido);
      maxDevolucionE=Math.max(maxDevolucionE,r.recuperadoE);maxDevolucionM=Math.max(maxDevolucionM,r.recuperadoM);
    }
    filas.push({clase:clase.nombre,id:clase.id,tier:clase.tier,configuraciones:cfgs.length,contribucion12:Math.round(mejor),devolucionE:maxDevolucionE,devolucionM:maxDevolucionM});
  }
  return {clases:filas.length,habilidades:HABILIDADES.length,simulaciones,filas};
}
module.exports={configuraciones,statsClase,simular,ejecutarAuditoria};
if(require.main===module){const r=ejecutarAuditoria();fs.mkdirSync('work',{recursive:true});fs.writeFileSync('work/auditoria-habilidades-v2.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r,null,2));}
