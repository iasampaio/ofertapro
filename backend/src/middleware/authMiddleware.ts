import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../services/auth';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  if (!token) {
    res.status(401).json({
      error: 'Faça login para acessar sua área de afiliado.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({
      error: 'Sessão expirada ou inválida. Faça login novamente.',
      code: 'AUTH_INVALID',
    });
    return;
  }

  req.user = {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
  };
  next();
}
