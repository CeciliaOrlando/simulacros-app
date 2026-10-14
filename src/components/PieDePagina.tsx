export function PieDePagina({ sobreOscuro = false }: { sobreOscuro?: boolean }) {
  return (
    <footer
      className={`px-4 py-5 text-center text-xs ${
        sobreOscuro ? "text-marca-celeste-2" : "border-t border-marca-celeste-2 text-gray-600"
      }`}
    >
      <span className="font-semibold">LGV Consultora</span> · Asesoramiento profesional en Higiene y Seguridad en el
      Trabajo
    </footer>
  );
}
