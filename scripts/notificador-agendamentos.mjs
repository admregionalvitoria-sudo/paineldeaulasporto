import nodemailer from 'nodemailer';
import { criarClienteSheets, formatarDataHora } from '../lib/agendamentoSheets.mjs';
import { montarMensagem, precisaNotificar, normalizarTelefone, mascararContato, emailValido } from '../utils/notificacaoAgendamento.mjs';

const tentativas = new Map();
const smtp = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD ? nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }, connectionTimeout: 30000, socketTimeout: 30000 }) : null;
async function enviar(linha) {
  const text = montarMensagem(linha);
  if (linha[10] === 'email') {
    if (!smtp) throw new Error('Gmail não configurado');
    if (!emailValido(linha[12])) throw new Error('E-mail inválido');
    await smtp.sendMail({ from: process.env.GMAIL_FROM || process.env.GMAIL_USER, to: linha[12], subject: 'SENAI Porto — Agendamento de Ambientes', text });
  } else if (linha[10] === 'whatsapp') {
    const number = normalizarTelefone(linha[11]);
    if (!number) throw new Error('Telefone inválido');
    const url = (process.env.WHATSAPP_GATEWAY_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
    const response = await fetch(`${url}/message/sendText/${encodeURIComponent(process.env.WHATSAPP_INSTANCE || 'DataLens_SENAI')}`, { method: 'POST', headers: { apikey: process.env.WHATSAPP_GATEWAY_API_KEY || '', 'Content-Type': 'application/json' }, body: JSON.stringify({ number, text }), signal: AbortSignal.timeout(30000) });
    if (![200, 201].includes(response.status)) throw new Error(`Gateway WhatsApp: HTTP ${response.status}`);
  } else throw new Error('Canal de notificação inválido');
}

async function ciclo() {
  const cliente = await criarClienteSheets({ permitirArquivo: true });
  const linhas = await cliente.ler('A:T');
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha[0] || !precisaNotificar(linha) || Date.now() - (tentativas.get(linha[0]) || 0) < 300000) continue;
    tentativas.set(linha[0], Date.now());
    let entregue = false;
    try {
      await enviar(linha);
      entregue = true;
      await cliente.escrever(`R${i + 1}:T${i + 1}`, [[linha[13], formatarDataHora(new Date()), '']]);
      tentativas.delete(linha[0]);
      console.log(`Notificação ${linha[13]} enviada para ${mascararContato(linha[10] === 'email' ? linha[12] : linha[11])}`);
    } catch (erro) {
      // Nunca persistir mensagens do SMTP: podem conter o destinatário ou credenciais.
      const mensagem = entregue ? 'Enviado, mas falhou o registro na planilha' : ['Gmail não configurado', 'E-mail inválido', 'Telefone inválido', 'Canal de notificação inválido'].includes(erro.message) || erro.message.startsWith('Gateway WhatsApp: HTTP ') ? erro.message : 'Falha ao enviar notificação';
      await cliente.escrever(`T${i + 1}`, [[mensagem]]).catch(() => {});
      console.warn(mensagem);
    }
  }
}
const intervalo = Math.max(1, Number(process.env.NOTIFICADOR_INTERVALO_SEGUNDOS) || 30) * 1000;
console.log('Notificador de agendamentos iniciado.');
while (true) {
  try { await ciclo(); } catch { console.warn('Falha no ciclo do notificador. Verifique a configuração e o acesso à planilha.'); }
  await new Promise(resolve => setTimeout(resolve, intervalo));
}
