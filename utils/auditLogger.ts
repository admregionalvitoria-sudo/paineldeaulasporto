import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AuditAction, UserProfile } from '../types';

export async function registrarLog({
  user,
  acao,
  entidadeTipo,
  entidadeId,
  antes,
  depois
}: {
  user: UserProfile | null;
  acao: AuditAction;
  entidadeTipo: 'aula' | 'agendamento' | 'anuncio' | 'usuario' | 'ambiente';
  entidadeId: string;
  antes?: any;
  depois?: any;
}): Promise<void> {
  try {
    const logsCollectionRef = collection(db, 'porto', 'dados', 'logs');
    await addDoc(logsCollectionRef, {
      actorUid: user?.uid || 'sistema',
      actorEmail: user?.email || 'sistema@senai.br',
      actorNome: user?.nome || 'Sistema',
      acao,
      entidadeTipo,
      entidadeId,
      antes: antes ? JSON.parse(JSON.stringify(antes)) : null,
      depois: depois ? JSON.parse(JSON.stringify(depois)) : null,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error("Erro ao registrar log de auditoria:", err);
  }
}
