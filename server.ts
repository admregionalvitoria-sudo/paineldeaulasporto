import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import uploadHandler from './api/upload.js';
import usuariosHandler from './api/usuarios.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DB_FILE = path.join(process.cwd(), 'db.json');

  // Body parsing and CORS
  app.use(bodyParser.json({ limit: '500mb' }));
  app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));
  app.use(cors());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes from api/
  app.all('/api/upload', async (req, res) => {
    try {
      await uploadHandler(req, res);
    } catch (err: any) {
      console.error('Error in /api/upload:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
      }
    }
  });

  app.all('/api/usuarios', async (req, res) => {
    try {
      await usuariosHandler(req, res);
    } catch (err: any) {
      console.error('Error in /api/usuarios:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
      }
    }
  });

  // Helper functions for db.json fallback
  const INITIAL_DATA = {
    aulas: [
      { id: '1', sala: 'Lab 01 - Redes', turma: 'Téc. Redes 2023.2', instrutor: 'Carlos Silva', unidade_curricular: 'Administração de Servidores', inicio: '08:00', fim: '12:00', turno: 'Manhã', data: new Date().toLocaleDateString('pt-BR') },
      { id: '2', sala: 'Lab 02 - Programação', turma: 'Téc. ADS 2024.1', instrutor: 'Ana Pereira', unidade_curricular: 'Lógica de Programação', inicio: '08:00', fim: '12:00', turno: 'Manhã', data: new Date().toLocaleDateString('pt-BR') }
    ],
    anuncios: []
  };

  const readDB = () => {
    if (!fs.existsSync(DB_FILE)) {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2));
      } catch (err) {
        console.warn("Could not write DB_FILE:", err);
      }
      return INITIAL_DATA;
    }
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
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

  const writeDB = (data: any) => {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
      console.warn("Could not write DB_FILE:", err);
    }
  };

  // REST API Routes
  app.get('/api/data', (req, res) => {
    const data = readDB();
    res.json(data);
  });

  app.post('/api/aulas', (req, res) => {
    const db = readDB();
    const novaAula = { ...req.body, id: new Date().toISOString() };
    db.aulas.push(novaAula);
    writeDB(db);
    res.json(db.aulas);
  });

  app.post('/api/aulas/bulk', (req, res) => {
    const db = readDB();
    const novasAulas = req.body.map((d: any) => ({ 
      ...d, 
      id: `${d.sala}-${d.turma}-${Math.random().toString(36).substr(2, 9)}` 
    }));
    db.aulas = novasAulas;
    writeDB(db);
    res.json(db.aulas);
  });

  app.put('/api/aulas/:id', (req, res) => {
    const db = readDB();
    const { id } = req.params;
    const index = db.aulas.findIndex((a: any) => a.id === id);
    
    if (index !== -1) {
      db.aulas[index] = { ...db.aulas[index], ...req.body };
      writeDB(db);
      res.json(db.aulas);
    } else {
      res.status(404).json({ message: 'Aula não encontrada' });
    }
  });

  app.delete('/api/aulas', (req, res) => {
    const db = readDB();
    db.aulas = [];
    writeDB(db);
    res.json(db.aulas);
  });

  app.delete('/api/aulas/:id', (req, res) => {
    const db = readDB();
    const { id } = req.params;
    db.aulas = db.aulas.filter((a: any) => a.id !== id);
    writeDB(db);
    res.json(db.aulas);
  });

  app.post('/api/anuncios', (req, res) => {
    const db = readDB();
    const novoAnuncio = { ...req.body, id: Date.now().toString() };
    if (db.anuncios && db.anuncios.length >= 10) {
      return res.status(400).json({ message: "Limite de anúncios atingido." });
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
      db.anuncios = db.anuncios.filter((a: any) => a.id !== id);
      writeDB(db);
    }
    res.json(db.anuncios || []);
  });

  // Vite middleware in dev, static files in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
