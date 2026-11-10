import admin from 'firebase-admin';
import { criarClienteSheets, sincronizarLinha } from '../lib/agendamentoSheets.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  const id = req.body?.agendamentoId;
  if (typeof id !== 'string' || !id.trim() || id.includes('/') || id.length > 1500) return res.status(400).json({ error: 'agendamentoId inválido' });
  let referencia;
  try {
    if (!admin.apps.length) admin.initializeApp({ ...(process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? { credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)) } : {}), projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'paineldeaulas-e34da' });
    referencia = admin.firestore().doc(`porto/dados/agendamentos/${id}`);
    const documento = await referencia.get();
    if (!documento.exists) return res.status(404).json({ error: 'Agendamento não encontrado' });
    await sincronizarLinha(await criarClienteSheets(), id, documento.data());
    await referencia.update({ planilhaSyncErro: null, planilhaSyncEm: admin.firestore.FieldValue.serverTimestamp() });
    return res.status(200).json({ success: true });
  } catch (erro) {
    const mensagem = ['Credencial Google Sheets não configurada', 'Cabeçalho da planilha diferente do esperado'].includes(erro.message) || /^Google Sheets: HTTP \d+$/.test(erro.message) ? erro.message : 'Falha ao sincronizar com Google Sheets';
    if (referencia) await referencia.update({ planilhaSyncErro: mensagem, planilhaSyncEm: admin.firestore.FieldValue.serverTimestamp() }).catch(() => {});
    return res.status(500).json({ error: mensagem });
  }
}
