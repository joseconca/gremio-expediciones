const fs=require('node:fs');
require('../tests/load-typescript.cjs');
const {HABILIDADES,HABILIDADES_BASE}=require('../src/lib/habilidades.ts');
const {CLASES,puedeUsarHabilidadDeClase}=require('../src/lib/progresion/clases.ts');
const originales=HABILIDADES_BASE.filter(h=>fs.existsSync(`public/sprites/habilidades/${h.id}.svg`));
let creados=0;
for(const h of HABILIDADES){
  const destino=`public/sprites/habilidades/${h.id}.svg`;
  if(fs.existsSync(destino))continue;
  const candidata=originales.find(b=>b.claseId===h.claseId&&b.tipo===h.tipo)??originales.filter(b=>b.tipo===h.tipo&&puedeUsarHabilidadDeClase(h.claseId,b.claseId)).sort((a,b)=>CLASES[b.claseId].tier-CLASES[a.claseId].tier)[0]??originales.find(b=>b.tipo===h.tipo);
  const original=fs.readFileSync(`public/sprites/habilidades/${candidata.id}.svg`,'utf8');
  const distintivo=h.claseId==='superNovato'?'<path d="M5 19h4v-4h4v-4h4v4h4v4h4v4h-8v4h-4v-4H5Z" fill="#f8dc72" stroke="#17171b" stroke-width="1"/>':'<rect x="3" y="21" width="14" height="8" fill="#172d39" stroke="#7bd5e6"/><path d="M6 23v4m3-4v4m3-4v4m3-4v4" stroke="#b8eff7" stroke-width="1"/>';
  fs.writeFileSync(destino,original.replace('</svg>',distintivo+'</svg>'));creados++;
}
console.log(`Iconos propios preparados: ${creados}`);
