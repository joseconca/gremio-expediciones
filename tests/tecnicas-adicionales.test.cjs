const test=require('node:test');const assert=require('node:assert/strict');
require('./load-typescript.cjs');
const {CLASES}=require('../src/lib/progresion/clases.ts');
const {HABILIDADES_ADICIONALES,crearTecnicaAdicional}=require('../src/lib/progresion/tecnicas-adicionales.ts');
const {resolverHabilidadJugador}=require('../src/lib/expediciones/combate.ts');
const {procesarEfectosTurno,leerEfectosCombate}=require('../src/lib/expediciones/estados-combate.ts');
const actor={id:'a',equipo:'aliado',hp:80,hpMaximo:100,energia:100,energiaMaxima:100,mana:100,manaMaximo:100,ataque:20,ataqueMagico:20,defensa:10,defensaMagica:10,fila:1,columna:0,estados:[],limites:{}};
const contexto=(claseId,extra={})=>({actorId:'a',objetivoId:'a',claseId,ciclo:1,actorHp:80,actorHpMaximo:100,energia:100,energiaMaxima:100,mana:100,manaMaximo:100,ataque:20,ataqueMagico:20,defensaActor:10,defensaMagicaActor:10,efectosActor:[],objetivoHp:80,objetivoHpMaximo:100,defensaObjetivo:10,defensaMagicaObjetivo:10,efectosObjetivo:[],objetivoAliado:true,filaActor:1,filaObjetivo:1,...extra});
const combate=c=>({jugadorAtaque:20,jugadorAtaqueMagico:20,jugadorDefensa:10,jugadorDefensaMagica:10,jugadorNivel:20,jugadorHp:c.objetivoAliado?c.objetivoHp:c.actorHp,jugadorHpMaximo:c.objetivoAliado?c.objetivoHpMaximo:c.actorHpMaximo,jugadorProbCritico:0,jugadorDanoCritico:1.5,enemigoDefensa:10,enemigoNombre:'Objetivo',contextoTactico:c});
const habilidad=clase=>HABILIDADES_ADICIONALES.find(h=>h.claseId===clase);

test('hay una técnica adicional explícita para todas las clases y sus IDs no colisionan',()=>{
  assert.equal(HABILIDADES_ADICIONALES.length,61);
  assert.equal(new Set(HABILIDADES_ADICIONALES.map(h=>h.id)).size,61);
  assert.deepEqual(new Set(HABILIDADES_ADICIONALES.map(h=>h.claseId)),new Set(Object.keys(CLASES)));
  for(const h of HABILIDADES_ADICIONALES){
    assert.ok(h.nivelJobRequerido<=CLASES[h.claseId].nivelJobMaximo);
    const t=crearTecnicaAdicional(h.claseId,actor);
    assert.ok(t.comandos.length>0);assert.ok(h.costeEnergia<=100);assert.ok(h.cooldownTurnos>=4);
  }
});
test('el mismo resolver produce el mismo resultado en solo y en party de un miembro',()=>{
  for(const h of HABILIDADES_ADICIONALES){
    const t=crearTecnicaAdicional(h.claseId,actor);
    const c=contexto(h.claseId,t.objetivo==='enemigo'?{objetivoId:'e',objetivoAliado:false}:{});
    const solo=resolverHabilidadJugador(h,combate(c));
    const party=resolverHabilidadJugador(h,combate(JSON.parse(JSON.stringify(c))));
    assert.deepEqual(solo,party,h.id);
    assert.ok(solo.actorHpActualizado>=0 && solo.actorHpActualizado<=100,h.id);
  }
});
test('transferir regeneración conserva la suma de pulsos y se procesa por los dos servicios de efectos',()=>{
  const efecto={habilidadId:'rejuvenecer',creadorId:'a',tipo:'curacion_progresiva',valor:10,duracionTurnos:3,turnosRestantes:3,objetivo:'jugador'};
  const c=contexto('acolito',{objetivoId:'b',objetivoHp:40,efectosActor:[efecto]});
  const r=resolverHabilidadJugador(habilidad('acolito'),combate(c));
  let hpA=80,hpB=40,ea=r.efectosActorActualizados,eb=r.efectosJugadorActualizados;
  for(let i=0;i<3;i++){
    const a=procesarEfectosTurno(ea,hpA,100,10,'a');ea=a.efectos;hpA=a.hp;
    const b=procesarEfectosTurno(eb,hpB,100,10,'b');eb=b.efectos;hpB=b.hp;
  }
  assert.equal(hpA,95);assert.equal(hpB,55);
});
test('cauterizar consume la herida futura y cura al lanzador, no al enemigo',()=>{
  const efecto={habilidadId:'herida',creadorId:'a',tipo:'dano_progresivo',valor:12,duracionTurnos:3,turnosRestantes:3,objetivo:'enemigo'};
  const c=contexto('saqueador',{objetivoId:'e',objetivoAliado:false,objetivoHp:60,efectosObjetivo:[efecto]});
  const r=resolverHabilidadJugador(habilidad('saqueador'),combate(c));
  assert.equal(r.actorHpActualizado,89);assert.equal(r.accion.dano,0);
  assert.equal(r.efectosEnemigoActualizados.some(e=>e.tipo==='dano_progresivo'),false);
});
test('un estado táctico corrupto no alcanza el cálculo ni la interfaz',()=>{
  const valido={habilidadId:'t',tipo:'tactico',valor:0,turnosRestantes:1,duracionTurnos:1,datosTacticos:{version:2,propietarioId:'a',estados:[],limites:{}}};
  assert.equal(leerEfectosCombate([valido]).length,1);
  for(const estados of [null,{},[{}],[{valor:NaN}]]) assert.equal(leerEfectosCombate([{...valido,datosTacticos:{...valido.datosTacticos,estados}}]).length,0);
});
