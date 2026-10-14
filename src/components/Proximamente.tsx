export function Proximamente({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion: string;
}) {
  return (
    <section>
      <h1 className="text-2xl font-bold text-marca-navy">
        {titulo}
      </h1>
      <p className="mt-1 text-sm text-gray-600">{descripcion}</p>
      <div className="mt-6 rounded-lg border border-t-4 border-marca-celeste-2 border-t-marca-oro bg-white px-6 py-16 text-center">
        <p className="font-serif text-lg font-bold text-marca-navy">Próximamente</p>
        <p className="mt-1 text-sm text-gray-600">
          Esta sección estará disponible en una próxima versión.
        </p>
      </div>
    </section>
  );
}
