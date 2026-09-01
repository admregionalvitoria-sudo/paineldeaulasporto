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
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'grand-droplet-7xjsq'
        });
      } else {
        firebaseAdmin.initializeApp({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'grand-droplet-7xjsq'
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

  // Validar Token de Autorização do Chamador
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autorização necessária' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  let callerUid = '';
  let callerEmail = '';

  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    callerUid = decodedToken.uid;
    callerEmail = decodedToken.email || '';
  } catch (err) {
    return res.status(401).json({ error: 'Token de autenticação inválido ou expirado' });
  }

  // Verificar se o chamador possui papel super_admin
  const db = firebaseAdmin.firestore();
  const callerDoc = await db.collection('porto').doc('dados').collection('usuarios').doc(callerUid).get();
  const callerRole = callerDoc.exists ? callerDoc.data()?.role : (callerEmail === 'admin@senai.br' ? 'super_admin' : '');

  if (callerRole !== 'super_admin' && callerEmail !== 'admin@senai.br') {
    return res.status(403).json({ error: 'Apenas Super Administradores podem gerenciar usuários' });
  }

  if (req.method === 'GET') {
    try {
      const snapshot = await db.collection('porto').doc('dados').collection('usuarios').get();
      const usuarios = snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
      return res.status(200).json({ usuarios });
    } catch (err) {
      return res.status(500).json({ error: err.message });
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
      console.error("Erro ao criar usuário:", err);
      return res.status(500).json({ error: err.message || 'Erro ao criar usuário' });
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
        await firebaseAdmin.auth().updateUser(uid, { disabled: !ativo });
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
