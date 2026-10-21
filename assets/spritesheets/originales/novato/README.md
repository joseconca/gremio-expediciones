# Novato — fuentes v2 canónicas

El paquete activo de arte se encuentra en `assets/spritesheets/originales/novato/v2/`. Contiene los másteres masculino y femenino de tres filas, las tiras canónicas de Idle, Caminar y Recibir daño, los frames nativos, las previews y los informes QA.

Las tiras v2 de esas tres acciones están integradas en las primeras filas de `public/sprites/heroes/novato/novato-{m,f}-sheet.png`. Los retratos `novato-{m,f}.png` se derivan del primer fotograma de Idle. El componente `SpriteHeroeAnimado` consume el atlas en combate y asedios; las demás pantallas siguen utilizando el retrato estático.

Las filas 3-14 se conservan desde la capa modular existente mientras se renuevan las acciones por arma. No regenerar las tiras base con las fuentes antiguas: el generador lee directamente el paquete v2.
