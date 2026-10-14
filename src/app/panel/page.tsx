import Link from "next/link";

const ACCESOS = [
  {
    href: "/panel/empleados",
    titulo: "Empleados",
    texto: "Cargá el personal y sus datos de contacto.",
  },
  {
    href: "/panel/simulacros",
    titulo: "Simulacros",
    texto: "Programá simulacros y enviá los avisos.",
  },
  {
    href: "/panel/reportes",
    titulo: "Reportes",
    texto: "Consultá el resultado de cada simulacro.",
  },
];

export default function Panel() {
  return (
    <section>
      <h1 className="text-2xl font-bold text-marca-navy">
        Panel
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Elegí una sección para comenzar.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACCESOS.map((acceso) => (
          <Link
            key={acceso.href}
            href={acceso.href}
            className="group rounded-lg border border-gray-200 border-t-4 border-t-marca-oro bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <h2 className="font-serif text-lg font-bold text-marca-navy group-hover:text-marca-azul">
              {acceso.titulo}
            </h2>
            <p className="mt-1 text-sm text-gray-600">{acceso.texto}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
