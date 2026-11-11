export const calcularTurnoPorHorario = (horarioStr: string): string => {
    const turno = ['Matutino', 'Vespertino', 'Noturno'].find(t => t.toLowerCase() === String(horarioStr).trim().toLowerCase());
    if (turno) return turno;
    if (!horarioStr) return 'Vespertino';
    const cleaned = String(horarioStr).trim().toLowerCase().replace('h', ':');
    let horas = 0;
    let minutos = 0;
    if (cleaned.includes(':')) {
        const parts = cleaned.split(':').map(p => parseInt(p, 10));
        horas = isNaN(parts[0]) ? 13 : parts[0];
        minutos = isNaN(parts[1]) ? 0 : parts[1];
    } else {
        horas = parseInt(cleaned, 10);
        if (isNaN(horas)) return 'Vespertino';
    }
    const totalMinutos = (horas * 60) + (minutos || 0);
    // 06:00 até 11:49:59 (360 até 709 minutos) -> Matutino
    if (totalMinutos >= 360 && totalMinutos < 710) return 'Matutino';
    // 11:50 até 17:49:59 (710 até 1069 minutos) -> Vespertino
    if (totalMinutos >= 710 && totalMinutos < 1070) return 'Vespertino';
    // 17:50 até 05:59:59 -> Noturno
    return 'Noturno';
};

