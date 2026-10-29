const test=require('node:test');
const assert=require('node:assert/strict');
require('./load-typescript.cjs');
const m=require('../src/lib/expediciones/motor-tactico.ts');
const unidad=(id,equipo='aliado',extra={})=>({id,equipo,hp:100,hpMaximo:100,energia:20,energiaMaxima:100,mana:20,manaMaximo:100,ataque:20,ataqueMagico:20,defensa:10,defensaMagica:10,fila:0,columna:0,estados:[],limites:{},...extra});
const mundo=(extras=[])=>({version:2,ciclo:1,unidades:[unidad('a'),unidad('e','enemigo'),...extras],eventos:[]});
const estado=(familia,valor=10,extra={})=>({id:familia,fuenteId:'tecnica',creadorId:'a',familia,clave:familia,valor,restantes:3,reloj:'turno',cargas:1,...extra});

test('áreas de uno, tres y nueve objetivos conservan exactamente el presupuesto',()=>{
  for(const n of [1,3,9]) for(const total of [0,1,17,100]) {
    const ids=Array.from({length:n},(_,i)=>String(i));
    const reparto=m.repartirPresupuestoTactico(total,ids);
    assert.equal(Object.values(reparto).reduce((a,b)=>a+b,0),total);
    assert.deepEqual(reparto,m.repartirPresupuestoTactico(total,[...ids].reverse()));
  }
});
test('adelantar herida consume un pulso y no aumenta el daño total',()=>{
  const w=mundo();m.aplicarEstadoTactico(w,'e',estado('herida',10));
  assert.equal(m.adelantarPulsoTactico(w,'a','e','ataque','herida'),10);
  for(let i=0;i<3;i++)m.avanzarRelojTactico(w,'turno','e');
  assert.equal(w.unidades[1].hp,70);
});
test('adelantar regeneración consume también los pulsos de sobrecuración',()=>{
  const w=mundo();m.aplicarEstadoTactico(w,'a',estado('regeneracion',10));
  assert.equal(m.adelantarPulsoTactico(w,'a','a','cura','regeneracion'),0);
  w.unidades[0].hp=50;
  for(let i=0;i<3;i++)m.avanzarRelojTactico(w,'turno','a');
  assert.equal(w.unidades[0].hp,70);
});
test('la devolución tiene límites compartidos por ciclo y por pago',()=>{
  const w=mundo();
  assert.equal(m.devolverRecursoTactico(w,'a','p1','mana',20,8,'pago1'),2);
  assert.equal(m.devolverRecursoTactico(w,'a','p2','mana',20,8,'pago1'),0);
  assert.equal(m.devolverRecursoTactico(w,'a','p2','mana',20,20,'pago2'),3);
  assert.equal(m.devolverRecursoTactico(w,'a','p3','mana',20,20,'pago3'),0);
  m.avanzarRelojTactico(w,'ciclo');
  assert.equal(m.devolverRecursoTactico(w,'a','p3','mana',20,20,'pago4'),5);
});
test('proteger no bloquea daño periódico ni permite cadenas de interceptores',()=>{
  const w=mundo([unidad('b'),unidad('c')]);
  m.aplicarEstadoTactico(w,'a',estado('guardia',20));
  assert.equal(m.danarTactico(w,'e','a','veneno',10,true),10);
  assert.equal(w.unidades[0].estados[0].valor,20);
  m.ejecutarComandosTacticos(w,'b','a','custodia',[{tipo:'vincular',clave:'custodia',duracion:3}]);
  m.ejecutarComandosTacticos(w,'c','b','custodia',[{tipo:'vincular',clave:'custodia',duracion:3}]);
  m.danarTactico(w,'e','a','golpe',50);
  assert.equal(w.unidades.find(u=>u.id==='b').hp,91);
  assert.equal(w.unidades.find(u=>u.id==='c').hp,100);
  assert.equal(w.unidades[0].hp,69);
});
test('un familiar reemplaza al anterior y las órdenes comparten un pulso por ciclo',()=>{
  const w=mundo();
  const invocar=clave=>m.ejecutarComandosTacticos(w,'a','e','invocar',[{tipo:'invocar',clave,potencia:8,duracion:3,mantenimiento:2}]);
  invocar('f1');invocar('f2');
  assert.equal(w.unidades[0].estados.filter(e=>e.familia==='acompanante').length,1);
  for(let i=0;i<3;i++)m.ejecutarComandosTacticos(w,'a','e','orden',[{tipo:'ordenar',modo:'asalto'}]);
  assert.equal(w.unidades[1].hp,92);
  for(let i=0;i<3;i++)m.avanzarRelojTactico(w,'turno','a');
  assert.equal(w.unidades[1].hp,92);
  m.avanzarRelojTactico(w,'ciclo');
  assert.equal(w.unidades[1].hp,84);
  assert.equal(w.unidades[0].mana,16);
});
test('no pagar mantenimiento retira al familiar antes de su pulso',()=>{
  const w=mundo();w.unidades[0].mana=0;
  m.ejecutarComandosTacticos(w,'a','e','invocar',[{tipo:'invocar',clave:'f',potencia:30,duracion:3,mantenimiento:2}]);
  m.avanzarRelojTactico(w,'ciclo');
  assert.equal(w.unidades[1].hp,100);assert.equal(w.unidades[0].estados.length,0);
});
test('transferir protección conserva presupuesto y duración',()=>{
  const w=mundo([unidad('b')]);m.aplicarEstadoTactico(w,'a',estado('guardia',20));
  m.ejecutarComandosTacticos(w,'a','b','traslado',[{tipo:'transferir',familia:'guardia',fraccion:.5}]);
  const a=w.unidades[0].estados[0],b=w.unidades[2].estados[0];
  assert.equal(a.valor+b.valor,20);assert.equal(a.restantes,b.restantes);
});
test('pacto no mata ni se contabiliza como daño enemigo',()=>{
  const w=mundo();w.unidades[0].hp=2;
  m.ejecutarComandosTacticos(w,'a','e','pacto',[{tipo:'pacto',fraccionVida:.2,duracion:3}]);
  assert.equal(w.unidades[0].hp,1);assert.equal(w.eventos.some(e=>e.tipo==='dano'),false);
});
test('un efecto débil no renueva ni acumula la magnitud del fuerte',()=>{
  const w=mundo();m.aplicarEstadoTactico(w,'a',estado('guardia',20,{restantes:1}));
  m.aplicarEstadoTactico(w,'a',estado('guardia',5,{creadorId:'b',restantes:3}));
  assert.equal(m.potenciaFamiliaTactica(w.unidades[0],'guardia'),20);
  m.avanzarRelojTactico(w,'turno','a');
  assert.equal(m.potenciaFamiliaTactica(w.unidades[0],'guardia'),5);
});
test('congelar la representación JSON conserva la reanudación determinista',()=>{
  const w=mundo();m.aplicarEstadoTactico(w,'e',estado('herida',9));
  const reanudado=JSON.parse(JSON.stringify(w));
  m.avanzarRelojTactico(w,'turno','e');m.avanzarRelojTactico(reanudado,'turno','e');
  assert.deepEqual(w,reanudado);
});
test('presencia de aliados inactivos no cambia el resultado individual',()=>{
  const solo=mundo(),party=mundo([unidad('b','aliado',{hp:0})]);
  for(const w of [solo,party]) {
    m.aplicarEstadoTactico(w,'e',estado('herida',8));
    m.adelantarPulsoTactico(w,'a','e','avance','herida');
    m.avanzarRelojTactico(w,'turno','e');
  }
  assert.deepEqual(solo.unidades,party.unidades.slice(0,2));assert.deepEqual(solo.eventos,party.eventos);
});
