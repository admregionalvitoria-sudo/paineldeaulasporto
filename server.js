
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração para __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'db.json');

// Aumentando limite para suportar imagens/vídeos grandes em base64
// Vídeos base64 são 33% maiores que o binário, 500mb garante uploads seguros
app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));
app.use(cors());

// Dados iniciais (Mock) caso o arquivo não exista
const INITIAL_DATA = {
  aulas: [
    { id: '1', sala: 'Lab 01 - Redes', turma: 'Téc. Redes 2023.2', instrutor: 'Carlos Silva', unidade_curricular: 'Administração de Servidores', inicio: '08:00', fim: '12:00', turno: 'Manhã', data: new Date().toLocaleDateString('pt-BR') },
    { id: '2', sala: 'Lab 02 - Programação', turma: 'Téc. ADS 2024.1', instrutor: 'Ana Pereira', unidade_curricular: 'Lógica de Programação', inicio: '08:00', fim: '12:00', turno: 'Manhã', data: new Date().toLocaleDateString('pt-BR') }
  ],
  anuncios: [] // Array de anúncios
};

// Função auxiliar para ler o banco de dados
const readDB = () => {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2));
    return INITIAL_DATA;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(data);
    // Migração simples caso o db antigo tenha 'anuncio' objeto em vez de 'anuncios' array
    if (parsed.anuncio && !parsed.anuncios) {
        parsed.anuncios = [];
        delete parsed.anuncio;
    }
    return parsed;
  } catch (error) {
    console.error("Erro ao ler DB:", error);
    return INITIAL_DATA;
  }
};

// Função auxiliar para escrever no banco de dados
const writeDB = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// --- ROTAS ---

// GET: Retorna todos os dados
app.get('/api/data', (req, res) => {
  const data = readDB();
  // Simular pequeno delay de rede para UI
  setTimeout(() => res.json(data), 300);
});

// POST: Adicionar uma aula
app.post('/api/aulas', (req, res) => {
  const db = readDB();
  const novaAula = { ...req.body, id: new Date().toISOString() };
  db.aulas.push(novaAula);
  writeDB(db);
  res.json(db.aulas);
});

// POST: Atualizar aulas em massa (CSV)
app.post('/api/aulas/bulk', (req, res) => {
  const db = readDB();
  const novasAulas = req.body.map(d => ({ 
    ...d, 
    id: `${d.sala}-${d.turma}-${Math.random().toString(36).substr(2, 9)}` 
  }));
  db.aulas = novasAulas;
  writeDB(db);
  res.json(db.aulas);
});

// PUT: Atualizar uma aula específica
app.put('/api/aulas/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const index = db.aulas.findIndex(a => a.id === id);
  
  if (index !== -1) {
    db.aulas[index] = { ...db.aulas[index], ...req.body };
    writeDB(db);
    res.json(db.aulas);
  } else {
    res.status(404).json({ message: 'Aula não encontrada' });
  }
});

// DELETE: Limpar todas as aulas
app.delete('/api/aulas', (req, res) => {
  const db = readDB();
  db.aulas = [];
  writeDB(db);
  res.json(db.aulas);
});

// DELETE: Deletar aula específica (opcional, mas boa prática)
app.delete('/api/aulas/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  db.aulas = db.aulas.filter(a => a.id !== id);
  writeDB(db);
  res.json(db.aulas);
});

// POST: Atualizar Lista de Anúncios (Substitui ou Adiciona)
// Vamos fazer um endpoint que aceita a lista inteira ou operações. 
// Para simplificar o front, vamos ter endpoints de adicionar e remover.

app.post('/api/anuncios', (req, res) => {
  const db = readDB();
  const novoAnuncio = { ...req.body, id: Date.now().toString() };
  
  // Limite de 4
  if (db.anuncios && db.anuncios.length >= 4) {
      return res.status(400).json({ message: "Limite de 4 anúncios atingido." });
  }

  if (!db.anuncios) db.anuncios = [];
  db.anuncios.push(novoAnuncio);
  writeDB(db);
  res.json(db.anuncios);
});

app.delete('/api/anuncios/:id', (req, res) => {
    const db = readDB();
    const { id } = req.params;
    if (db.anuncios) {
        db.anuncios = db.anuncios.filter(a => a.id !== id);
        writeDB(db);
    }
    res.json(db.anuncios || []);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Certifique-se de configurar VITE_API_URL=http://localhost:${PORT} no seu .env.local ou o front usará este padrão.`);
});
