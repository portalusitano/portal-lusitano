interface AncestorCardProps {
  type: string;
  name?: string;
  reg?: string;
  isFemale?: boolean;
}

const AncestorCard = ({ type, name, reg, isFemale = false }: AncestorCardProps) => (
  <div
    className={`
    relative p-4 border transition-all duration-500 group min-w-[180px]
    ${isFemale ? "border-[var(--background-secondary)] bg-[var(--background)]/30" : "border-[var(--border)] bg-[var(--background)]/60"}
    hover:border-[var(--border-hover)] hover:bg-[var(--background-secondary)]
  `}
  >
    <span className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)] block mb-1 group-hover:text-[var(--foreground-strong)] transition-colors">
      {type}
    </span>
    <p className="font-normal text-[var(--foreground)] text-sm whitespace-nowrap overflow-hidden text-ellipsis">
      {name || "Não registado"}
    </p>
    {/* Número de Registo Fictício para visual (podes adicionar na DB depois) */}
    <p className="text-[10px] text-[var(--foreground-muted)] font-mono mt-1">{reg || "N/A"}</p>

    {/* Ponto de Conexão Visual */}
    <div className="absolute -right-3 top-1/2 w-3 h-px bg-[var(--border)] group-hover:bg-[var(--gold)] transition-colors"></div>
  </div>
);

interface PedigreeProps {
  cavalo: {
    nome_cavalo: string;
    pai?: string;
    mae?: string;
  };
}

export default function Pedigree({ cavalo }: PedigreeProps) {
  return (
    <div className="w-full overflow-x-auto py-12 border border-[var(--background-secondary)] bg-[var(--background)]">
      <div className="flex items-center justify-center w-full min-w-0 gap-2 sm:gap-4 md:gap-8 px-4 sm:px-6 md:px-8">
        {/* COLUNA 1: O Cavalo (HERÓI) */}
        <div className="flex flex-col justify-center">
          <div className="border border-[var(--gold)] bg-[var(--elevate-1)] p-4 sm:p-6 min-w-[140px] sm:min-w-[200px] relative">
            <span className="text-[var(--gold)] rotulo font-bold block mb-2">O Exemplar</span>
            <h3 className="text-xl font-normal text-[var(--foreground)]">{cavalo.nome_cavalo}</h3>
            <div className="absolute -left-3 top-1/2 w-3 h-px bg-[var(--gold)]"></div>
          </div>
        </div>

        {/* Conector Central */}
        <div className="h-px w-2 sm:w-4 md:w-10 bg-[var(--border)]"></div>

        {/* COLUNA 2: Pais (Sire & Dam) */}
        <div className="flex flex-col gap-6 sm:gap-10 md:gap-16 relative">
          {/* Linhas de conexão verticais */}
          <div className="absolute left-0 top-1/4 bottom-1/4 w-px bg-[var(--border)] -ml-5 border-l border-[var(--border)]"></div>
          <div className="absolute left-0 top-1/4 w-5 h-px bg-[var(--border)] -ml-5"></div>
          <div className="absolute left-0 bottom-1/4 w-5 h-px bg-[var(--border)] -ml-5"></div>

          {/* PAI */}
          <div className="relative">
            <AncestorCard type="Pai (Sire)" name={cavalo.pai} reg="LUS-2938" />
            {/* Conector para Avós */}
            <div className="absolute -right-2 sm:-right-4 md:-right-8 top-1/2 w-2 sm:w-4 md:w-8 h-px bg-[var(--border)]"></div>
          </div>

          {/* MÃE */}
          <div className="relative">
            <AncestorCard type="Mãe (Dam)" name={cavalo.mae} reg="LUS-1102" isFemale={true} />
            {/* Conector para Avós */}
            <div className="absolute -right-2 sm:-right-4 md:-right-8 top-1/2 w-2 sm:w-4 md:w-8 h-px bg-[var(--border)]"></div>
          </div>
        </div>

        {/* COLUNA 3: Avós (Grandparents) - Simulados visualmente */}
        <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
          <div className="flex flex-col gap-1.5 sm:gap-2 mb-4 sm:mb-8 relative">
            {/* Conectores */}
            <div className="absolute left-0 top-1/4 bottom-1/4 w-px bg-[var(--border)] -ml-2 sm:-ml-3 md:-ml-4"></div>
            <div className="absolute left-0 top-1/4 w-2 sm:w-3 md:w-4 h-px bg-[var(--border)] -ml-2 sm:-ml-3 md:-ml-4"></div>
            <div className="absolute left-0 bottom-1/4 w-2 sm:w-3 md:w-4 h-px bg-[var(--border)] -ml-2 sm:-ml-3 md:-ml-4"></div>

            <AncestorCard type="Avô Paterno" name="Zimbro" reg="VEIGA" />
            <AncestorCard type="Avó Paterna" name="Xarola" reg="VEIGA" isFemale={true} />
          </div>

          <div className="flex flex-col gap-1.5 sm:gap-2 relative">
            {/* Conectores */}
            <div className="absolute left-0 top-1/4 bottom-1/4 w-px bg-[var(--border)] -ml-2 sm:-ml-3 md:-ml-4"></div>
            <div className="absolute left-0 top-1/4 w-2 sm:w-3 md:w-4 h-px bg-[var(--border)] -ml-2 sm:-ml-3 md:-ml-4"></div>
            <div className="absolute left-0 bottom-1/4 w-2 sm:w-3 md:w-4 h-px bg-[var(--border)] -ml-2 sm:-ml-3 md:-ml-4"></div>

            <AncestorCard type="Avô Materno" name="Uivador" reg="ANDRADE" />
            <AncestorCard type="Avó Materna" name="Toleirona" reg="ANDRADE" isFemale={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
