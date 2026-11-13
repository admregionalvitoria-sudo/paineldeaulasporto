# Segurança do Painel de Aulas

## O que foi corrigido no código (novembro/2026)

| Falha | Correção |
|---|---|
| Login liberava sessão de super administrador com qualquer senha para os e-mails "mestre", e havia uma senha fixa no código. | Removido. O acesso exige login real no Firebase e perfil ativo em `porto/dados/usuarios/{uid}`. |
| Conta autenticada sem perfil virava `admin` automaticamente. | Removido. Sem perfil, a conta é recusada ("Conta sem acesso liberado"). |
| A tela de gestão confiava num dado salvo no navegador (`porto_session_user`). | A sessão só vale com o usuário autenticado no Firebase. |
| Papéis concedidos por e-mail fixo no navegador e em `api/usuarios.js`. | O papel vem só do documento do usuário. Só `super_admin` concede ou altera `super_admin`. |
| `api/upload` aceitava envio e exclusão de arquivos sem login. | Exige usuário com papel `super_admin`, `admin`, `comunicacao` ou `midia`. |
| `api/agendamento-planilha` lia o Firestore antes de enviar (falhava com a cota esgotada) e aceitava qualquer chamada. | Recebe os dados direto do sistema, valida campo a campo e exige login de gestão para "Aprovado"/"Negado". |

## Perfis de acesso

A matriz fica em `utils/permissoes.ts` e vale para o menu, as rotas e os botões.

| Perfil | Pode |
|---|---|
| Administrador / Super administrador | Tudo. |
| Coordenador pedagógico | Cronograma (inclusive importar planilha), histórico, ambientes e manutenção, aprovar e recusar reservas, ler alertas e a Agenda do Porto. |
| Comunicação | Só mídias das TVs e do painel do cliente. |

Coordenador não vê mídias, usuários, auditoria, limpeza nem prioridades/agenda do administrativo, e não
tem os botões de apagar cronograma ou histórico. As APIs conferem o perfil no servidor: upload de mídia
aceita só Comunicação e Administrador; usuários, só Administrador.

## O que ainda falta: regras do Firestore

As regras em produção permitem **ler e gravar em quase todas as coleções sem login**, inclusive
`usuarios`, `agendamentos` (nome, e-mail e telefone de quem pediu sala) e `logs`. As correções acima
protegem a interface e as APIs, mas quem conhecer a chave pública do projeto ainda consegue acessar o
banco direto. Só as regras fecham isso.

As regras não são publicadas pelo deploy da Vercel. É preciso colar no Console do Firebase.

### Antes de ativar

1. Todas as telas abertas (TVs, `/limpeza`, celulares) precisam estar na versão atual do sistema.
   Recarregue cada uma com Ctrl+F5.
2. Estes pontos gravam **sem login** e a proposta abaixo já os mantém funcionando:
   - `/agendamento`: cria a reserva em `agendamentos` e o espelho em `agendamentosPublicos`.
   - `/agendamento`: grava `planilhaSyncErro`/`planilhaSyncEm` na reserva recém-criada. Com a regra
     abaixo essa gravação é recusada para quem não está logado; o envio à planilha **não depende
     dela** e o erro aparece só no console. Sem impacto para o usuário.
   - `/limpeza`: a tela é pública. Se a equipe de limpeza grava observações sem login, mantenha a
     escrita pública em `limpeza` (já está assim na proposta).
3. Teste primeiro no "Simulador de regras" do Console e acompanhe o sistema por um dia.

