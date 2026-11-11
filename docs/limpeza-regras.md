# Regras da fila de limpeza

- A fonte é o painel efetivo no Firestore, após edições, exclusões e inativações. A planilha bruta não participa da fila.
- Uso efetivo: aulas ativas e reservas aprovadas sem aula na mesma sala/data/turno. Pendentes e recusadas não contam; uma aula inativa não é reativada pela reserva já convertida.
- “Ontem” significa o último dia com uso efetivo, até sete dias antes de hoje. Dias sem uso, fins de semana e feriados sem atividade são pulados. Se houver uso no sábado ou feriado, ele conta normalmente.
- A fila reúne por sala normalizada: uso no dia de referência, uso de hoje, prioridades pendentes de hoje e avisos com texto ativo da gestão. Cada card identifica suas origens e o dia/turnos do último uso.
- Manutenção vigente retira a sala de todos os usos e da fila. O contador considera salas únicas, inclusive sem aula, com início/fim inclusivos e fim opcional.
- Sala em uso agora fica **em aula** (`início ≤ agora < fim`). Antes da próxima aula, fica **aguardando limpeza**. Após todos os usos de hoje, fica **livre**. Sem uso hoje, o último uso mantém a limpeza pendente. Prioridade pendente ou aviso ativo também mantém a solicitação, exceto durante a aula.
- Os horários reais de início e fim são respeitados; horários ausentes usam o padrão de `horarioUso`. Datas e horas usam o calendário local. A tela recalcula continuamente pelo relógio, inclusive na virada do dia.
- Ordem: prioridade urgente → alta → normal; aviso da gestão; aguardando limpeza (próximo início mais cedo, depois salas apenas do dia anterior); em aula; livre. Empate pelo nome curto em ordem numérica.

## Reimportação

O CSV substitui somente aulas de hoje em diante sem ajuste manual. Histórico e aulas com `modificadoManualmente: true` permanecem intactos, inclusive inativas. Linhas do CSV que colidem com ajustes na mesma sala/data/turno são ignoradas. Novas aulas manuais e aulas criadas por reserva recebem a marca e a origem correspondente; importadas recebem `origem: 'csv'`. A mensagem final informa quantos ajustes e registros históricos foram preservados.

Verificação: `npx vitest run`, `npx tsc --noEmit` e `npx vite build`.
