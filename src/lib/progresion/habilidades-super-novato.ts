import type { DefinicionHabilidad } from "../tiposJuego";

const base={claseId:"superNovato",rareza:"basico" as const,precio:0,costePuntosHabilidad:1};
export const HABILIDADES_SUPER_NOVATO:DefinicionHabilidad[]=[
  {...base,id:"superNovato_enlace",nombre:"Técnica de enlace",descripcion:"",tipo:"activa",efecto:"dano",nivelJobRequerido:1,costeEnergia:35,cooldownTurnos:3},
  {...base,id:"superNovato_recurso",nombre:"Recurso improvisado",descripcion:"",tipo:"activa",efecto:"curacion",nivelJobRequerido:20,costeMana:8,cooldownTurnos:6},
  {...base,id:"superNovato_leccion",nombre:"Lección práctica",descripcion:"",tipo:"activa",efecto:"dano",nivelJobRequerido:40,costeEnergia:35,costeMana:5,cooldownTurnos:5},
  {...base,id:"superNovato_incansable",nombre:"Aprendiz incansable",descripcion:"",tipo:"pasiva",nivelJobRequerido:25},
  {...base,id:"superNovato_contingencia",nombre:"Plan de contingencia",descripcion:"",tipo:"pasiva",nivelJobRequerido:60},
];
