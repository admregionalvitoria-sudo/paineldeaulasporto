import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

type TipoAviso = 'sucesso' | 'erro' | 'info';
interface Aviso { id: number; texto: string; tipo: TipoAviso }
interface PedidoConfirmacao {
  titulo: string;
  texto?: string;
  confirmar?: string;
  cancelar?: string;
  perigo?: boolean;
  resolver: (valor: boolean) => void;
}

let proximoId = 1;
let publicarAviso: ((aviso: Aviso) => void) | null = null;
let pedirConfirmacao: ((pedido: PedidoConfirmacao) => void) | null = null;

/** Mostra um aviso que some sozinho. Substitui o `alert()` do navegador. */
export function avisar(texto: string, tipo: TipoAviso = 'info') {
  if (publicarAviso) publicarAviso({ id: proximoId++, texto, tipo });
  else console.warn(texto);
}

/** Pede confirmação em uma janela do próprio sistema. Substitui o `confirm()` do navegador. */
export function confirmar(titulo: string, opcoes: Omit<PedidoConfirmacao, 'titulo' | 'resolver'> = {}): Promise<boolean> {
  return new Promise(resolver => {
    if (pedirConfirmacao) pedirConfirmacao({ titulo, ...opcoes, resolver });
    else resolver(window.confirm(titulo));
  });
}

const estilos: Record<TipoAviso, { cor: string; icone: React.ReactNode }> = {
  sucesso: { cor: 'border-emerald-200 bg-emerald-50 text-emerald-900', icone: <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" /> },
  erro: { cor: 'border-red-200 bg-red-50 text-red-900', icone: <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" /> },
  info: { cor: 'border-slate-200 bg-white text-[#0F2A52]', icone: <Info size={18} className="mt-0.5 shrink-0 text-[#1D4E8C]" /> },
};

/** Montado uma vez no App: desenha os avisos e a janela de confirmação. */
export default function DialogosHost() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [pedido, setPedido] = useState<PedidoConfirmacao | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const botaoCancelar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    publicarAviso = aviso => {
      setAvisos(lista => [...lista.slice(-3), aviso]);
      const duracao = aviso.tipo === 'erro' ? 9000 : 5000;
      window.setTimeout(() => setAvisos(lista => lista.filter(item => item.id !== aviso.id)), duracao);
    };
    pedirConfirmacao = novo => setPedido(atual => {
      // Um pedido novo cancela o anterior, para nenhuma promessa ficar pendurada.
      atual?.resolver(false);
      return novo;
    });
    return () => { publicarAviso = null; pedirConfirmacao = null; };
  }, []);

  useEffect(() => {
    if (pedido && dialogo.current && !dialogo.current.open) {
      dialogo.current.showModal();
      botaoCancelar.current?.focus();
    }
  }, [pedido]);

  const responder = (valor: boolean) => {
    pedido?.resolver(valor);
    dialogo.current?.close();
    setPedido(null);
  };

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {avisos.map(aviso => (
          <div key={aviso.id} role={aviso.tipo === 'erro' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${estilos[aviso.tipo].cor}`}>
            {estilos[aviso.tipo].icone}
            <p className="min-w-0 flex-1 break-words">{aviso.texto}</p>
            <button type="button" aria-label="Fechar aviso" onClick={() => setAvisos(lista => lista.filter(item => item.id !== aviso.id))}
              className="rounded-md p-0.5 opacity-60 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <dialog ref={dialogo} aria-labelledby="confirmacao-titulo"
        onCancel={evento => { evento.preventDefault(); responder(false); }}
        onClick={evento => { if (evento.target === dialogo.current) responder(false); }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border-0 bg-white p-0 text-[#0F2A52] shadow-2xl backdrop:bg-slate-950/50">
        {pedido && (
          <div className="p-6">
            <div className="flex items-start gap-3">
              {pedido.perigo && <span className="rounded-xl bg-red-50 p-2 text-red-600"><AlertTriangle size={20} /></span>}
              <div className="min-w-0">
                <h2 id="confirmacao-titulo" className="text-base font-bold leading-snug">{pedido.titulo}</h2>
                {pedido.texto && <p className="mt-2 text-sm leading-relaxed text-slate-600">{pedido.texto}</p>}
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button ref={botaoCancelar} type="button" onClick={() => responder(false)}
                className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
                {pedido.cancelar || 'Cancelar'}
              </button>
              <button type="button" onClick={() => responder(true)}
                className={`min-h-11 rounded-xl px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${pedido.perigo ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0F2A52] hover:bg-[#1D4E8C]'}`}>
                {pedido.confirmar || 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
