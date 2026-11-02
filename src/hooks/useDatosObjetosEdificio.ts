"use client";

import { useEffect, useState } from "react";
import type { DatosObjetos } from "@/lib/equipamiento/datos-objetos";

/**
 * Lee el inventario compartido por Armería y Herrería.
 * La clave de carga permite refrescar al cambiar los niveles de edificios.
 * Las operaciones de compra, venta y mejora permanecen en cada página.
 */
export function useDatosObjetosEdificio(habilitado: boolean, claveCarga: string) {
  const [datos, setDatos] = useState<DatosObjetos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!habilitado) return;

    const cargarObjetos = async () => {
      setCargando(true);
      setError(null);

      try {
        const respuesta = await fetch("/api/objetos", {
          cache: "no-store",
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok) {
          setError(resultado.error || "No se pudieron cargar los objetos.");
          return;
        }
        setDatos(resultado as DatosObjetos);
      } catch {
        setError("No se pudieron cargar los objetos.");
      } finally {
        setCargando(false);
      }
    };

    void cargarObjetos();
  }, [habilitado, claveCarga]);

  const recargarObjetos = async (): Promise<boolean> => {
    try {
      const respuesta = await fetch("/api/objetos", {
        cache: "no-store",
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        setError(resultado.error || "No se pudieron actualizar los objetos.");
        return false;
      }
      setDatos(resultado as DatosObjetos);
      return true;
    } catch {
      setError("No se pudieron actualizar los objetos.");
      return false;
    }
  };

  return { datos, cargando, error, setError, recargarObjetos };
}
