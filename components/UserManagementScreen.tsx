import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Shield, ArrowLeft, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface UserManagementScreenProps {
  onBack: () => void;
}

const UserManagementScreen: React.FC<UserManagementScreenProps> = ({ onBack }) => {
  const { usuarioAtual } = useAuth();
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

    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const currentUser = auth.currentUser;
      const idToken = currentUser ? await currentUser.getIdToken() : '';

      const response = await fetch('/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ nome, email, password, role })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar usuário.');
      }

      setSuccess(`Usuário ${email} cadastrado com sucesso!`);
      setNome('');
      setEmail('');
      setPassword('');
      setRole('admin');
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar ao servidor de usuários.');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleUserStatus = async (user: UserProfile) => {
    try {
      const currentUser = auth.currentUser;
      const idToken = currentUser ? await currentUser.getIdToken() : '';

      const response = await fetch('/api/usuarios', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ uid: user.uid, ativo: !user.ativo })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao alterar status.');
      }
    } catch (err: any) {
      alert("Erro ao alterar status do usuário: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Topbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Gestão de Usuários & Acessos</h1>
              <p className="text-xs text-slate-400">Controle de papéis e credenciais (Super Admin)</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-8">
        
        {/* Card Formulário de Novo Usuário */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-blue-600" />
          
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-red-500" />
            Cadastrar Novo Usuário Administrativo
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                placeholder="Ex: João da Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                E-mail Institucional
              </label>
              <input
                type="email"
                placeholder="usuario@senai.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Senha Inicial
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Papel / Permissão
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-red-500"
              >
                <option value="admin">Administrador (Gestão Geral)</option>
                <option value="midia">Operador de Mídia / TV</option>
                <option value="super_admin">Super Administrador</option>
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <button
                type="submit"
                disabled={isCreating}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-red-900/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  'Cadastrar Usuário'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Tabela de Usuários Cadastrados */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Usuários do Sistema ({usuarios.length})
            </h3>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">Carregando usuários...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-6">Nome</th>
                    <th className="py-3.5 px-6">E-mail</th>
                    <th className="py-3.5 px-6">Papel</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {usuarios.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6 font-medium text-white">{u.nome}</td>
                      <td className="py-4 px-6 text-slate-400">{u.email}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          u.role === 'super_admin' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          u.role === 'admin' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {u.ativo ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                            <CheckCircle className="w-4 h-4" /> Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <XCircle className="w-4 h-4" /> Inativo
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => toggleUserStatus(u)}
                          disabled={u.email === 'admin@senai.br' || u.uid === usuarioAtual?.uid}
                          className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-xs font-medium text-slate-300 disabled:opacity-30 transition-colors"
                        >
                          {u.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserManagementScreen;
