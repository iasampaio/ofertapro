import { Router } from 'express';
import { dbStore } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware';

export const billingRouter = Router();
billingRouter.use(requireAuth);

billingRouter.get('/status', (req: AuthenticatedRequest, res) => {
  const user = dbStore.getUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  res.json({
    plan: user.plan,
    dailyPostsLimit: user.plan === 'pro' ? null : user.dailyPostsLimit,
    postsUsedToday: user.postsUsedToday,
    features: {
      unlimitedChannels: user.plan === 'pro',
      unlimitedCloudSchedule: user.plan === 'pro',
      multiStoreApis: user.plan === 'pro',
      noAds: user.plan === 'pro',
    },
  });
});

billingRouter.post('/activate-pro', (req: AuthenticatedRequest, res) => {
  const { plan } = req.body as { plan?: 'free' | 'pro' };
  const nextPlan = plan === 'free' ? 'free' : 'pro';
  dbStore.updatePlan(req.user!.id, nextPlan);

  res.json({
    ok: true,
    plan: nextPlan,
    message:
      nextPlan === 'pro'
        ? 'Plano PRO ativado para sua conta! Todos os limites foram liberados.'
        : 'Plano alterado para Grátis.',
  });
});
