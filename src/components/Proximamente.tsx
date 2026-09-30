export function Proximamente({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion: string;
}) {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
        {titulo}
      </h1>
      <p className="mt-1 text-sm text-gray-500">{descripcion}</p>
      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
        <p className="text-base font-medium text-gray-700">Próximamente</p>
        <p className="mt-1 text-sm text-gray-500">
          Esta sección estará disponible en una próxima versión.
        </p>
      </div>
    </section>
  );
}
