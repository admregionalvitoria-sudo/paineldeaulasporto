const https = require('https');

const API_KEY = "AIzaSyAtFpYzDSwbQqxvhj0FZGWXG26Ki_L7BRk";
const PROJECT_ID = "painel-de-aulas";
const email = "admin@senai.br";
const password = "Findes@20";
const nome = "Administrador SENAI";
const role = "super_admin";

function post(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname,
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers }
    };
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          resolve({ status: res.statusCode, data: parsed });
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function patch(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname,
      path,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers }
    };
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log(`\n🔗 Conectando ao Firebase Project: ${PROJECT_ID}\n`);

  let uid, idToken;

  // ── 1. Criar usuário via Identity Toolkit ──
  console.log(`📧 Criando usuário: ${email}`);
  const signUp = await post(
    'identitytoolkit.googleapis.com',
    `/v1/accounts:signUp?key=${API_KEY}`,
    {},
    { email, password, returnSecureToken: true }
  );

  if (signUp.status === 200) {
    uid = signUp.data.localId;
    idToken = signUp.data.idToken;
    console.log(`✅ Usuário criado no Auth!\n   UID: ${uid}`);
  } else if (signUp.data.error && signUp.data.error.message === 'EMAIL_EXISTS') {
    console.log(`⚠️  E-mail já existe. Efetuando login...`);
    const signIn = await post(
      'identitytoolkit.googleapis.com',
      `/v1/accounts:signInWithPassword?key=${API_KEY}`,
      {},
      { email, password, returnSecureToken: true }
    );
    if (signIn.status === 200) {
      uid = signIn.data.localId;
      idToken = signIn.data.idToken;
      console.log(`✅ Login realizado!\n   UID: ${uid}`);
    } else {
      console.error(`❌ Erro ao fazer login:`, JSON.stringify(signIn.data, null, 2));
      process.exit(1);
    }
  } else {
    console.error(`❌ Erro ao criar usuário:`, JSON.stringify(signUp.data, null, 2));
    process.exit(1);
  }

  // ── 2. Gravar perfil no Firestore via REST ──
  console.log(`\n📄 Gravando perfil no Firestore...`);

  // Caminho correto: porto (doc) → dados (col) → usuarios (col dentro de subcoleção)
  // Estrutura: /porto/dados/usuarios/{uid}
  const fsPath = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/porto/dados/usuarios/${uid}`;
  
  const fsResult = await patch(
    'firestore.googleapis.com',
    fsPath,
    { Authorization: `Bearer ${idToken}` },
    {
      fields: {
        uid:          { stringValue: uid },
        email:        { stringValue: email },
        nome:         { stringValue: nome },
        role:         { stringValue: role },
        ativo:        { booleanValue: true },
        atualizadoEm: { stringValue: new Date().toISOString() }
      }
    }
  );

  if (fsResult.status === 200) {
    console.log(`✅ Perfil gravado no Firestore!\n`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎉 USUÁRIO CRIADO COM SUCESSO!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  E-mail : ${email}`);
    console.log(`  Senha  : ${password}`);
    console.log(`  Função : ${role}`);
    console.log(`  UID    : ${uid}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  } else {
    console.warn(`⚠️  Auth OK mas Firestore retornou status ${fsResult.status}:`);
    console.warn(JSON.stringify(fsResult.data, null, 2));
    console.log(`\n  Mesmo assim o usuário JÁ EXISTE no Firebase Auth:`);
    console.log(`  E-mail : ${email}`);
    console.log(`  Senha  : ${password}`);
    console.log(`  UID    : ${uid}`);
  }
}

main().catch(err => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
