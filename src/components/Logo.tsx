import Image from "next/image";

/** Logo de LGV Consultora recortado en círculo con borde dorado. */
export function Logo({
  tamano = 40,
  className = "",
  prioridad = false,
}: {
  tamano?: number;
  className?: string;
  prioridad?: boolean;
}) {
  return (
    <Image
      src="/logo-lgv.jpg"
      alt="LGV Consultora"
      width={tamano}
      height={tamano}
      priority={prioridad}
      className={`shrink-0 rounded-full border border-marca-oro object-cover ${className}`}
      style={{ width: tamano, height: tamano }}
    />
  );
}
