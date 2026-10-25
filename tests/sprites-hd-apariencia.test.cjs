require('./load-typescript.cjs');
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('typescript');
function route(user,db){
  const file=path.resolve(__dirname,'../src/app/api/combate/apariencia/route.ts');
  const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const deps={'next/server':{NextResponse:{json:(body,init={})=>({body,status:init.status??200,headers:init.headers??{}})}},'@/lib/auth':{getAuthenticatedUser:async()=>user},'@/lib/prisma':{prisma:db}};
  const m={exports:{}};vm.runInThisContext('(function(require,module,exports){'+compiled+'\n})',{filename:file})(id=>deps[id],m,m.exports);return m.exports;
}
test('appearance requires a session and combat id before accessing combat data',async()=>{
  assert.equal((await route(null,{}).GET(new Request('https://game.test/api/combate/apariencia?id=x'))).status,401);
  assert.equal((await route({id:'me'},{}).GET(new Request('https://game.test/api/combate/apariencia'))).status,400);
});
test('non-participants cannot load a rival appearance',async()=>{
  let where;const r=route({id:'outsider'},{combateActivo:{findFirst:async input=>{where=input.where;return null;}}});
  assert.equal((await r.GET(new Request('https://game.test/api/combate/apariencia?id=c1'))).status,404);
  assert.deepEqual(where.OR,[{atacanteUsuarioId:'outsider'},{defensorUsuarioId:'outsider'}]);
});
test('a participant receives only class, sex and equipped catalog ids without private character data',async()=>{
  let query;const r=route({id:'a'},{combateActivo:{findFirst:async()=>({atacanteUsuarioId:'a',defensorUsuarioId:'b'})},personaje:{findMany:async q=>{query=q;return [{usuarioId:'b',clase:'Novato',sexo:'chica',profesionActivaId:'mago',equipoEquipado:{arma:{objetoId:'baston_runico'},manoSecundaria:null}}];}}});
  const response=await r.GET(new Request('https://game.test/api/combate/apariencia?id=c1'));
  assert.equal(response.status,200);assert.deepEqual(query.where.usuarioId.in,['a','b']);
  assert.deepEqual(response.body.apariencias.b,{clase:'Novato',sexo:'chica',profesionActivaId:'mago',armaSpriteId:'baston_runico',escudoSpriteId:null});
  assert.equal(query.select.password,undefined);assert.equal(query.select.inventario,undefined);
  assert.equal(response.headers['Cache-Control'],'private, no-store');
});
