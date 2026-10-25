require('./load-typescript.cjs');
const test=require('node:test'); const assert=require('node:assert/strict');
const fs=require('node:fs'); const path=require('node:path'); const crypto=require('node:crypto');
const hd=require('../src/lib/sprites-heroes-hd.ts');
const {dibujarHeroeHd}=require('../src/lib/dibujar-heroe-hd.ts');
const config=require('../src/lib/configuracionJuego.ts');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');

test('promoted body bytes and packed equipment metadata match the reviewed sources',()=>{
  const m=JSON.parse(read('assets/spritesheets/hd-128x256/equipment/manifest.json'));
  for(const c of m.classes) for(const s of ['m','f']) {
    assert.equal(sha(read(`public/sprites/hd-v1/heroes/${c}/${s}-sheet.png`)),sha(read(`assets/spritesheets/hd-128x256/${c}/${s}/${c}-${s}-sheet.png`)));
    assert.equal(sha(read(`public/sprites/hd-v1/heroes/${c}/${s}-idle.png`)),m.renderPolicy.bodyFrameHashes[c+'-'+s].idle['01']);
  }
  for(const [id,item] of Object.entries(m.items)) for(const s of ['m','f']) {
    const b=read(`public/sprites/hd-v1/equipment/${id}/${s}-sheet.png`);
    assert.ok(b.readUInt32BE(16)<1536);assert.ok(b.readUInt32BE(20)<5760);
    for(const frames of Object.values(hd.obtenerEquipoSpriteHd(id).frames[s])) for(const f of frames) {
      assert.ok(f.source[0]+f.source[2]<=b.readUInt32BE(16));assert.ok(f.source[1]+f.source[3]<=b.readUInt32BE(20));
      assert.ok(f.offset[0]+f.source[2]<=384);assert.ok(f.offset[1]+f.source[3]<=384);
    }
    for(const [a,frames] of Object.entries(item.sheets[s].actions))
      assert.deepEqual(hd.BIBLIOTECA_SPRITES_HD.compositions[hd.obtenerEquipoSpriteHd(id).composition][s][a],
        frames.map(f=>Object.fromEntries(['depth','contacts','restoreHands','handMaskRadius'].map(k=>[k,f.config[k]]))));
  }
});
test('only completed classes select HD; higher tiers and legacy avatars keep their fallback',()=>{
  for(const c of ['novato','mago','espadachin','acolito','arquero']) {
    assert.ok(config.obtenerRutaSpritesheetHeroe(c,'chica',c).includes(`/hd-v1/heroes/${c}/f-sheet.png`));
    assert.ok(config.obtenerSpriteHeroe(c,'chico',c).endsWith('/m-portrait.png'));
  }
  assert.ok(!config.obtenerRutaSpritesheetHeroe('caballero','chico','caballero').includes('/hd-v1/'));
  assert.ok(!config.obtenerRutaSpritesheetHeroe('Guerrero','chico','novato').includes('/hd-v1/'));
});
test('actual equipment selects every weapon attack; misses, damage and potions take precedence',()=>{
  const expected={sword:'attack_sword',axe:'attack_axe',spear:'attack_spear',dagger:'attack_dagger',bow:'attack_bow',staff:'attack_staff',mace:'attack_mace',book:'attack_book',gloves:'attack_gloves'};
  for(const [id,item] of Object.entries(hd.BIBLIOTECA_SPRITES_HD.items)) if(expected[item.family]) assert.equal(hd.resolverAccionHeroeHd({animando:true,armaId:id}),expected[item.family]);
  assert.equal(hd.resolverAccionHeroeHd({impactado:true,animando:true,armaId:'arco_madera'}),'hurt');
  assert.equal(hd.resolverAccionHeroeHd({esquivando:true,animando:true}),'dodge');
  assert.equal(hd.resolverAccionHeroeHd({animando:true,accionExplicita:'use_consumable'}),'use_consumable');
  assert.equal(hd.resolverAccionHeroeHd({animando:true,animacion:'escudo',escudoId:'escudo_madera'}),'block_shield');
});
test('two-handed weapons exclude shields and incompatible rows never borrow another grip',()=>{
  assert.deepEqual(hd.obtenerCapasHeroeHd('attack_bow','arco_madera','escudo_madera'),['arco_madera']);
  assert.deepEqual(hd.obtenerCapasHeroeHd('attack_sword','espada_hierro','escudo_madera'),['espada_hierro','escudo_madera']);
  assert.deepEqual(hd.obtenerCapasHeroeHd('use_consumable','arco_madera','escudo_madera'),['pocion']);
  assert.deepEqual(hd.obtenerCapasHeroeHd('attack_bow','espada_hierro'),[]);
});
test('one shared clock gives exact release phases, loops and stable reduced-motion poses',()=>{
  assert.equal(hd.obtenerFotogramaHeroeHd('attack_bow','m',169),0);
  assert.equal(hd.obtenerFotogramaHeroeHd('attack_bow','m',170),1);
  assert.equal(hd.obtenerFotogramaHeroeHd('attack_bow','m',280),2);
  assert.equal(hd.obtenerFotogramaHeroeHd('attack_bow','m',5000),3);
  assert.equal(hd.obtenerFotogramaHeroeHd('idle','f',1200),0);
  assert.equal(hd.obtenerFotogramaHeroeHd('attack_bow','f',999,true),2);
  assert.equal(hd.obtenerFotogramaHeroeHd('idle','f',999,true),0);
});
test('all canvas layers share the same frame rectangle, body origin and single reflection',()=>{
  const calls=[]; const ctx={};for(const method of ['clearRect','save','restore','translate','scale','beginPath','moveTo','arc','clip','drawImage'])ctx[method]=(...a)=>calls.push([method,...a]);
  dibujarHeroeHd(ctx,'BODY',[{id:'espada_hierro',imagen:'SWORD'},{id:'escudo_madera',imagen:'SHIELD'}],'attack_sword','f',2,true);
  assert.deepEqual(calls.filter(c=>c[0]==='scale'),[['scale',-1,1]]);
  const draws=calls.filter(c=>c[0]==='drawImage');
  assert.deepEqual(draws[0],['drawImage','BODY',256,1536,128,256,128,64,128,256]);
  const rect=hd.obtenerEquipoSpriteHd('espada_hierro').frames.f.attack_sword[2];
  assert.deepEqual(draws.find(c=>c[1]==='SWORD'),['drawImage','SWORD',...rect.source,...rect.offset,rect.source[2],rect.source[3]]);
  assert.ok(draws.findIndex(c=>c[1]==='SWORD')<draws.findIndex(c=>c[1]==='SHIELD'));
  assert.ok(calls.some(c=>c[0]==='clip'));
});
test('multi-target impacts never turn an uninvolved ally into an attacker or potion user',()=>{
  const state={actorImpactado:null,actorEsquivando:null,actorSpriteAnimando:'healer',objetivosMultiplesImpactados:['ally'],animacionActual:'curacion',accionSpriteActual:'use_consumable',inicioAccionSprite:10,inicioImpactoSprite:20};
  assert.equal(hd.propsSpriteHeroeHd(state,'healer').accion,'use_consumable');
  assert.equal(hd.propsSpriteHeroeHd(state,'ally').accion,'hurt');
  assert.equal(hd.propsSpriteHeroeHd(state,'unrelated').accion,'idle');
  assert.equal(hd.propsSpriteHeroeHd(state,'ally').inicioAnimacion,20);
});
