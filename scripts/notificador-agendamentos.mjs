import nodemailer from 'nodemailer';
import { pathToFileURL } from 'node:url';
import { criarClienteSheets, formatarDataHora, garantirCabecalho } from '../lib/agendamentoSheets.mjs';
import { montarMensagem, montarAssunto, precisaNotificar, normalizarTelefone, mascararContato, emailValido } from '../utils/notificacaoAgendamento.mjs';

const tentativas = new Map();
const smtp = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD ? nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }, connectionTimeout: 30000, socketTimeout: 30000 }) : null;
async function enviar(linha, canal) {
  const text = montarMensagem(linha, canal);
  if (canal === 'email') {
    if (!emailValido(linha[10])) throw new Error('E-mail inválido');
    if (!smtp) throw new Error('Gmail não configurado');
    await smtp.sendMail({ from: process.env.GMAIL_FROM || process.env.GMAIL_USER, to: linha[10], subject: montarAssunto(linha), text });
  } else {
    const number = normalizarTelefone(linha[12]);
    if (linha[11] !== 'Sim' || !number) throw new Error('WhatsApp não autorizado ou telefone inválido');
    const url = (process.env.WHATSAPP_GATEWAY_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
    const response = await fetch(`${url}/message/sendText/${encodeURIComponent(process.env.WHATSAPP_INSTANCE || 'DataLens_SENAI')}`, { method: 'POST', headers: { apikey: process.env.WHATSAPP_GATEWAY_API_KEY || '', 'Content-Type': 'application/json' }, body: JSON.stringify({ number, text }), signal: AbortSignal.timeout(30000) });
    if (![200, 201].includes(response.status)) throw new Error(`Gateway WhatsApp: HTTP ${response.status}`);
  }
}

export async function ciclo(cliente, enviarCanal = enviar, agora = Date.now, controleTentativas = tentativas) {
  await garantirCabecalho(cliente);
  const linhas = await cliente.ler('A:W');
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha[0]) continue;
    const erros = Object.fromEntries(String(linha[22] || '').split('\n').filter(Boolean).map(erro => [erro.startsWith('WhatsApp:') ? 'whatsapp' : 'email', erro]));
    for (const canal of ['email', 'whatsapp']) {
      const chave = `${linha[0]}:${canal}`;
      if (!precisaNotificar(linha, canal) || (controleTentativas.has(chave) && agora() - controleTentativas.get(chave) < 300000)) continue;
      controleTentativas.set(chave, agora());
      let entregue = false;
      try {
        await enviarCanal(linha, canal);
        entregue = true;
        const faixa = canal === 'email' ? `S${i + 1}:T${i + 1}` : `U${i + 1}:V${i + 1}`;
        await cliente.escrever(faixa, [[linha[14], formatarDataHora(new Date(agora()))]]);
        linha[canal === 'email' ? 18 : 20] = linha[14];
        delete erros[canal];
        controleTentativas.delete(chave);
        console.log(`Notificação ${linha[14]} enviada por ${canal === 'email' ? 'e-mail' : 'WhatsApp'} para ${mascararContato(linha[canal === 'email' ? 10 : 12])}`);
      } catch (erro) {
        // Nunca persistir mensagens do SMTP: podem conter destinatário ou credenciais.
        const mensagem = entregue ? 'Enviado, mas falhou o registro na planilha' : ['Gmail não configurado', 'E-mail inválido', 'WhatsApp não autorizado ou telefone inválido'].includes(erro.message) || /^Gateway WhatsApp: HTTP \d+$/.test(erro.message) ? erro.message : 'Falha ao enviar notificação';
        erros[canal] = `${canal === 'email' ? 'E-mail' : 'WhatsApp'}: ${mensagem}`;
        console.warn(erros[canal]);
      }
      // Preserva o erro do outro canal, inclusive quando apenas um deles teve sucesso.
      await cliente.escrever(`W${i + 1}`, [[Object.values(erros).join('\n')]]).catch(() => console.warn('Falha ao registrar erro de notificação na planilha.'));
    }
  }
}

async function iniciar() {
  const intervalo = Math.max(1, Number(process.env.NOTIFICADOR_INTERVALO_SEGUNDOS) || 30) * 1000;
  console.log('Notificador de agendamentos iniciado.');
  while (true) {
    try { await ciclo(await criarClienteSheets({ permitirArquivo: true })); }
    catch (erro) {
      if (erro.message === 'Cabeçalho da planilha diferente do esperado') {
        console.error(erro.message);
        process.exitCode = 1;
        break;
      }
      console.warn('Falha no ciclo do notificador. Verifique a configuração e o acesso à planilha.');
    }
    await new Promise(resolve => setTimeout(resolve, intervalo));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await iniciar();
