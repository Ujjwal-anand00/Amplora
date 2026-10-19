import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { env } from '../config/env.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isAnonymous?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Generates a signed JWT token for a user
 */
export function generateToken(user: AuthUser, expiresIn = '7d'): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isAnonymous: Boolean(user.isAnonymous),
    },
    env.AUTH_SECRET,
    { expiresIn } as any
  );
}

function resolveDemoUser(demoUserId: string, _requestedRole?: string): AuthUser {
  const cleanId = demoUserId.trim();

  // Production security: In production, demo headers never grant elevated roles
  if (env.NODE_ENV === 'production') {
    return {
      id: cleanId,
      email: `${cleanId}@demo.local`,
      name: `Demo User (${cleanId.slice(0, 8)})`,
      role: UserRole.CREATOR,
      isAnonymous: true,
    };
  }

  // Development/Test fallback for seeded admin identity
  if (cleanId === 'usr-admin-1') {
    return {
      id: 'usr-admin-1',
      email: env.ADMIN_EMAIL || 'admin@campaign.com',
      name: 'Platform Administrator',
      role: UserRole.ADMIN,
      isAnonymous: false,
    };
  }

  // All other demo/guest users are strictly assigned CREATOR role
  return {
    id: cleanId,
    email: `${cleanId}@demo.local`,
    name: cleanId === 'usr-creator-1' ? 'Elena Vance (Creator)' : `Demo User (${cleanId.slice(0, 8)})`,
    role: UserRole.CREATOR,
    isAnonymous: true,
  };
}

/**
 * Authentication Middleware:
 * Inspects `Authorization: Bearer <token>` or demo ownership header `x-demo-user-id`.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const demoUserId = req.headers['x-demo-user-id'] as string;
  const demoUserRole = req.headers['x-demo-user-role'] as string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, env.AUTH_SECRET) as AuthUser;
      req.user = decoded;
      return next();
    } catch {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token.',
      });
      return;
    }
  }

  // Explicit, server-controlled demo context
  if (demoUserId && typeof demoUserId === 'string' && demoUserId.trim().length > 0) {
    req.user = resolveDemoUser(demoUserId, demoUserRole);
    return next();
  }

  res.status(401).json({
    error: 'Unauthorized',
    message: 'Authentication required. Provide a Bearer token or x-demo-user-id header.',
  });
}

/**
 * Optional Authentication Middleware:
 * If a token is provided, decodes the user; otherwise proceeds as unauthenticated guest.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const demoUserId = req.headers['x-demo-user-id'] as string;
  const demoUserRole = req.headers['x-demo-user-role'] as string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, env.AUTH_SECRET) as AuthUser;
      req.user = decoded;
    } catch {
      // Ignored for optional auth
    }
  } else if (demoUserId && typeof demoUserId === 'string' && demoUserId.trim().length > 0) {
    req.user = resolveDemoUser(demoUserId, demoUserRole);
  }

  next();
}

/**
 * Role-Based Access Control Middleware
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Insufficient permissions. Requires one of: ${roles.join(', ')}.`,
      });
      return;
    }

    next();
  };
}
