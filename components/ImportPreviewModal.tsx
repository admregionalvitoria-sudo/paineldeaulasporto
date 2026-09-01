import React, { useMemo } from 'react';
import { Aula } from '../types';
import { verificarConflitoAmbiente, ConflitoHorario } from '../utils/disponibilidade';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, X, ArrowRight } from 'lucide-react';

interface ImportPreviewModalProps {
  isOpen: boolean;
  fileName: string;
  processedAulas: Omit<Aula, 'id'>[];
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  isOpen,
  fileName,
  processedAulas,
  onConfirm,
  onCancel,
  isSubmitting
}) => {
  if (!isOpen) return null;

  // Analisar conflitos internos no arquivo importado
  const conflitosInternos = useMemo(() => {
    const conflitos: { aula: Omit<Aula, 'id'>; motivo: string }[] = [];
    const chaves = new Map<string, Omit<Aula, 'id'>>();

    processedAulas.forEach(aula => {
      const key = `${aula.sala}|${aula.data}|${aula.inicio}`;
      if (chaves.has(key)) {
        const existente = chaves.get(key)!;
        conflitos.push({
          aula,
          motivo: `Conflito de sala (${aula.sala}) na data ${aula.data} às ${aula.inicio} com a turma ${existente.turma}`
        });
      } else {
        chaves.set(key, aula);
      }
    });

    return conflitos;
  }, [processedAulas]);

  const salasUnicas = useMemo(() => {
    return Array.from(new Set(processedAulas.map(a => a.sala))).sort();
  }, [processedAulas]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Pré-visualização de Importação</h3>
              <p className="text-xs text-slate-400">Arquivo: <span className="text-slate-200 font-mono">{fileName}</span></p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Total de Aulas</span>
              <span className="text-2xl font-bold text-white">{processedAulas.length}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Ambientes Identificados</span>
              <span className="text-2xl font-bold text-red-400">{salasUnicas.length}</span>
            </div>
          </div>

          {/* Alertas de Conflito */}
          {conflitosInternos.length > 0 ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Atenção: {conflitosInternos.length} potencial(is) sobreposição(ões) de horários detectadas:</span>
              </div>
              <ul className="text-xs space-y-1 pl-6 list-disc text-amber-200/90 max-h-32 overflow-y-auto">
                {conflitosInternos.map((c, i) => (
                  <li key={i}>{c.motivo}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Nenhum conflito interno de sala/horário foi detectado no arquivo.</span>
            </div>
          )}

          {/* Lista de Ambientes Normalizados */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Ambientes Normalizados</h4>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
              {salasUnicas.map((sala, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-mono">
                  {sala}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer com Botões */}
        <div className="p-6 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/50">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-red-900/30 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Processando Diff...' : 'Confirmar Importação'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ImportPreviewModal;
