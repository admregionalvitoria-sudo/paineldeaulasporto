/**
 * Utilitário para formatação e padronização dos nomes de ambientes/salas no Painel e Agendamento.
 *
 * Regras solicitadas:
 * 1. Remove qualquer texto/prefixo estrutural antes do informativo (ex: PORTO-2-2D-, PORTO 1°-1D-, VTRIA-1-, etc.)
 * 2. Quando for LAB (ex: LAB11, LAB01, LAB-04) -> mostra apenas "LAB11", "LAB01", "LAB04"
 * 3. Quando for S seguido de número (ex: S05, S06, S-05, S6) -> no painel/agendamento o S é descrito como "SALA 05", "SALA 06"
 * 4. Quando for SALA (ex: SALA 05, SALA-06) -> "SALA 05", "SALA 06"
 * 5. Ambientes específicos (ex: AUDITÓRIO, OFICINA, etc.) -> remove o prefixo e mantém o nome limpo
 */
export function formatarNomeSala(salaRaw: string | undefined | null): string {
    if (!salaRaw || typeof salaRaw !== 'string') return '';

    const salaTrimmed = salaRaw.trim();
    if (!salaTrimmed) return '';

    // 1. Verificar se contém LAB seguido de número ou identificador (ex: PORTO-2-2D-LAB11 -> LAB11)
    const labMatch = salaTrimmed.match(/LAB\s*[-_.]?\s*(\d+[A-Za-z0-9]*)/i);
    if (labMatch) {
        const num = labMatch[1].toUpperCase();
        return `LAB${num}`;
    }

    // 1.1 Outros tipos de laboratórios nomeados (ex: PORTO-1-LAB QUIMICA -> LAB QUIMICA)
    const labNomeMatch = salaTrimmed.match(/(LAB(?:ORAT[OÓ]RIO)?\s+[A-Za-z0-9\s]+)$/i);
    if (labNomeMatch) {
        return labNomeMatch[1].toUpperCase().trim();
    }

    // 2. Verificar se contém SALA seguido de número ou nome (ex: PORTO-1-SALA 05 -> SALA 05)
    const salaNomeMatch = salaTrimmed.match(/SALA\s*[-_.]?\s*(\d+[A-Za-z0-9]*|[A-Za-z0-9\s]+)/i);
    if (salaNomeMatch) {
        let identificador = salaNomeMatch[1].toUpperCase().trim();
        // Se for apenas número com 1 dígito, padroniza com 2 dígitos (ex: 5 -> 05)
        if (/^\d+$/.test(identificador) && identificador.length === 1) {
            identificador = `0${identificador}`;
        }
        return `SALA ${identificador}`;
    }

    // 3. Verificar se contém 'S' seguido de número (ex: PORTO-2°-2D-S05 -> SALA 05, S06 -> SALA 06)
    // Padrão: precedido por início de linha, hífen, espaço, sublinhado ou barra
    const sNumeroMatch = salaTrimmed.match(/(?:^|[-_\s/°º])S\s*[-_.]?\s*(\d{1,3}[A-Za-z]?)(?:$|[-_\s/])/i);
    if (sNumeroMatch) {
        let num = sNumeroMatch[1].toUpperCase();
        if (num.length === 1) {
            num = `0${num}`;
        }
        return `SALA ${num}`;
    }

    // 4. Ambientes especiais sem prefixo (ex: PORTO-1-AUDITORIO -> AUDITÓRIO)
    const ambienteEspecialMatch = salaTrimmed.match(/(?:^|[-_\s/°º])((?:AUDIT[OÓ]RIO|OFICINA|BIBLIOTECA|GIN[AÁ]SIO|QUADRA|REFEIT[OÓ]RIO|FABLAB)[A-Za-z0-9\s]*)$/i);
    if (ambienteEspecialMatch) {
        return ambienteEspecialMatch[1].toUpperCase().trim();
    }

    // 5. Se houver hífen, extrai o último segmento e tenta novamente
    if (salaTrimmed.includes('-')) {
        const partes = salaTrimmed.split('-').map(p => p.trim()).filter(Boolean);
        if (partes.length > 1) {
            const ultimo = partes[partes.length - 1];
            // Teste se o último segmento é S05, LAB01, etc.
            if (/^S\d+/i.test(ultimo)) {
                let sNum = ultimo.substring(1);
                if (sNum.length === 1) sNum = `0${sNum}`;
                return `SALA ${sNum.toUpperCase()}`;
            }
            if (/^LAB\d+/i.test(ultimo)) {
                return ultimo.toUpperCase();
            }
            return ultimo.toUpperCase();
        }
    }

    return salaTrimmed.toUpperCase();
}
