# Espadachín Tier 1 — Caminar

## Estado

**Tiras y fotogramas fuente versionados en `main`** en commits separados por sexo. Los recursos permanecen aislados de las hojas activas de runtime hasta que se complete el conjunto de acciones.

## Tiras finales

- `espadachin-m-walk.png`: masculino, 256 × 128 px, cuatro celdas de 64 × 128.
- `espadachin-f-walk.png`: femenino, 256 × 128 px, cuatro celdas de 64 × 128.
- Fotogramas fuente RGBA: `frames/m/` y `frames/f/`, cuatro PNG por sexo.

## Verificación técnica

Los binarios se han colocado en esta carpeta reutilizando exactamente los blobs ya subidos dentro del paquete `docs/espadachin-caminar-entrega/`, evitando re-codificar PNG a Base64. El paquete de origen registra estos SHA-256:

- Masculino: `9aace7bba61966a9b4102541a3b14725f40779863160e5a3c827d06e7f597650` (8.469 bytes).
- Femenino: `0e22fb6372152c486f69ef454f6adeaeae1b04d7aaf1f634f5191dd5f275a0ce` (9.376 bytes).

El informe QA confirma transparencia real, límites visibles dentro de las celdas, y cuatro fotogramas distintos por tira. Las armas no están dibujadas dentro del cuerpo y se incorporarán como capas equipables.

## Siguiente paso

Revisar la animación a tamaño nativo y continuar con **Recibir daño masculino**. No sustituir las hojas de runtime hasta completar y comprobar las 15 acciones por sexo.
