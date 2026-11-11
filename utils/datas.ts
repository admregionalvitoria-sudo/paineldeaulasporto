/** Datas de calendário usam o fuso local, sem conversão para UTC. */
export function dataLocal(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dataISO(data: string): string {
  if (!data?.includes('/')) return data || '';
  const [dia, mes, ano] = data.trim().split('/');
  return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

export function dataBR(data: string): string {
  const [ano, mes, dia] = dataISO(data).split('-');
  return `${dia}/${mes}/${ano}`;
}
