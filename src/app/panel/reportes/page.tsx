import type { Metadata } from "next";
import { Proximamente } from "@/components/Proximamente";

export const metadata: Metadata = { title: "Reportes" };

export default function PaginaReportes() {
  return (
    <Proximamente
      titulo="Reportes"
      descripcion="Resultados y seguimiento de los simulacros realizados."
    />
  );
}
