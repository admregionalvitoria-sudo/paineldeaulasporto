// ===== Planilha de Agendamentos — SENAI Porto =====
// Cole este código em Extensões > Apps Script da planilha.
// Depois: Implantar > Gerenciar implantações > (lápis) Editar > Versão: "Nova versão" > Implantar.
// Assim a URL /exec continua a mesma.
//
// Ações (todas via POST JSON com o token):
//   { token, linha: {...} }              -> app de aulas cria/atualiza a linha (colunas A:G)
//   { token, acao: "listar" }            -> SIA lê as linhas
//   { token, acao: "marcar", id, status }               -> SIA registra WhatsApp enviado (colunas H:I)
//   { token, acao: "marcar", id, status, canal: "email" } -> SIA registra e-mail enviado (colunas J:K)
//   { token, acao: "email", para, assunto, html, texto }   -> SIA pede para enviar o e-mail (sai da conta dona do script)

const TOKEN = 'TROQUE-POR-UMA-SENHA-LONGA-E-SECRETA';
const CABECALHOS = ['ID', 'Nome', 'Telefone', 'E-mail', 'Status', 'Motivo', 'Sala / Data',
  'Notificado', 'Notificado em', 'E-mail notificado', 'E-mail notificado em'];
const COLUNAS_APP = 7; // A:G pertencem ao app de aulas; H:K à SIA

function aba_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

// Rode uma vez (ou de novo, sem perder dados) para montar o cabeçalho
function configurarPlanilha() {
  const aba = aba_();
  aba.getRange(1, 1, 1, CABECALHOS.length)
    .setValues([CABECALHOS])
    .setFontWeight('bold')
    .setBackground('#0F2A52')
    .setFontColor('#FFFFFF');
  aba.setFrozenRows(1);
  aba.getRange(1, 1, aba.getMaxRows(), CABECALHOS.length).setNumberFormat('@');
  aba.autoResizeColumns(1, CABECALHOS.length);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const dados = JSON.parse(e.postData.contents);
    if (dados.token !== TOKEN) return resposta_({ ok: false, erro: 'Não autorizado' });

    const aba = aba_();
    if (aba.getLastRow() === 0 || aba.getRange(1, 10).getDisplayValue() !== 'E-mail notificado') configurarPlanilha();

    if (dados.acao === 'email') return enviarEmail_(dados);
    if (dados.acao === 'listar') return listar_(aba);
    if (dados.acao === 'marcar') return marcar_(aba, String(dados.id || ''), String(dados.status || ''), String(dados.canal || 'whatsapp'));
    return gravar_(aba, dados.linha || {});
  } catch (err) {
    return resposta_({ ok: false, erro: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function posicaoDoId_(aba, id) {
  const ultima = aba.getLastRow();
  if (ultima < 2) return -1;
  const ids = aba.getRange(2, 1, ultima - 1, 1).getDisplayValues().map(r => r[0]);
  const pos = ids.indexOf(id);
  return pos >= 0 ? pos + 2 : -1;
}

// App de aulas: cria ou atualiza A:G (nunca mexe em H:I)
function gravar_(aba, dadosLinha) {
  const linha = CABECALHOS.slice(0, COLUNAS_APP).map(c => String(dadosLinha[c] || ''));
  if (!linha[0]) return resposta_({ ok: false, erro: 'ID obrigatório' });
  const existente = posicaoDoId_(aba, linha[0]);
  const numeroLinha = existente > 0 ? existente : aba.getLastRow() + 1;
  aba.getRange(numeroLinha, 1, 1, COLUNAS_APP).setNumberFormat('@').setValues([linha]);
  return resposta_({ ok: true, linha: numeroLinha });
}

// SIA: lê todas as linhas
function listar_(aba) {
  const ultima = aba.getLastRow();
  if (ultima < 2) return resposta_({ ok: true, linhas: [] });
  const valores = aba.getRange(2, 1, ultima - 1, CABECALHOS.length).getDisplayValues();
  const linhas = valores
    .map((v, i) => {
      const obj = { linha: i + 2 };
      CABECALHOS.forEach((c, j) => obj[c] = v[j]);
      return obj;
    })
    .filter(o => o.ID);
  return resposta_({ ok: true, linhas: linhas });
}

// SIA: marca que o status atual já foi notificado (WhatsApp em H:I, e-mail em J:K)
function marcar_(aba, id, status, canal) {
  if (!id || !status) return resposta_({ ok: false, erro: 'id e status obrigatórios' });
  if (canal !== 'whatsapp' && canal !== 'email') return resposta_({ ok: false, erro: 'canal inválido' });
  const numeroLinha = posicaoDoId_(aba, id);
  if (numeroLinha < 0) return resposta_({ ok: false, erro: 'ID não encontrado' });
  const agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  const coluna = canal === 'email' ? 10 : 8;
  aba.getRange(numeroLinha, coluna, 1, 2).setNumberFormat('@').setValues([[status, agora]]);
  return resposta_({ ok: true, linha: numeroLinha });
}

// SIA: envia o e-mail de notificação pela conta Google dona do script
function enviarEmail_(dados) {
  const para = String(dados.para || '').trim();
  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(para)) return resposta_({ ok: false, erro: 'e-mail inválido' });
  if (!dados.assunto || !(dados.html || dados.texto)) return resposta_({ ok: false, erro: 'assunto e conteúdo obrigatórios' });
  if (MailApp.getRemainingDailyQuota() < 1) return resposta_({ ok: false, erro: 'cota diária de e-mail esgotada' });
  MailApp.sendEmail({
    to: para,
    subject: String(dados.assunto),
    htmlBody: String(dados.html || ''),
    body: String(dados.texto || ''),
    name: 'SENAI Porto'
  });
  return resposta_({ ok: true, cotaRestante: MailApp.getRemainingDailyQuota() });
}

// Rode uma vez no editor para autorizar o envio de e-mail (pede permissão do Google)
function autorizarEmail() {
  Logger.log('Cota diária restante: ' + MailApp.getRemainingDailyQuota());
}

function resposta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
