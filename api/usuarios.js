import { verificarUsuario, PAPEIS_VALIDOS } from '../lib/autenticacaoApi.mjs';
import admin from 'firebase-admin';

function getAdminApp() {
  const firebaseAdmin = admin.default || admin;
  if (!firebaseAdmin.apps || firebaseAdmin.apps.length === 0) {
    try {
      const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountVar) {
        const serviceAccount = typeof serviceAccountVar === 'string' ? JSON.parse(serviceAccountVar) : serviceAccountVar;
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(serviceAccount),
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'paineldeaulas-e34da'
        });
      } else {
        firebaseAdmin.initializeApp({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'paineldeaulas-e34da'
        });
      }
    } catch (e) {
      console.warn("Aviso ao inicializar Firebase Admin SDK:", e.message);
    }
  }
  return firebaseAdmin;
}

export default async function handler(req, res) {
  const firebaseAdmin = getAdminApp();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let caller;
  try { caller = await verificarUsuario(req, ['super_admin', 'admin']); }
  catch (err) { return res.status(err.status || 401).json({ error: 'Autenticação ou permissão insuficiente.' }); }
  const callerUid = caller.uid;
  const callerEmail = caller.email;
  const db = firebaseAdmin.firestore();

  if (['POST', 'PUT'].includes(req.method)) {
    const role = req.body?.role;
    if ((req.method === 'POST' || role !== undefined) && !PAPEIS_VALIDOS.includes(role)) {
      return res.status(400).json({ error: 'Papel de usuário inválido.' });
    }
    if (role === 'super_admin' && caller.role !== 'super_admin') {
      return res.status(403).json({ error: 'Somente super_admin pode conceder este papel.' });
    }
  }
  // Um admin também não pode rebaixar, desativar ou excluir um super_admin.
  if (['PUT', 'DELETE'].includes(req.method) && caller.role !== 'super_admin') {
    const uid = req.body?.uid || req.query?.uid;
    if (typeof uid !== 'string' || !uid || uid.includes('/')) return res.status(400).json({ error: 'uid inválido.' });
    try {
      const alvo = await db.doc(`porto/dados/usuarios/${uid}`).get();
      if (alvo.data()?.role === 'super_admin') return res.status(403).json({ error: 'Somente super_admin pode alterar esta conta.' });
    } catch { return res.status(500).json({ error: 'Não foi possível verificar a conta.' }); }
  }

  if (req.method === 'GET') {
    try {
      const snapshot = await db.collection('porto').doc('dados').collection('usuarios').get();
      const usuarios = snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
      return res.status(200).json({ usuarios });
    } catch (err) {
      return res.status(500).json({ error: 'Não foi possível concluir a operação de usuários.' });
    }
  }

  if (req.method === 'POST') {
    const { email, password, nome, role } = req.body || {};
    if (!email || !password || !nome || !role) {
      return res.status(400).json({ error: 'Campos obrigatórios: email, password, nome, role' });
    }

    try {
      // 1. Criar Usuário no Firebase Auth
      const userRecord = await firebaseAdmin.auth().createUser({
        email,
        password,
        displayName: nome
      });

      // 2. Criar Registro de Perfil no Firestore
      await db.collection('porto').doc('dados').collection('usuarios').doc(userRecord.uid).set({
        email,
        nome,
        role,
        ativo: true,
        criadoPor: callerEmail,
        criadoEm: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      });

      return res.status(201).json({ 
        success: true, 
        usuario: { uid: userRecord.uid, email, nome, role, ativo: true } 
      });
    } catch (err) {
      const codigo = err?.code || err?.errorInfo?.code || '';
      if (codigo === 'auth/email-already-exists') return res.status(400).json({ error: 'Já existe uma conta com este e-mail.' });
      if (codigo === 'auth/invalid-password') return res.status(400).json({ error: 'Senha inválida. Use pelo menos 6 caracteres.' });
      if (codigo === 'auth/invalid-email') return res.status(400).json({ error: 'E-mail inválido.' });
      console.error('Erro ao criar usuário:', codigo || 'erro interno');
      return res.status(500).json({ error: 'Não foi possível criar a conta.' });
    }
  }

  if (req.method === 'PUT') {
    const { uid, ativo, role } = req.body || {};
    if (!uid) {
      return res.status(400).json({ error: 'uid é obrigatório' });
    }

    try {
      const updates = {};
      if (typeof ativo === 'boolean') updates.ativo = ativo;
      if (role) updates.role = role;
      updates.atualizadoEm = firebaseAdmin.firestore.FieldValue.serverTimestamp();

      await db.collection('porto').doc('dados').collection('usuarios').doc(uid).update(updates);

      if (typeof ativo === 'boolean') {
        try {
          await firebaseAdmin.auth().updateUser(uid, { disabled: !ativo });
        } catch (authErr) {
          console.warn("Aviso ao atualizar status no Firebase Auth:", authErr.message);
        }
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Não foi possível concluir a operação de usuários.' });
    }
  }

  if (req.method === 'DELETE') {
    const uid = req.query?.uid || req.body?.uid;
    if (!uid) {
      return res.status(400).json({ error: 'uid é obrigatório para exclusão' });
    }

    // Não permitir excluir a si mesmo
    if (uid === callerUid) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta conectada' });
    }

    try {
      // 1. Remover do Firestore
      await db.collection('porto').doc('dados').collection('usuarios').doc(uid).delete();

      // 2. Remover do Firebase Auth se existir
      try {
        await firebaseAdmin.auth().deleteUser(uid);
      } catch (authErr) {
        console.warn("Aviso ao deletar usuário do Firebase Auth:", authErr.message);
      }

      return res.status(200).json({ success: true, message: 'Usuário excluído com sucesso' });
    } catch (err) {
      return res.status(500).json({ error: 'Não foi possível concluir a operação de usuários.' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
