"use client";

import { useCallback, useState } from "react";
import { claseBotonPrimario } from "@/components/clases";
import { FormularioSimulacro } from "./FormularioSimulacro";

export function BotonNuevoSimulacro({ empresaId }: { empresaId: string }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={claseBotonPrimario}>
        + Nuevo simulacro
      </button>
      {abierto && <FormularioSimulacro empresaId={empresaId} simulacro={null} onCerrar={cerrar} />}
    </>
  );
}
