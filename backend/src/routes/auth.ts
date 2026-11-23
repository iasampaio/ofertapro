import { Router } from 'express';
import { dbStore } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware';
import { hashPassword, signToken, verifyPassword } from '../services/auth';

export const authRouter = Router();

/** POST /api/auth/register */
authRouter.post('/register', (req, res) => {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name || name.trim().length < 2) {
    res.status(400).json({ error: 'Informe seu nome completo.' });
    return;
  }
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Informe um e-mail válido.' });
    return;
  }
  if (!password || password.length < 6) {
    res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
    return;
  }

  const existing = dbStore.getUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'Este e-mail já está cadastrado. Faça login.' });
    return;
  }

  const passwordHash = hashPassword(password);
  const user = dbStore.createUser(name, email, passwordHash);
  const token = signToken({ id: user.id, email: user.email, name: user.name });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
    },
  });
});

/** POST /api/auth/login */
authRouter.post('/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'Informe e-mail e senha.' });
    return;
  }

  const user = dbStore.getUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    return;
  }

  const token = signToken({ id: user.id, email: user.email, name: user.name });
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
    },
  });
});

/** GET /api/auth/me */
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = dbStore.getUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
    },
  });
});
