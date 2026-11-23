import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { authRouter } from './routes/auth';
import { offersRouter } from './routes/offers';
import { automationRouter } from './routes/automation';
import { billingRouter } from './routes/billing';
import { startCloudScheduler } from './services/scheduler';

const app = express();
const PORT = Number(process.env.PORT) || 3333;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'OfertaPro Cloud API (Multi-Usuário SQLite)',
    timestamp: new Date().toISOString(),
  });
});

/** Página de Política de Privacidade pronta para informar na Google Play Console */
app.get('/privacy', (_req, res) => {
  const htmlPath = path.join(__dirname, '..', '..', 'playstore', 'privacy-policy.html');
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
    return;
  }
  res.type('html').send('<h1>Política de Privacidade - OfertaPro</h1><p>Contato: suporte@ofertapro.app</p>');
});

app.use('/api/auth', authRouter);
app.use('/api/offers', offersRouter);
app.use('/api/automation', automationRouter);
app.use('/api/billing', billingRouter);

app.listen(PORT, () => {
  console.log(`🚀 OfertaPro Backend rodando em http://localhost:${PORT}`);
  startCloudScheduler();
});
