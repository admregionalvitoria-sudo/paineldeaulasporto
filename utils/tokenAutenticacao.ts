import { auth } from '../firebase';

export async function obterIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Entre com uma conta autorizada para gerenciar mídias.');
  return user.getIdToken();
}

export async function excluirBlob(url: string): Promise<void> {
  const idToken = await obterIdToken();
  const resposta = await fetch(`/api/upload?url=${encodeURIComponent(url)}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${idToken}` }
  });
  if (!resposta.ok) throw new Error('Não foi possível excluir o arquivo. Verifique seu acesso.');
}
