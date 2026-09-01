/**
 * Utilitário para formatação e padronização dos nomes de ambientes/salas no Painel e Agendamento.
 *
 * Regras solicitadas:
 * 1. Remove qualquer texto/prefixo estrutural antes do informativo (ex: PORTO-2-2D-, PORTO 1°-1D-, VTRIA-1-, etc.)
 * 2. Quando for LAB (ex: LAB11, LAB01, LAB-04, LAB 8) -> padroniza como "LAB 01", "LAB 04", "LAB 08", "LAB 11"
 * 3. Quando for S seguido de número (ex: S05, S06, S-05, S6) -> padroniza como "SALA 05", "SALA 06"
 * 4. Quando for SALA (ex: SALA 05, SALA-06, SALA06) -> "SALA 05", "SALA 06"
 * 5. Ambientes específicos (ex: AUDITÓRIO, OFICINA, BIBLIOTECA, etc.) -> remove prefixos estruturais e mantém nome limpo
 */
export function formatarNomeSala(salaRaw: string | undefined | null): string {
    if (!salaRaw || typeof salaRaw !== 'string') return '';

    let str = salaRaw.trim();
    if (!str) return '';

    // Remove acentos e caracteres de controle desnecessários para facilidade de regex, mantendo original limpo
    const strClean = str.replace(/['"]/g, '').trim();

    // 1. LAB seguido de número (ex: PORTO-2-2D-LAB11, PORTO-1-1E-LAB08, LAB-04, LAB 8)
    const labMatch = strClean.match(/(?:^|[-_\s/°º])LAB\s*[-_.]?\s*(\d+[A-Za-z0-9]*)/i);
    if (labMatch) {
        let num = labMatch[1].toUpperCase();
        if (/^\d+$/.test(num) && num.length === 1) {
            num = `0${num}`;
        }
        return `LAB ${num}`;
    }

    // 1.1 Outros tipos de laboratórios nomeados (ex: PORTO-1-LAB QUIMICA -> LAB QUÍMICA)
    const labNomeMatch = strClean.match(/(?:^|[-_\s/°º])(LAB(?:ORAT[OÓ]RIO)?\s+[A-Za-z0-9\s]+)$/i);
    if (labNomeMatch) {
        return labNomeMatch[1].toUpperCase().trim();
    }

    // 2. SALA seguido de número ou identificador (ex: PORTO-2-2D-SALA06, PORTO-1-SALA 05, SALA-06)
    const salaNomeMatch = strClean.match(/(?:^|[-_\s/°º])SALA\s*[-_.]?\s*(\d+[A-Za-z0-9]*|[A-Za-z0-9\s]+)/i);
    if (salaNomeMatch) {
        let identificador = salaNomeMatch[1].toUpperCase().trim();
        if (/^\d+$/.test(identificador) && identificador.length === 1) {
            identificador = `0${identificador}`;
        }
        return `SALA ${identificador}`;
    }

    // 3. 'S' seguido de número (ex: PORTO-2°-2D-S05 -> SALA 05, S6 -> SALA 06)
    const sNumeroMatch = strClean.match(/(?:^|[-_\s/°º])S\s*[-_.]?\s*(\d{1,3}[A-Za-z]?)(?:$|[-_\s/])/i);
    if (sNumeroMatch) {
        let num = sNumeroMatch[1].toUpperCase();
        if (/^\d+$/.test(num) && num.length === 1) {
            num = `0${num}`;
        }
        return `SALA ${num}`;
    }

    // 4. Ambientes especiais sem prefixo (ex: PORTO-1-AUDITORIO -> AUDITÓRIO, PORTO-2-OFICINA -> OFICINA)
    const ambienteEspecialMatch = strClean.match(/(?:^|[-_\s/°º])((?:AUDIT[OÓ]RIO|OFICINA|BIBLIOTECA|GIN[AÁ]SIO|QUADRA|REFEIT[OÓ]RIO|FABLAB)[A-Za-z0-9\s]*)$/i);
    if (ambienteEspecialMatch) {
        let nome = ambienteEspecialMatch[1].toUpperCase().trim();
        // Acentuações padrão de palavras-chave conhecidas
        if (nome.includes('AUDITORIO')) nome = nome.replace('AUDITORIO', 'AUDITÓRIO');
        if (nome.includes('GINASIO')) nome = nome.replace('GINASIO', 'GINÁSIO');
        if (nome.includes('REFEITORIO')) nome = nome.replace('REFEITORIO', 'REFEITÓRIO');
        return nome;
    }

    // 5. Se houver hífen, extrai o último segmento e tenta novamente
    if (strClean.includes('-')) {
        const partes = strClean.split('-').map(p => p.trim()).filter(Boolean);
        if (partes.length > 1) {
            const ultimo = partes[partes.length - 1];
            if (/^S\d+/i.test(ultimo)) {
                let sNum = ultimo.substring(1);
                if (sNum.length === 1) sNum = `0${sNum}`;
                return `SALA ${sNum.toUpperCase()}`;
            }
            if (/^LAB\d+/i.test(ultimo)) {
                let labNum = ultimo.substring(3);
                if (labNum.length === 1) labNum = `0${labNum}`;
                return `LAB ${labNum.toUpperCase()}`;
            }
            return ultimo.toUpperCase();
        }
    }

    return strClean.toUpperCase();
}
