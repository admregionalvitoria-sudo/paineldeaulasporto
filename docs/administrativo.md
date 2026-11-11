# Administrativo e Agenda do Porto

- `/administrativo`: gestão de prioridades de limpeza e compromissos, para admin, super_admin e coordenador.
- `/admin`: continua com as funções anteriores; recebe atalhos para Administrativo e Agenda do Porto.
- `/midia`: recebe a agenda de leitura e aceita os perfis `midia` e `comunicacao`, além dos administradores.
- `/limpeza`: exibe as prioridades pendentes da data atual, incluindo salas sem aulas; mantém a indicação de sala em aula.

A agenda contém compromissos cadastrados pelo Administrativo. Não substitui nem modifica o agendamento de aulas e reservas. O botão no cabeçalho abre um painel lateral com filtro por data e contador dos compromissos de hoje.

## Dados e permissões

As coleções `porto/dados/prioridadesLimpeza` e `porto/dados/agendaPorto` são independentes dos dados atuais. As telas recebem atualizações pelo Firestore em tempo real. Concluir uma prioridade a retira da fila pública, mantendo seu histórico no Administrativo; é possível reabri-la. Excluir pede confirmação.

O arquivo `firestore.rules` inclui regras específicas para as duas coleções. **Publicar o frontend na Vercel não publica as regras do Firebase.** As regras devem ser revisadas contra as regras atualmente implantadas e publicadas no projeto/banco configurado em `firebase.js` antes de considerar o controle de acesso validado em produção.

O repositório original permite leitura e escrita irrestritas nas coleções antigas, inclusive nos perfis. Essa política foi preservada para não alterar os fluxos existentes, mas não constitui uma fronteira de segurança confiável: é necessário restringir também a escrita dos perfis em uma revisão do sistema de autenticação. Os novos controles de interface não corrigem essa limitação preexistente.

## Verificação

```sh
npx vitest run
npx tsc --noEmit
npx vite build
```

Os testes novos verificam a separação das rotas, os aliases existentes, a ordenação das prioridades, a exclusão de itens concluídos/de outras datas e a validação de horários e datas da agenda.

O teste original de `node:test` foi portado para Vitest em `tests/administrativo.test.ts`. A integração mantém a normalização atual de ambientes (incluindo LAB 101 / LAB 102 distintos), manutenção, contato corporativo, consentimento WhatsApp e sincronização de reservas com a planilha. As [regras de limpeza](limpeza-regras.md) detalham a fila efetiva e a preservação de ajustes na importação.