### Proposta de regras

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function perfil() {
      return get(/databases/$(database)/documents/porto/dados/usuarios/$(request.auth.uid)).data;
    }
    function logado() {
      return request.auth != null
        && exists(/databases/$(database)/documents/porto/dados/usuarios/$(request.auth.uid))
        && perfil().ativo == true;
    }
    function temPapel(papeis) { return logado() && perfil().role in papeis; }
    function gestao() { return temPapel(['super_admin', 'admin', 'coordenador']); }
    function midia() { return temPapel(['super_admin', 'admin', 'comunicacao', 'midia']); }
    function admin() { return temPapel(['super_admin', 'admin']); }

    match /porto/dados/{colecao}/{id} {
      // Telas públicas (TVs, limpeza, agendamento) só leem estas coleções.
      allow read: if colecao in ['aulas', 'anuncios', 'ambientes', 'manutencoes', 'limpeza',
                                 'alertas', 'meta', 'agendamentosPublicos', 'prioridadesLimpeza',
                                 'limpezaConcluida'];

      // Grade, ambientes e manutenção: pedagógico (coordenador) e administrador.
      allow write: if colecao in ['aulas', 'ambientes', 'manutencoes', 'meta'] && gestao();
      // Alertas, prioridades de limpeza e agenda: só o administrador publica.
      // (Quem lê um alerta marca como lido: liberar update para a gestão.)
      allow create, delete: if colecao in ['alertas', 'prioridadesLimpeza', 'agendaPorto'] && admin();
      allow update: if colecao == 'alertas' && gestao();
      allow update: if colecao in ['prioridadesLimpeza', 'agendaPorto'] && admin();
      allow read: if colecao == 'agendaPorto' && logado();

      // Anúncios: só comunicação e administrador.
      allow write: if colecao == 'anuncios' && midia();

      // Observações e conclusão de limpeza: a tela /limpeza é pública.
      allow write: if colecao in ['limpeza', 'limpezaConcluida'];
    }

    // Reservas completas (dados pessoais): qualquer pessoa cria como pendente; só a gestão lê e decide.
    match /porto/dados/agendamentos/{id} {
      allow create: if request.resource.data.status == 'pendente'
        && request.resource.data.solicitante is string
        && request.resource.data.solicitante.size() <= 120
        && request.resource.data.sala is string
        && request.resource.data.data is string;
      allow read, update, delete: if gestao();
    }

    // Espelho sem dados pessoais, usado por /agendamento e /limpeza.
    match /porto/dados/agendamentosPublicos/{id} {
      allow read: if true;
      allow create: if request.resource.data.status == 'pendente'
        && request.resource.data.keys().hasOnly(['sala', 'data', 'turno', 'horarioInicio',
             'horarioFim', 'status', 'criarAulaAoAprovar', 'turma', 'atualizadoEm']);
      allow update, delete: if gestao();
    }

    // Usuários: cada um lê o próprio perfil; só administradores gerenciam.
    match /porto/dados/usuarios/{uid} {
      allow read: if request.auth != null && (request.auth.uid == uid || admin());
      allow create, update: if admin()
        && (request.resource.data.role != 'super_admin' || perfil().role == 'super_admin');
      allow delete: if admin() && uid != request.auth.uid;
    }

    // Auditoria: quem está logado registra; só administradores leem; ninguém altera.
    match /porto/dados/logs/{id} {
      allow create: if logado();
      allow read: if admin();
    }
  }
}
```

Coleções não listadas ficam bloqueadas por padrão. Se alguma tela parar de funcionar depois de
ativar, o console do navegador mostra `permission-denied` com o caminho da coleção.

### Como publicar

1. Abra o [Console do Firebase](https://console.firebase.google.com/) → projeto `paineldeaulas-e34da`
   → **Firestore Database** → aba **Regras**.
2. Copie as regras atuais para um arquivo de texto (cópia de segurança).
3. Cole a proposta, clique em **Publicar**.
4. Teste: abrir `/` sem login, fazer uma solicitação em `/agendamento`, entrar no `/admin`, aprovar
   e recusar uma reserva, importar uma planilha, enviar uma mídia.
5. Se algo falhar, restaure a cópia de segurança e publique de novo.

## Outros cuidados

- No Console do Firebase → **Authentication → Configurações → Ações do usuário**, desative
  "Permitir a criação de contas (inscrição)". As contas passam a ser criadas só pela tela de usuários.
  Atenção: isso só funciona se a variável `FIREBASE_SERVICE_ACCOUNT_KEY` estiver configurada na
  Vercel. Sem ela, a tela de usuários cria contas pelo navegador e precisa da inscrição ativa. Teste
  criar um usuário depois de desativar.
- O token da planilha (`SHEETS_WEBHOOK_TOKEN`) e a senha de app do Gmail foram compartilhados em
  conversa. Troque os dois.
- Os IDs das reservas aparecem no espelho público. Com eles, alguém pode reenviar uma linha
  "Pendente" à planilha com outros dados de contato. O impacto é baixo (a SIA só reenvia o aviso de
  "recebida"), mas fica registrado.
