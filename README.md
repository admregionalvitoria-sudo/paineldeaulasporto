<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Notificações de agendamento

1. Ative a **Google Sheets API** no projeto GCP da service account. Compartilhe a planilha com o `client_email` da conta como **Editor**.
2. Copie as variáveis de `.env.example` para `.env.local`. Configure `GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY` com o JSON da credencial (em uma linha). O servidor também aceita `FIREBASE_SERVICE_ACCOUNT_KEY` como fallback. No notificador local, pode usar `GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE` com o caminho do arquivo JSON em vez da chave em texto.
3. `AGENDAMENTO_SHEET_ID` é opcional: o padrão é `1FHPhjH8etzw5dJBl8gcYkHt3CRRSItq-uli8Rsr1KLI`. `AGENDAMENTO_SHEET_TAB` é opcional: quando vazio, descobre o título da primeira aba pela API. Reserve a aba para os agendamentos e mantenha a coluna ID e a ordem das 20 colunas. O cabeçalho é criado na aba vazia.
4. Para WhatsApp, configure `WHATSAPP_GATEWAY_API_KEY`. Os padrões são `WHATSAPP_GATEWAY_URL=http://127.0.0.1:8080` e `WHATSAPP_INSTANCE=DataLens_SENAI`. Inicie o gateway da SIA, confirme a conexão da instância e depois execute `iniciar_notificador.bat` (ou `npm run notificador`, Node 24). O gateway permanece local; a Vercel só acessa o Sheets.
5. Para Gmail, configure `GMAIL_USER` e `GMAIL_APP_PASSWORD` (senha de app da conta); `GMAIL_FROM` é opcional. Sem essas credenciais, o notificador registra “Gmail não configurado” e continua atendendo as outras linhas.
6. Configure na Vercel as mesmas variáveis de Sheets (`GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY`, `AGENDAMENTO_SHEET_ID`, `AGENDAMENTO_SHEET_TAB`) e a credencial Firebase Admin (`FIREBASE_SERVICE_ACCOUNT_KEY`, `VITE_FIREBASE_PROJECT_ID`). No desenvolvimento local, carregue `.env.local` também no servidor, por exemplo: `node --env-file-if-exists=.env.local --import tsx server.ts`.

O notificador consulta a planilha a cada `NOTIFICADOR_INTERVALO_SEGUNDOS` (30 por padrão). Envia confirmação de recebimento e decisões conforme o canal escolhido, atualiza as colunas R:T e repete falhas após pelo menos cinco minutos por ID enquanto o processo estiver aberto. Execute apenas uma instância do notificador. Mantenha o PC e o processo ligados para receber os avisos.

As gravações no Firestore continuam mesmo se o Sheets falhar. Consulte `planilhaSyncErro` e `planilhaSyncEm` no documento do agendamento para diagnosticar e repita `POST /api/agendamento-planilha` com `{ "agendamentoId": "ID" }` para sincronizar novamente. O endpoint lê os dados do Firestore e atualiza apenas A:Q, preservando o histórico de envio em R:T. Como o envio e o registro na planilha são operações separadas, uma falha após o envio pode gerar repetição na tentativa seguinte.

Validação local: `npm test`, `npx tsc --noEmit` e `npx vite build`.

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
