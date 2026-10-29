/** Catálogo explícito de la técnica adicional de cada clase. */
export const CATALOGO_TECNICAS_ADICIONALES = {
  "novato": {
    "nombre": "Evaluar el peligro",
    "descripcion": "Observa una preparación enemiga y prepara precisión para un ataque; no roba un turno.",
    "programa": "observar"
  },
  "espadachin": {
    "nombre": "Cambio de empuñadura",
    "descripcion": "Sacrifica una guardia propia para preparar Apertura sin golpear al enemigo.",
    "programa": "guardia_apertura"
  },
  "acolito": {
    "nombre": "Recogimiento",
    "descripcion": "Transfiere parte de tu regeneración pendiente a un aliado sin duplicar sus pulsos.",
    "programa": "transferir_regeneracion"
  },
  "arquero": {
    "nombre": "Disparo de señal",
    "descripcion": "Marca al objetivo para que un aliado aproveche una exposición breve, en vez de aumentar tu daño inmediato.",
    "programa": "senal"
  },
  "mago": {
    "nombre": "Disipar chispa",
    "descripcion": "Consume una brasa propia sobre el objetivo para romper parte de una protección mágica.",
    "programa": "brasa_ruptura"
  },
  "superNovato": {
    "nombre": "Cambiar de lección",
    "descripcion": "Consume una preparación propia para cambiar de posición y preparar la siguiente disciplina; no copia otra habilidad.",
    "programa": "leccion_movilidad"
  },
  "caballero": {
    "nombre": "Relevo de escudo",
    "descripcion": "Transfiere la mitad de tu protección restante al aliado elegido conservando su expiración.",
    "programa": "transferir_guardia"
  },
  "duelista": {
    "nombre": "Desafío medido",
    "descripcion": "Debilita una preparación rival y prepara una lectura para tu siguiente respuesta.",
    "programa": "lectura"
  },
  "sacerdote": {
    "nombre": "Cerrar la herida",
    "descripcion": "Adelanta un pulso de tu regeneración sobre el aliado y elimina una herida; el pulso adelantado desaparece del futuro.",
    "programa": "cerrar_herida"
  },
  "monje": {
    "nombre": "Soltar tensión",
    "descripcion": "Consume una preparación de chi para limpiar una exposición propia; sin chi conserva una guardia menor.",
    "programa": "soltar_chi"
  },
  "cazador": {
    "nombre": "Cambiar de presa",
    "descripcion": "Traslada tu marca a otro enemigo y reduce una preparación del nuevo objetivo; no deja dos presas.",
    "programa": "cambiar_presa"
  },
  "explorador": {
    "nombre": "Rastro falso",
    "descripcion": "Retirada hacia retaguardia que prepara una resistencia breve a las marcas enemigas.",
    "programa": "rastro_falso"
  },
  "elementalista": {
    "nombre": "Templar elemento",
    "descripcion": "Aplica mojado sin daño para preparar una reacción; sustituye la preparación elemental anterior.",
    "programa": "mojado"
  },
  "brujo": {
    "nombre": "Romper maleficio",
    "descripcion": "Consume una maldición propia para adelantar un pulso de su herida; renuncia al mantenimiento restante de esa maldición.",
    "programa": "romper_maleficio"
  },
  "cruzado": {
    "nombre": "Reconciliación",
    "descripcion": "Consume tu guardia para recuperar vida del aliado elegido dentro del presupuesto sacrificado.",
    "programa": "guardia_cura"
  },
  "pirata": {
    "nombre": "Botín de combate",
    "descripcion": "Roba una parte de la protección numérica rival; dura como máximo dos turnos y no crea objetos.",
    "programa": "robar_guardia"
  },
  "druida": {
    "nombre": "Trasplantar",
    "descripcion": "Mueve parte de tu regeneración a un aliado conservando duración; no crea otro ciclo de crecimiento.",
    "programa": "trasplantar"
  },
  "espadachin_runico": {
    "nombre": "Borrar la runa",
    "descripcion": "Consume una inscripción propia para retirarte y resistir una respuesta mágica.",
    "programa": "borrar_runa"
  },
  "paladin": {
    "nombre": "Renovar el voto",
    "descripcion": "Cambia el destinatario de custodia y le prepara resistencia sagrada; termina el vínculo anterior.",
    "programa": "renovar_voto"
  },
  "guardian_real": {
    "nombre": "Evacuación",
    "descripcion": "Vincula al aliado con tu custodia y prepara tu retirada a la fila central; no concede iniciativa.",
    "programa": "evacuacion"
  },
  "asesino": {
    "nombre": "Cortar la retirada",
    "descripcion": "Consume una marca propia para debilitar la preparación enemiga; pierde esa oportunidad de ejecución.",
    "programa": "cortar_retirada"
  },
  "maestro_espadas": {
    "nombre": "Recomponer la forma",
    "descripcion": "Limpia una exposición propia y prepara la forma defensiva, renunciando a continuar la secuencia ofensiva.",
    "programa": "recomponer_forma"
  },
  "oraculo": {
    "nombre": "Revisar el augurio",
    "descripcion": "Cambia una predicción por resistencia al siguiente perjuicio; no añade otra predicción simultánea.",
    "programa": "revisar_augurio"
  },
  "hierofante": {
    "nombre": "Clausura piadosa",
    "descripcion": "Consume un campo propio para adelantar la regeneración del aliado; el campo no vuelve a pulsar.",
    "programa": "clausura"
  },
  "asceta": {
    "nombre": "Paso vacío",
    "descripcion": "Retirada que elimina una exposición propia; gastar energía no genera otra recuperación.",
    "programa": "paso_vacio"
  },
  "gran_maestro": {
    "nombre": "Deshacer la forma",
    "descripcion": "Consume la preparación de forma para transformar su presupuesto en protección breve.",
    "programa": "deshacer_forma"
  },
  "francotirador": {
    "nombre": "Abandonar la mira",
    "descripcion": "Renuncia a la preparación de tiro para cambiar a retaguardia y conseguir una cobertura menor.",
    "programa": "abandonar_mira"
  },
  "domabestias": {
    "nombre": "Llamada de refugio",
    "descripcion": "El acompañante dedica su único pulso del ciclo a proteger al destinatario; no ataca también.",
    "programa": "orden_amparo"
  },
  "guardian_bosque": {
    "nombre": "Sendero protegido",
    "descripcion": "Traslada parte de tu protección a un aliado y prepara una resistencia natural breve.",
    "programa": "sendero"
  },
  "rastreador": {
    "nombre": "Invalidar el rastro",
    "descripcion": "Consume tu observación para reducir una preparación enemiga; no conserva información para el remate.",
    "programa": "invalidar_rastro"
  },
  "archimago": {
    "nombre": "Descompresión",
    "descripcion": "Consume una carga de compresión para limpiar una exposición propia y estabilizar tu próxima preparación.",
    "programa": "descompresion"
  },
  "invocador": {
    "nombre": "Disolver familiar",
    "descripcion": "Sacrifica el acompañante para curarte con una fracción de su presupuesto futuro; no activa premios por final natural.",
    "programa": "disolver_familiar"
  },
  "nigromante": {
    "nombre": "Descanso prestado",
    "descripcion": "Consume una herida funeraria para estabilizarte; no duplica sus pulsos ni cuenta como muerte.",
    "programa": "descanso"
  },
  "demonologo": {
    "nombre": "Revocar contrato",
    "descripcion": "Termina el pacto y prepara una protección breve; la vida comprometida no se devuelve.",
    "programa": "revocar"
  },
  "berserker": {
    "nombre": "Frenar la furia",
    "descripcion": "Consume la preparación ofensiva y limpia una herida propia para volver a protegerte.",
    "programa": "frenar_furia"
  },
  "luchador": {
    "nombre": "Soltar el agarre",
    "descripcion": "Libera una marca de contacto para limpiar una exposición propia y preparar resistencia física.",
    "programa": "soltar_agarre"
  },
  "centinela": {
    "nombre": "Cambiar la vigilancia",
    "descripcion": "Renueva la custodia sobre otro aliado y prepara una señal sobre el siguiente agresor.",
    "programa": "vigilancia"
  },
  "escriba_arcano": {
    "nombre": "Corrección marginal",
    "descripcion": "Retira un sello propio y prepara otro sobre un destinatario distinto; conserva solo el enlace, no su daño.",
    "programa": "correccion"
  },
  "bardo": {
    "nombre": "Silencio entre versos",
    "descripcion": "Cierra la melodía propia para limpiar una exposición de un aliado; no mantiene la canción completa.",
    "programa": "silencio"
  },
  "comerciante": {
    "nombre": "Reserva de emergencia",
    "descripcion": "Consume el suministro preparado para una protección breve; no devuelve consumibles ni produce oro.",
    "programa": "suministro_guardia"
  },
  "chaman": {
    "nombre": "Desanclar tótem",
    "descripcion": "Sacrifica tu campo para protegerte durante la retirada; no crea un segundo tótem.",
    "programa": "desanclar"
  },
  "inquisidor": {
    "nombre": "Archivar testimonio",
    "descripcion": "Consume un testimonio para limpiar una exposición aliada y resistir su siguiente aplicación.",
    "programa": "archivar"
  },
  "heraldo_guerra": {
    "nombre": "Contraorden",
    "descripcion": "Consume una orden propia y prepara cobertura en su lugar; no mantiene las dos órdenes.",
    "programa": "contraorden"
  },
  "ninja": {
    "nombre": "Recoger el señuelo",
    "descripcion": "Retira tu señuelo para limpiar una marca enemiga y volver a retaguardia; pierde el engaño ofensivo.",
    "programa": "recoger_senuelo"
  },
  "alquimista": {
    "nombre": "Neutralización",
    "descripcion": "Retira una herida de un aliado y deja resistencia a su siguiente aplicación; no genera reactivo de daño.",
    "programa": "neutralizar"
  },
  "herrero": {
    "nombre": "Desmontar refuerzo",
    "descripcion": "Consume un refuerzo propio para reparar parcialmente tu guardia; no mejora equipo fuera del combate.",
    "programa": "desmontar"
  },
  "verdugo": {
    "nombre": "Suspender sentencia",
    "descripcion": "Renuncia a la ejecución preparada para defenderte y limpiar una exposición propia.",
    "programa": "suspender"
  },
  "saqueador": {
    "nombre": "Cauterizar",
    "descripcion": "Consume una herida propia del enemigo para recuperar parte de su presupuesto; desaparece toda su duración futura.",
    "programa": "cauterizar"
  },
  "campeon_arena": {
    "nombre": "Romper el clinch",
    "descripcion": "Consume adaptación para eliminar una marca propia y reposicionarte en la fila central.",
    "programa": "romper_clinch"
  },
  "mariscal": {
    "nombre": "Disolver formación",
    "descripcion": "Cierra la formación ofensiva y prepara un vínculo de custodia sin añadir una acción de grupo.",
    "programa": "disolver_formacion"
  },
  "vigia": {
    "nombre": "Ceder la ventana",
    "descripcion": "Consume la preparación de respuesta para proteger a un aliado en vez de disparar.",
    "programa": "ceder_ventana"
  },
  "runista": {
    "nombre": "Circuito abierto",
    "descripcion": "Retira un sello propio para preparar resistencia arcana en un aliado; renuncia a cerrarlo como daño.",
    "programa": "circuito_abierto"
  },
  "abjurador": {
    "nombre": "Descargar barrera",
    "descripcion": "Transfiere parte de tu protección a un aliado; la porción transferida desaparece del lanzador.",
    "programa": "descargar_barrera"
  },
  "senor_guerra": {
    "nombre": "Cerrar el frente",
    "descripcion": "Termina la preparación ofensiva y prepara custodia sobre un aliado; el frente deja de ofrecer ruptura.",
    "programa": "cerrar_frente"
  },
  "avatar_tormenta": {
    "nombre": "Disipar tempestad",
    "descripcion": "Consume el campo de tempestad y limpia una exposición propia; pierde todos los pulsos futuros.",
    "programa": "disipar_tempestad"
  },
  "cazador_espectral": {
    "nombre": "Liberar vínculo",
    "descripcion": "Termina tu vínculo funerario y adelanta una regeneración propia; no drena hacia dos destinatarios.",
    "programa": "liberar_vinculo"
  },
  "arconte": {
    "nombre": "Redistribuir santuario",
    "descripcion": "Mueve parte de tu protección acumulada a un aliado manteniendo el presupuesto total de Luz.",
    "programa": "redistribuir"
  },
  "justiciero": {
    "nombre": "Saldar agravio",
    "descripcion": "Consume la deuda preparada para proteger al perjudicado en vez de infligir represalia.",
    "programa": "saldar"
  },
  "hoja_velo": {
    "nombre": "Anclar al mundo",
    "descripcion": "Cierra el Velo y limpia una exposición propia; pierde el acceso a la retaguardia durante esa ventana.",
    "programa": "anclar"
  },
  "danzaespadas": {
    "nombre": "Romper el compás",
    "descripcion": "Renuncia al compás para trasladar protección a un aliado y volver a la fila central.",
    "programa": "romper_compas"
  },
  "corsario": {
    "nombre": "Abandonar abordaje",
    "descripcion": "Consume el plan de incursión para preparar una retirada protegida; no conserva sus etapas de daño.",
    "programa": "abandonar_abordaje"
  }
} as const;
