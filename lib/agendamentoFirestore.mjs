import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

export function converterCamposFirestore(campos = {}) {
  return Object.fromEntries(Object.entries(campos).map(([nome, valor]) => {
    if ('stringValue' in valor) return [nome, valor.stringValue];
    if ('booleanValue' in valor) return [nome, valor.booleanValue];
    if ('timestampValue' in valor) return [nome, valor.timestampValue];
    if ('integerValue' in valor) return [nome, Number(valor.integerValue)];
    if ('nullValue' in valor) return [nome, null];
    if ('doubleValue' in valor) return [nome, valor.doubleValue];
    if ('mapValue' in valor) return [nome, converterCamposFirestore(valor.mapValue.fields)];
    if ('arrayValue' in valor) return [nome, (valor.arrayValue.values || []).map(item => converterCamposFirestore({ item }).item)];
    throw new Error(`Tipo de campo Firestore não suportado: ${nome}`);
  }));
}

export function erroDeCredencial(erro) {
  return ['app/invalid-credential', 'app/invalid-app-options'].includes(erro?.code)
    || /could not load the default credentials|default credentials.*not found|unable to detect a project id|failed to determine service account|credential implementation.*failed to fetch a valid google oauth2 access token/i.test(erro?.message || '');
}

export async function lerAgendamentoRest(id) {
  const chave = process.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey;
  const url = `https://firestore.googleapis.com/v1/projects/paineldeaulas-e34da/databases/(default)/documents/porto/dados/agendamentos/${encodeURIComponent(id)}?key=${encodeURIComponent(chave)}`;
  const resposta = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (resposta.status === 404) return null;
  if (!resposta.ok) throw new Error(`Firestore: HTTP ${resposta.status}`);
  return converterCamposFirestore((await resposta.json()).fields);
}
