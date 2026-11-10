<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Planilha de agendamentos

O app apenas grava e atualiza a planilha. O agente de IA externo do usuário consulta os registros e realiza os envios.

| Coluna | Cabeçalho | Conteúdo |
| --- | --- | --- |
| A | ID | Identificador do agendamento |
| B | Nome | Solicitante |
| C | Telefone | Texto normalizado `55DDDNUMERO`, somente com autorização de WhatsApp |
| D | E-mail | E-mail do solicitante |
| E | Status | Pendente / Aprovado / Negado |
| F | Motivo | Recusa quando Negado; observação do gestor quando Aprovado; vazio quando Pendente |
| G | Sala / Data | `{sala} — {data} ({turno} {horarioInicio}-{horarioFim})` |

O servidor envia um POST JSON ao Web App do Apps Script com `{ "token": "<segredo>", "linha": { "ID": "...", "Nome": "...", "Telefone": "...", "E-mail": "...", "Status": "...", "Motivo": "...", "Sala / Data": "..." } }`. O script faz upsert pelo ID com lock e responde `{ "ok": true, "linha": 2 }` ou `{ "ok": false, "erro": "..." }`. O fetch segue automaticamente o redirect para script.googleusercontent.com, com timeout de 30 segundos. Respostas não-JSON ou sem `ok: true` são falhas.

1. Implante o Apps Script como **App da Web**, com **Executar como: Eu** e acesso **Qualquer pessoa**. O script deve validar o token e controlar o upsert e o lock.
2. Configure no servidor/Vercel `SHEETS_WEBHOOK_URL` (URL da implantação terminada em `/exec`) e `SHEETS_WEBHOOK_TOKEN` (o mesmo segredo validado pelo script). Essas variáveis são exclusivas do servidor. Mantenha `FIREBASE_SERVICE_ACCOUNT_KEY` e `VITE_FIREBASE_PROJECT_ID` para acesso Admin ao Firestore. Sem credencial Admin, a leitura usa a REST API pública do projeto `paineldeaulas-e34da`, com `VITE_FIREBASE_API_KEY` ou a apiKey de `firebase-applet-config.json`, sujeita às regras do Firestore. Nesse fallback, o cliente registra `planilhaSyncErro`/`planilhaSyncEm`.
3. Configure `VITE_EMAIL_DOMINIOS_CORPORATIVOS=findes.org.br,senaies.com.br` antes do build para restringir domínios; vazio aceita qualquer e-mail válido. O e-mail continua obrigatório e o WhatsApp opcional, com telefone e consentimento LGPD. Localmente, use `.env.local`, carregando-o também no servidor: `node --env-file-if-exists=.env.local --import tsx server.ts`.

Falhas no Sheets não impedem a gravação no Firestore. Consulte `planilhaSyncErro` e `planilhaSyncEm`; para tentar novamente, envie `POST /api/agendamento-planilha` com `{ "agendamentoId": "ID" }`.

Validação local: `npx vitest run`, `npx tsc --noEmit` e `npx vite build`.

View your app in AI Studio: https://ai.studio/apps/2689532b-33ff-41af-8605-6fb2e4c4974b

## Diretrizes de Design & Regras de Ícones

> [!CAUTION]
> ### 🚫 PROIBIDO O USO DO ÍCONE `Sparkles` (Estrelas/Brilho)
> **Não utilize o ícone `Sparkles` (`Sparkles` do Lucide ou o emoji ✨) em nenhuma parte desta aplicação.**
> 
> - **Para Limpeza / Higienização / Zeladoria**: utilize os ícones `Broom` (vassoura), `Brush` ou `SprayCan`.
> - **Para Status Liberado / Concluído**: utilize `CheckCircle2` ou `DoorOpen`.
> - **Para Estados Vazios**: utilize `DoorOpen` ou `Calendar`.

---

## Telas Principais da Aplicação

- `/` (ou `#dashboard`): Painel Principal de Aulas com alternância automática e manual de turnos.
- `/limpeza`: Painel Operacional de Limpeza (priorização de salas usadas no dia anterior de uso, salas de hoje e observações da gestão).
- `/admin`: Painel Administrativo de Gestão de Horários, Ambientes, Agendamentos e Limpeza.
- `/painelcliente`: Painel institucional para recepção e clientes.
- `/midia`: Gestão de mídias e avisos rotativos da TV.
- `/agendamento`: Solicitação pública de agendamento de ambientes.
