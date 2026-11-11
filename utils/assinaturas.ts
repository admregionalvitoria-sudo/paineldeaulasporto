/** Uma assinatura por chave, compartilhada por todos os consumidores montados. */
export function criarAssinaturas<K>(iniciar: (chave: K) => () => void) {
  const ativas = new Map<K, { referencias: number; cancelar: () => void }>();
  return {
    assinar(chave: K) {
      let entrada = ativas.get(chave);
      if (!entrada) {
        entrada = { referencias: 0, cancelar: iniciar(chave) };
        ativas.set(chave, entrada);
      }
      entrada.referencias++;
      let encerrada = false;
      return () => {
        if (encerrada) return;
        encerrada = true;
        if (ativas.get(chave) !== entrada) return;
        if (--entrada.referencias === 0) {
          ativas.delete(chave);
          entrada.cancelar();
        }
      };
    },
    cancelarTodas() {
      ativas.forEach(entrada => entrada.cancelar());
      ativas.clear();
    },
  };
}
