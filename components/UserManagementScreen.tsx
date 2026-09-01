import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Shield, ArrowLeft, CheckCircle, AlertTriangle, Trash2, Key } from 'lucide-react';

interface UserManagementScreenProps {
  onBack: () => void;
}

const UserManagementScreen: React.FC<UserManagementScreenProps> = ({ onBack }) => {
  const { usuarioAtual, criarUsuario } = useAuth();
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const usuariosRef = collection(db, 'porto', 'dados', 'usuarios');
    const unsub = onSnapshot(usuariosRef, (snapshot) => {
      const userList = snapshot.docs.map(d => ({
        uid: d.id,
        ...d.data()
      })) as UserProfile[];
      setUsuarios(userList);
      setLoading(false);
    }, (err) => {
      console.error("Erro ao listar usuários:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Tenta criar pelo endpoint da API de backend
      let created = false;
      try {
        const currentUser = auth.currentUser;
        const idToken = currentUser ? await currentUser.getIdToken() : '';

        const response = await fetch('/api/usuarios', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ nome: nome.trim(), email: email.trim(), password, role })
        });

        if (response.ok) {
          created = true;
        }
      } catch (apiErr) {
        console.warn("API route indisponível, usando fallback client-side:", apiErr);
      }

      // 2. Fallback client-side usando o SecondaryAuthApp no AuthContext
      if (!created && criarUsuario) {
        await criarUsuario(nome.trim(), email.trim(), password, role);
        created = true;
      }

      if (created) {
        setSuccess(`Usuário ${email} cadastrado com sucesso!`);
        setNome('');
        setEmail('');
        setPassword('');
        setRole('admin');
      } else {
        throw new Error("Não foi possível criar o usuário. Tente novamente.");
      }
    } catch (err: any) {
      console.error("Erro ao criar usuário:", err);
      let msg = err.message || 'Erro ao cadastrar usuário.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Este e-mail já está cadastrado no sistema.';
      }
      setError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleUserStatus = async (user: UserProfile) => {
    try {
      const userRef = doc(db, 'porto', 'dados', 'usuarios', user.uid);
      await updateDoc(userRef, {
        ativo: !user.ativo
      });
    } catch (err: any) {
      alert('Erro ao alterar status: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#EDF1F6] text-[#0F2A52] p-4 sm:p-8 font-sans">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 max-w-[2000px] mx-auto bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-[#F8FAFC] hover:bg-[#DBEAFE] text-[#0F2A52] border border-[#E5E7EB] transition-all"
            title="Voltar ao Painel Geral"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F4901E]">SENAI • CONTROLE DE ACESSO</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-[#0F2A52] border border-blue-200">
                {usuarios.length} Usuários Ativos
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#0F2A52] mt-1">
              Gerenciamento de Usuários
            </h1>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-[2000px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna Esquerda: Formulário de Cadastro */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-[#E5E7EB] shadow-lg">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#0F2A52] mb-2 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#F4901E]" />
            Cadastrar Novo Usuário
          </h2>
          <p className="text-xs text-[#6B7280] mb-6">
            Crie novos logins para a equipe pedagógica ou comunicação gerenciar o sistema.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider block mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                placeholder="Ex: Roberto Almeida"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider block mb-1">E-mail Institucional *</label>
              <input
                type="email"
                required
                placeholder="usuario@senai.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider block mb-1">Senha Provisória *</label>
              <input
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider block mb-1">Nível de Permissão (Role) *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52] font-semibold"
              >
                <option value="admin">Administrador Geral (Acesso Total)</option>
                <option value="coordenador">Coordenador Pedagógico (Horários e Salas)</option>
                <option value="comunicacao">Comunicação / Mídia (Apenas TV)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-4 px-4 bg-[#F4901E] hover:bg-[#E67E22] text-white font-black uppercase text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isCreating ? 'Cadastrando...' : 'Criar Usuário'}</span>
            </button>
          </form>
        </div>

        {/* Coluna Direita: Lista de Usuários */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-[#E5E7EB] shadow-lg">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E5E7EB]">
            <div>
              <h2 className="text-lg font-black uppercase text-[#0F2A52]">Usuários Cadastrados ({usuarios.length})</h2>
              <p className="text-xs text-[#6B7280]">Contas autorizadas a autenticar no sistema</p>
            </div>
          </div>

          <div className="space-y-3">
            {usuarios.map((user) => (
              <div
                key={user.uid}
                className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-between gap-4 hover:shadow-xs transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0F2A52] text-white flex items-center justify-center font-black text-sm">
                    {(user.nome || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-[#0F2A52]">{user.nome || 'Usuário'}</h4>
                      <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-blue-100 text-[#0F2A52]">
                        {user.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] font-mono">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleUserStatus(user)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      user.ativo !== false
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}
                  >
                    {user.ativo !== false ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              </div>
            ))}

            {usuarios.length === 0 && (
              <div className="py-12 text-center text-xs font-bold text-[#6B7280]">
                {loading ? 'Carregando lista de usuários...' : 'Nenhum usuário cadastrado além do administrador principal.'}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserManagementScreen;
