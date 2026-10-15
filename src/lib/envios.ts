import type { RolEmpleado } from "@/lib/empleados";

export type EnvioDetalle = {
  id: string;
  canal: "email" | "sms";
  tipo: "aviso" | "alarma" | "fin";
  estado: "pendiente" | "enviado" | "fallido";
  error: string | null;
  enviado_at: string | null;
  destino: string | null;
  created_at: string;
  empleados: { nombre: string; apellido: string; email: string | null; rol: RolEmpleado } | null;
};

export const COLUMNAS_ENVIO =
  "id, canal, tipo, estado, error, enviado_at, destino, created_at, empleados(nombre, apellido, email, rol)";
