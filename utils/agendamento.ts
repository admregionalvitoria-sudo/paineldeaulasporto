import type { Aula, AgendamentoSala, ManutencaoAmbiente } from '../types';
import { estaEmManutencao, normalizarNomeAmbiente } from './ambientes';
const normalizeTurno = (valor?: string) => (valor || '').trim().toLowerCase();

export type SalaStatusType = 'livre' | 'pendente' | 'ocupada_aula' | 'reservada' | 'manutencao';

export interface SalaDisponibilidade {
    status: SalaStatusType;
    label: string;
    motivoManutencao?: string;
    aula?: Aula;
    agendamento?: AgendamentoSala;
}

export const verificarDisponibilidadeSala = (
    sala: string,
    data: string,
    turno: string,
    aulas: Aula[],
    agendamentos: AgendamentoSala[],
    manutencoes: ManutencaoAmbiente[] = []
): SalaDisponibilidade => {
    const manutencao = estaEmManutencao(sala, data, manutencoes);
    if (manutencao) return { status: 'manutencao', label: 'Em manutenção', motivoManutencao: manutencao.motivo };
    const normSala = normalizarNomeAmbiente(sala);
    const normData = data.trim();
    const normTurno = normalizeTurno(turno);

    // 1. Verificar se há aula regular no cronograma oficial
    const aulaOcupando = aulas.find(a => 
        a.ativa !== false && normalizarNomeAmbiente(a.sala) === normSala &&
        a.data?.trim() === normData &&
        normalizeTurno(a.turno) === normTurno
    );
    if (aulaOcupando) {
        return {
            status: 'ocupada_aula',
            label: 'Ocupada por Aula Regular',
            aula: aulaOcupando
        };
    }

    // 2. Verificar se há agendamento aprovado pelo gestor
    const agendamentoAprovado = agendamentos.find(ag => 
        normalizarNomeAmbiente(ag.sala) === normSala &&
        ag.data?.trim() === normData &&
        normalizeTurno(ag.turno) === normTurno &&
        ag.status === 'aprovado'
    );
    if (agendamentoAprovado) {
        return {
            status: 'reservada',
            label: 'Reservada (Aprovado pelo Gestor)',
            agendamento: agendamentoAprovado
        };
    }

    // 3. Verificar se há solicitação de agendamento pendente de aprovação
    const agendamentoPendente = agendamentos.find(ag => 
        normalizarNomeAmbiente(ag.sala) === normSala &&
        ag.data?.trim() === normData &&
        normalizeTurno(ag.turno) === normTurno &&
        ag.status === 'pendente'
    );
    if (agendamentoPendente) {
        return {
            status: 'pendente',
            label: 'Solicitação Pendente de Aprovação',
            agendamento: agendamentoPendente
        };
    }

    // 4. Caso contrário, a sala está LIVRE para agendamento
    return {
        status: 'livre',
        label: 'Disponível / Livre'
    };
};

