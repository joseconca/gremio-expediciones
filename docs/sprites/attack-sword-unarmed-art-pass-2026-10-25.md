# Ataque con espada — Novato masculino, animación corporal sin arma

Fecha de preparación: 2026-10-25  
Rama de destino: `creacion-sprite-sheets`  
Siguiente recurso del checkpoint: `novato-m-attack_sword-01`

## Decisión de producción

Las armas se dibujan como sprites superpuestos. Por tanto, **los PNG de cuerpo para ataques no deben contener espada, hacha, arco, proyectiles ni estelas**. En la acción de espada solo se animan torso, brazos, manos, piernas, bufanda y centro de gravedad. El arma y su efecto se componen en una capa separada.

## Resultado artístico preparado

El paquete `novato-attack-sword-unarmed-2026-10-25` contiene cuatro PNG de 128×256, cuatro JSON de QA, una vista de control y el instalador `install_action.py`.

| Fotograma | SHA-256 del PNG | QA |
|---:|---|---|
| 01 | `12298de65cb21677b6d4b7181cc58a19732f972ea0824eb686ab5069f143f081` | `technical-passed-visual-review-pending` |
| 02 | `2e52c9e3882a18daf85672251157cdd8cb5c065899b003b2ed23c7fa5940ca8d` | `technical-passed-visual-review-pending` |
| 03 | `52fd629e013e78ebfd942cea8a752c5035cc5bd5dd682a349d50c7ef7a3b3692` | `technical-passed-visual-review-pending` |
| 04 | `50622201b52616b2124fbf464f0660665e58c82761aa947e1dadda4789bcda57` | `technical-passed-visual-review-pending` |

QA comprobado localmente: celda exacta 128×256; transparencia real mediante índice PNG `tRNS`; contenido visible; sin píxeles opacos de fondo cromático; sin arma integrada; caja de personaje dentro de la celda. La línea base de botas está alineada en y=244.

## Estado de publicación

Este registro **no declara los cuatro PNG como publicados**. En este momento, el manifiesto remoto continúa apuntando a `novato-m-attack_sword-01`. Los binarios no se incorporarán a las rutas de producción hasta que el instalador copie los archivos del paquete, valide sus hashes y publique un commit de arte con SHA remoto verificable.

Cuando el paquete esté extraído en `docs/novato-attack-sword-unarmed-2026-10-25/`, ejecutar desde la raíz del checkout:

```powershell
python docs/novato-attack-sword-unarmed-2026-10-25/install_action.py
```

El script exige rama `creacion-sprite-sheets`, sincronización con `origin`, QA/hashes correctos, transparencia y destinos sin colisiones. Publica primero los recursos de arte y luego el manifiesto/checkpoint, verificando ambos SHA remotos. Tras completar esta acción, el siguiente recurso será `novato-m-attack_axe-01`.

No modificar runtime ni ensamblar el atlas de 60 celdas todavía. La revisión visual en combate y el ajuste con el sprite de arma superpuesto quedan pendientes.
