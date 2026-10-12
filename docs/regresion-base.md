# Checklist de regresión — juego de navegador (\`/base\`)

Esta lista complementa las pruebas automatizadas con verificaciones funcionales en navegador y base de datos. No modifica ni valida el prototipo independiente de \`newGame\`.

## 1. Comandos previos

Desde la raíz del proyecto y en la rama \`refactor-en-server-y-limpieza\`:

\`\`\`powershell
npm run test:base
npm run lint
npm run build
\`\`\`

Para probar el flujo visual, inicia el servidor con la configuración local habitual y utiliza una cuenta de prueba. No uses una cuenta con progreso que quieras conservar.

## 2. Autenticación y creación del personaje

- [ ] Las rutas de mercado, herrería, acciones de jugador y expediciones devuelven \`401\` sin sesión.
- [ ] Un usuario nuevo puede establecer una base y reclutar un personaje.
- [ ] Coordenadas inválidas (latitud fuera de \`[-90, 90]\`, longitud fuera de \`[-180, 180]\`, valores no finitos) se rechazan sin modificar la base.
- [ ] Tras recargar la página, la base, el personaje, recursos y edificios siguen persistidos.
- [ ] Una respuesta de jugador nunca incluye el campo \`password\`.

## 3. Mercado y economía

- [ ] Una compra válida descuenta el oro y añade exactamente la cantidad solicitada del recurso.
- [ ] Los precios y el coste se calculan en servidor; manipular \`precioUnitario\`, \`costeTotal\` u oro en la petición no los altera.
- [ ] Se rechazan recurso no válido, cantidad cero, negativa, fraccionaria, no numérica o por encima del límite.
- [ ] Sin Mercado, la compra se rechaza.
- [ ] Con oro insuficiente, ni el oro ni los recursos cambian.
- [ ] Con dos compras simultáneas que intentan gastar el mismo saldo, solo se aceptan las que el saldo permite; nunca hay saldo negativo ni recursos entregados sin cobrar.

## 4. Herrería e inventario

- [ ] Comprar un arma o una armadura válida descuenta el precio e incorpora un solo objeto al inventario.
- [ ] Sin Armería, con nivel de héroe insuficiente, con objeto inexistente o con un tipo no vendible, la petición se rechaza.
- [ ] Una segunda compra del mismo objeto devuelve conflicto y no vuelve a cobrar.
- [ ] Dos compras simultáneas del mismo objeto producen como máximo una unidad y un solo débito.
- [ ] Si la inserción del objeto falla dentro de la transacción, el débito de oro se revierte.

## 5. Mejoras, curación y edificios

- [ ] La mejora de atributo rechaza atributos desconocidos y no permite superar el límite del nivel del edificio.
- [ ] Dos peticiones simultáneas no compran dos veces el mismo incremento cuando solo queda una mejora disponible.
- [ ] Una mejora de edificio comprueba oro, madera, piedra y metal; faltar cualquiera de ellos deja nivel y recursos intactos.
- [ ] Los requisitos previos y nivel máximo de los edificios se aplican en servidor.
- [ ] Una mejora válida descuenta los cuatro costes y guarda el nuevo nivel; recargar conserva el resultado.
- [ ] Curar con el personaje a plena vida, sin oro o mientras está de expedición no cobra oro ni cambia la vida.
- [ ] Dos acciones concurrentes no duplican curación ni compran mejoras basadas en un estado obsoleto.

## 6. Expediciones

- [ ] \`GET /api/expediciones/disponibles\` requiere sesión y devuelve \`Cache-Control: no-store\`.
- [ ] Las misiones disponibles concuerdan con la base y el nivel persistidos del personaje.
- [ ] Iniciar una misión envía solo su \`misionId\`; cambiar recompensa, duración o coordenadas del cuerpo no permite fijar esos valores en servidor.
- [ ] Una misión caducada, inventada o ya no disponible se rechaza sin crear una expedición.
- [ ] Dos intentos simultáneos de iniciar expedición no crean dos expediciones activas.
- [ ] Las expediciones de comercio y asedio comprueban el destino persistido y que ambos gremios cumplan los requisitos de Embajada.

## 7. Combate y persistencia

- [ ] Un combate termina con un resultado coherente; no se entregan recompensas dos veces al repetir la petición.
- [ ] Si dos asedios contra la misma base terminan a la vez, el botín total no supera los recursos vulnerables y ningún recurso queda en negativo.
- [ ] Los cambios de vida, oro, experiencia e inventario se reflejan al volver a cargar el jugador.
- [ ] La interfaz comunica conflictos y errores del servidor sin mostrar una compra o expedición como realizada si el servidor la rechazó.
- [ ] Las páginas principales de \`/base\` (Taberna, Armería, Herrería, Mercado, Almacén, Muralla, Escuela de batalla y Expediciones) cargan sin errores de consola.

## Resultado

Marca cada punto como **OK**, **Falla** o **No probado** y registra la ruta, petición y estado HTTP de cualquier fallo. Las pruebas de \`test:base\` simulan Prisma para comprobar la lógica de las rutas; no sustituyen una verificación de integración contra PostgreSQL real.
