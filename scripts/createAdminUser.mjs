const API_KEY = "AIzaSyAtFpYzDSwbQqxvhj0FZGWXG26Ki_L7BRk";
const PROJECT_ID = "painel-de-aulas";
const email = "admin@senai.br";
const password = "Findes@20";
const nome = "Administrador SENAI";
const role = "super_admin";

async function main() {
  console.log(`Conectando ao Firebase REST API (${PROJECT_ID})...`);

  let idToken = '';
  let uid = '';

  // 1. Tentar criar o usuário no Firebase Auth via REST API
  const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;
  const signUpRes = await fetch(signUpUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });

  const signUpData = await signUpRes.json();

  if (signUpRes.ok) {
    console.log(`✅ Usuário criado no Authentication com sucesso! UID: ${signUpData.localId}`);
    idToken = signUpData.idToken;
    uid = signUpData.localId;
  } else if (signUpData.error && signUpData.error.message.includes('EMAIL_EXISTS')) {
    console.log(`O e-mail ${email} já existe. Efetuando login via REST API...`);
    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
    const signInRes = await fetch(signInUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const signInData = await signInRes.json();
    if (!signInRes.ok) {
      console.error('❌ Erro no login:', signInData);
      process.exit(1);
    }
    console.log(`✅ Autenticado com sucesso! UID: ${signInData.localId}`);
    idToken = signInData.idToken;
    uid = signInData.localId;
  } else {
    console.error('❌ Erro ao criar usuário no Auth:', signUpData);
    process.exit(1);
  }

  // 2. Gravar perfil no Firestore via REST API
  console.log(`Gravando documento em porto/dados/usuarios/${uid}...`);
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/porto/dados/documents/usuarios/${uid}?key=${API_KEY}`;
  
  const docPayload = {
    fields: {
      uid: { stringValue: uid },
      email: { stringValue: email },
      nome: { stringValue: nome },
      role: { stringValue: role },
      ativo: { booleanValue: true },
      atualizadoEm: { stringValue: new Date().toISOString() }
    }
  };

  const fsRes = await fetch(firestoreUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify(docPayload)
  });

  const fsData = await fsRes.json();

  if (fsRes.ok) {
    console.log(`🎉 CONCLUÍDO COM SUCESSO!`);
    console.log(`--------------------------------------------------`);
    console.log(`E-mail:    ${email}`);
    console.log(`Senha:     ${password}`);
    console.log(`Função:    ${role}`);
    console.log(`UID:       ${uid}`);
    console.log(`--------------------------------------------------`);
  } else {
    console.error('❌ Erro ao gravar perfil no Firestore:', fsData);
  }
}

main().catch(console.error);
