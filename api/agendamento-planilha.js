import admin from 'firebase-admin';
import { enviarParaPlanilha } from '../lib/agendamentoSheets.mjs';
import { lerAgendamentoRest } from '../lib/agendamentoFirestore.mjs';
import { verificarUsuario } from '../lib/autenticacaoApi.mjs';
import { sanearDadosAgendamento } from '../lib/validacaoAgendamento.mjs';

const firebaseAdmin = admin.default || admin;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  const id = req.body?.agendamentoId;
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{6,64}$/.test(id)) return res.status(400).json({ error: 'agendamentoId inválido (use 6 a 64 letras, números, _ ou -)' });
  const temDados = Object.prototype.hasOwnProperty.call(req.body || {}, 'dados');
  let referencia;
  try {
    let agendamento;
    if (temDados) {
      agendamento = sanearDadosAgendamento(req.body.dados);
    } else try {
      if (!firebaseAdmin.apps.length) firebaseAdmin.initializeApp({ ...(process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? { credential: firebaseAdmin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)) } : {}), projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'paineldeaulas-e34da' });
      referencia = firebaseAdmin.firestore().doc(`porto/dados/agendamentos/${id}`);
      const documento = await referencia.get();
      agendamento = documento.exists ? documento.data() : null;
    } catch {
      referencia = undefined;
      agendamento = await lerAgendamentoRest(id);
    }
    if (!agendamento) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (['aprovado', 'rejeitado'].includes(agendamento.status)) {
      await verificarUsuario(req, ['super_admin', 'admin', 'coordenador']);
    }
    await enviarParaPlanilha(id, agendamento);
    if (referencia) await referencia.update({ planilhaSyncErro: null, planilhaSyncEm: firebaseAdmin.firestore.FieldValue.serverTimestamp() });
    return res.status(200).json({ success: true });
  } catch (erro) {
    if ([400, 401, 403, 503].includes(erro.status)) return res.status(erro.status).json({ error: erro.message });
    const mensagem = typeof erro.message === 'string' && erro.message.startsWith('Planilha') ? erro.message : 'Falha ao sincronizar com Google Sheets';
    if (referencia) await referencia.update({ planilhaSyncErro: mensagem, planilhaSyncEm: firebaseAdmin.firestore.FieldValue.serverTimestamp() }).catch(() => {});
    return res.status(500).json({ error: mensagem });
  }
}
