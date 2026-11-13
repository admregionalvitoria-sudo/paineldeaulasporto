import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import { converterCamposFirestore } from './agendamentoFirestore.mjs';

export const PAPEIS_VALIDOS = ['super_admin', 'admin', 'coordenador', 'comunicacao', 'midia'];

// Perfis conferidos há pouco, por instância do servidor: só servem de reserva quando o banco falha.
const VALIDADE_PERFIL_MS = 15 * 60 * 1000;
const perfisRecentes = new Map();

export function erroHttp(status, message) {
  return Object.assign(new Error(message), { status });
}

// Usa o token do próprio usuário também no Firestore, respeitando as regras.
export async function verificarUsuario(req, papeisPermitidos) {
  const cabecalho = req.headers?.authorization || req.headers?.Authorization || '';
  const token = /^Bearer ([^\s]+)$/i.exec(cabecalho)?.[1];
  if (!token) throw erroHttp(401, 'Autenticação necessária.');
  const chave = process.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey;
  const signal = AbortSignal.timeout(10000);
  try {
    const resposta = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(chave)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }), signal
    });
    if (!resposta.ok) throw erroHttp(401, 'Token de autenticação inválido ou expirado.');
    const usuario = (await resposta.json()).users?.[0];
    if (!usuario?.localId || usuario.disabled) throw erroHttp(401, 'Token de autenticação inválido ou expirado.');
    const projeto = process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId;
    const banco = process.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || '(default)';
    const perfilResposta = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projeto)}/databases/${encodeURIComponent(banco)}/documents/porto/dados/usuarios/${encodeURIComponent(usuario.localId)}?key=${encodeURIComponent(chave)}`, {
      headers: { Authorization: `Bearer ${token}` }, signal
    });
    let perfil;
    if (perfilResposta.ok) {
      perfil = converterCamposFirestore((await perfilResposta.json()).fields);
      perfisRecentes.set(usuario.localId, { ativo: perfil.ativo, role: perfil.role, ate: Date.now() + VALIDADE_PERFIL_MS });
    } else if (perfilResposta.status === 429 || perfilResposta.status >= 500) {
      // Banco indisponível (ex.: cota esgotada): vale o perfil conferido há pouco nesta instância.
      const recente = perfisRecentes.get(usuario.localId);
      if (!recente || recente.ate < Date.now()) throw erroHttp(503, 'Não foi possível conferir a permissão agora. Tente novamente em alguns minutos.');
      perfil = recente;
    } else {
      perfisRecentes.delete(usuario.localId);
      throw erroHttp(403, 'Conta sem acesso liberado para esta operação.');
    }
    if (perfil.ativo !== true || !PAPEIS_VALIDOS.includes(perfil.role) || !papeisPermitidos.includes(perfil.role)) {
      throw erroHttp(403, 'Conta sem acesso liberado para esta operação.');
    }
    return { uid: usuario.localId, email: usuario.email || '', role: perfil.role };
  } catch (erro) {
    if ([401, 403, 503].includes(erro.status)) throw erro;
    throw erroHttp(401, 'Não foi possível verificar a autenticação. Tente novamente.');
  }
}
