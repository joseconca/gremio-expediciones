require('./load-typescript.cjs');
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const {ENEMIGOS_HD,ACCIONES_ENEMIGO_HD,propsSpriteEnemigoHd,fotogramaEnemigoHd,dibujarEnemigoHd}=require('../src/lib/sprites-enemigos-hd.ts');
const root=path.resolve(__dirname,'..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');

test('all 54 deployed atlases match reviewed artwork, dimensions, species heights and anchors',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/spritesheets/enemies-hd/manifest.json'),'utf8'));
  assert.equal(Object.keys(ENEMIGOS_HD).length,54);
  for(const e of manifest.enemies){
    const sprite=ENEMIGOS_HD[e.id];assert.ok(sprite,e.id);
    const qa=JSON.parse(fs.readFileSync(path.join(root,e.report),'utf8'));
    const raw=fs.readFileSync(path.join(root,'public',sprite.src));
    assert.equal(sha(raw),qa.sheetSha256);assert.equal(sprite.sha256,qa.sheetSha256);
    assert.equal(raw.readUInt32BE(16),sprite.cellSize*4);assert.equal(raw.readUInt32BE(20),sprite.cellSize*4);
    assert.deepEqual(sprite.anchor,qa.actorAnchor);assert.equal(sprite.height,qa.requestedIdleHeight);
    assert.equal(sprite.anchor[0],sprite.cellSize/2,'reflection must preserve horizontal support');
  }
});
test('single and multiple damage, dodge, attackers and support actions select only their own rows',()=>{
  const s={actorImpactado:null,actorEsquivando:null,actorSpriteAnimando:'archer',objetivosMultiplesImpactados:[],animacionActual:'ofensiva',inicioAccionSprite:100,inicioImpactoSprite:200};
  assert.deepEqual(propsSpriteEnemigoHd(s,'archer'),{accion:'attack',inicioAnimacion:100});
  assert.deepEqual(propsSpriteEnemigoHd(s,'other'),{accion:'idle',inicioAnimacion:0});
  assert.equal(propsSpriteEnemigoHd({...s,actorImpactado:'archer'},'archer').accion,'hurt');
  assert.deepEqual(propsSpriteEnemigoHd({...s,actorEsquivando:'other'},'other'),{accion:'dodge',inicioAnimacion:200});
  for(const id of ['one','two'])assert.equal(propsSpriteEnemigoHd({...s,objetivosMultiplesImpactados:['one','two']},id).accion,'hurt');
  for(const animacionActual of ['curacion','defensiva','escudo',null])assert.equal(propsSpriteEnemigoHd({...s,animacionActual},'archer').accion,'idle');
});
test('idle loops; attacks reach impact at 250ms; reactions finish once and reduced motion is static',()=>{
  assert.equal(fotogramaEnemigoHd('idle',1200),0);assert.equal(fotogramaEnemigoHd('idle',1199),3);
  assert.equal(fotogramaEnemigoHd('attack',249),1);assert.equal(fotogramaEnemigoHd('attack',250),2);
  for(const a of ['attack','hurt','dodge']){assert.equal(fotogramaEnemigoHd(a,-1),0);assert.equal(fotogramaEnemigoHd(a,10000),3);}
  assert.equal(fotogramaEnemigoHd('attack',999,true),2);assert.equal(fotogramaEnemigoHd('idle',999,true),0);
});
test('every action crops exactly one cell, without fitting or shrinking the artwork; reflection occurs once',()=>{
  for(const sprite of Object.values(ENEMIGOS_HD))for(const [row,a] of ACCIONES_ENEMIGO_HD.entries())for(let f=0;f<4;f++){
    const calls=[];const ctx={};for(const op of ['clearRect','save','translate','scale','drawImage','restore'])ctx[op]=(...args)=>calls.push([op,...args]);
    dibujarEnemigoHd(ctx,'ATLAS',sprite,a,f,true);const c=sprite.cellSize;
    assert.deepEqual(calls.find(c=>c[0]==='drawImage'),['drawImage','ATLAS',f*c,row*c,c,c,0,0,c,c]);
    assert.deepEqual(calls.filter(c=>c[0]==='scale'),[['scale',-1,1]]);
  }
});

test('all animation bounds fit mobile and desktop battle regions without changing scale between poses',()=>{
  const {escalaEnemigoEnEscena}=require('../src/lib/sprites-enemigos-hd.ts');
  for(const [id,s] of Object.entries(ENEMIGOS_HD)) {
    const qa=JSON.parse(fs.readFileSync(path.join(root,'assets/spritesheets/enemies-hd',id,'qa-report.json'),'utf8'));
    const frames=Object.values(qa.frameData).flat();
    assert.deepEqual(s.bounds,[Math.min(...frames.map(f=>f.bounds[0])),Math.min(...frames.map(f=>f.bounds[1])),Math.max(...frames.map(f=>f.bounds[2])),Math.max(...frames.map(f=>f.bounds[3]))]);
    for(const [w,h] of [[140,220],[180,380],[360,260],[560,640]]) for(const [x,y] of [[50,50],[28,32],[72,68],[22,32],[78,68]]) {
      const u=escalaEnemigoEnEscena(s,w,h,x,y,1.058824);
      assert.ok(u>0 && u<=1.058824);
      for(const {bounds:[l,t,r,b]} of frames) {
        const center=w*x/100, feet=h*y/100+15+s.height*u/2;
        for(const reflected of [false,true]) {
          const left=center+(reflected?s.anchor[0]-r:l-s.anchor[0])*u;
          const right=center+(reflected?s.anchor[0]-l:r-s.anchor[0])*u;
          assert.ok(left>=15.99 && right<=w-15.99,`${id}: horizontal bounds`);
        }
        assert.ok(feet+(t-s.anchor[1])*u>=0,`${id}: top`);
        assert.ok(feet+(b-s.anchor[1])*u<=h,`${id}: bottom`);
      }
    }
  }
});
