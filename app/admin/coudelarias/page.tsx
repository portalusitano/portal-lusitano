import CoudelariasContent from "@/components/admin-app/CoudelariasContent";

/**
 * Esta página e o separador «Coudelarias» do `/admin-app` eram dois ficheiros
 * com o mesmo ecrã escrito duas vezes — trezentas linhas quase idênticas, com
 * os mesmos defeitos duplicados nas duas. Passa a haver um componente só; o
 * que esta rota acrescenta é o caminho de volta ao `/admin`, que o separador
 * não precisa de ter porque já vive lá dentro.
 */
export default function CoudelariasPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto">
        <CoudelariasContent voltarHref="/admin" />
      </div>
    </div>
  );
}
