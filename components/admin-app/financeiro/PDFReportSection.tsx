"use client";

import { Download, FileText } from "lucide-react";
import Seleccao from "@/components/ui/Seleccao";

interface PDFReportSectionProps {
  selectedMonth: number;
  selectedYear: number;
  isGeneratingPDF: boolean;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onGeneratePDF: () => void;
}

export default function PDFReportSection({
  selectedMonth,
  selectedYear,
  isGeneratingPDF,
  onMonthChange,
  onYearChange,
  onGeneratePDF,
}: PDFReportSectionProps) {
  return (
    <div className="bg-gradient-to-r from-[var(--gold)]/10 to-[var(--gold)]/5 border border-[var(--gold)]/20 rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="text-[var(--gold)]" size={20} />
            Relatórios Mensais em PDF
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Descarregue relatórios profissionais com todas as métricas do mês
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-end gap-4">
        {/* Selector de Mês */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            Mês
          </label>
          <Seleccao
            value={selectedMonth}
            onChange={(e) => onMonthChange(parseInt(e.target.value))}
            className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)] transition-colors"
          >
            <option value="1">Janeiro</option>
            <option value="2">Fevereiro</option>
            <option value="3">Março</option>
            <option value="4">Abril</option>
            <option value="5">Maio</option>
            <option value="6">Junho</option>
            <option value="7">Julho</option>
            <option value="8">Agosto</option>
            <option value="9">Setembro</option>
            <option value="10">Outubro</option>
            <option value="11">Novembro</option>
            <option value="12">Dezembro</option>
          </Seleccao>
        </div>

        {/* Selector de Ano */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            Ano
          </label>
          <Seleccao
            value={selectedYear}
            onChange={(e) => onYearChange(parseInt(e.target.value))}
            className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)] transition-colors"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </Seleccao>
        </div>

        {/* Botão Gerar */}
        <button
          onClick={onGeneratePDF}
          disabled={isGeneratingPDF}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--gold)]"
        >
          {isGeneratingPDF ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>A
              gerar...
            </>
          ) : (
            <>
              <Download size={16} />
              Descarregar Relatório PDF
            </>
          )}
        </button>
      </div>

      {/* Info adicional */}
      <div className="mt-4 pt-4 border-t border-[var(--gold)]/20">
        <p className="text-xs text-gray-500">
          O relatório inclui: Resumo Executivo, Receitas por Produto, Top 5 Cavalos Mais Vistos,
          Análise de Leads e ROI por Canal de Marketing
        </p>
      </div>
    </div>
  );
}
