import type { Metadata } from "next";
import { Proximamente } from "@/components/Proximamente";

export const metadata: Metadata = { title: "Empleados" };

export default function PaginaEmpleados() {
  return (
    <Proximamente
      titulo="Empleados"
      descripcion="Alta, baja y edición del personal de la empresa."
    />
  );
}
