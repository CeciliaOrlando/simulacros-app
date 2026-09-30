import type { Metadata } from "next";
import { Proximamente } from "@/components/Proximamente";

export const metadata: Metadata = { title: "Simulacros" };

export default function PaginaSimulacros() {
  return (
    <Proximamente
      titulo="Simulacros"
      descripcion="Programación de simulacros y envío de avisos."
    />
  );
}
