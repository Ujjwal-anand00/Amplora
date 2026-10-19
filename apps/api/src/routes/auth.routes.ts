import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { dbStore } from '../services/dbStore.js';
import { generateToken, authenticate } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { AppError } from '../middleware/errorHandler.js';
import { UserRole } from '@prisma/client';

const router = Router();
const authLimiter = createRateLimiter({ maxRequests: 25, windowMs: 60 * 1000 });

const registerSchema = z.object({
  email: z.string().email('Valid email required').toLowerCase().trim(),
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  // Role field is omitted or ignored from client input - registration ALWAYS creates a CREATOR
  role: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Valid email required').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/register
router.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = registerSchema.parse(req.body);
    const existing = await dbStore.findUserByEmail(input.email);
    if (existing) {
      throw new AppError('An account with this email already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    // Security enforcement: Registration strictly assigns CREATOR role only
    const userRole = UserRole.CREATOR;

    const user = await dbStore.createUser({
      email: input.email,
      name: input.name,
      passwordHash,
      role: userRole,
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: (user as any).avatarUrl || null,
        bio: (user as any).bio || null,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await dbStore.findUserByEmail(input.email);

    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    if (!user.passwordHash) {
      throw new AppError('Password authentication is not configured for this account.', 401);
    }

    const match = await bcrypt.compare(input.password, user.passwordHash);
    if (!match) {
      throw new AppError('Invalid email or password.', 401);
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: (user as any).avatarUrl || null,
        bio: (user as any).bio || null,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await dbStore.findUserById(req.user!.id);
    if (!user) {
      return res.json({ success: true, user: req.user });
    }
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: (user as any).avatarUrl || null,
        bio: (user as any).bio || null,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/profile
router.patch('/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, avatarUrl, bio } = req.body;
    const updatePayload: { name?: string; avatarUrl?: string | null; bio?: string | null } = {};
    if (typeof name === 'string' && name.trim()) updatePayload.name = name.trim();
    if (avatarUrl !== undefined) updatePayload.avatarUrl = avatarUrl;
    if (bio !== undefined) updatePayload.bio = bio;

    const updated = await dbStore.updateUser(req.user!.id, updatePayload);
    if (!updated) {
      throw new AppError('User not found.', 404);
    }

    res.json({
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        avatarUrl: (updated as any).avatarUrl || null,
        bio: (updated as any).bio || null,
        createdAt: updated.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;

