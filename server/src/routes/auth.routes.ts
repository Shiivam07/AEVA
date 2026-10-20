import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import {
  registerUser,
  loginUser,
  provisionAdminUser,
  changePassword,
} from '../services/auth.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});

// POST /api/auth/register
authRouter.post(
  '/register',
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('username')
      .trim()
      .notEmpty()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username must be 3-30 alphanumeric characters or underscores'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('accountType')
      .isIn(['BUSINESS_OWNER', 'COLLABORATOR'])
      .withMessage('Invalid account type'),
  ],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const result = await registerUser(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
authRouter.post(
  '/login',
  loginLimiter,
  [
    body('identifier').trim().notEmpty().withMessage('Email or username required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const result = await loginUser(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/provision-admin  (server-side only, protected by provisioning secret)
authRouter.post(
  '/provision-admin',
  [
    body('fullName').trim().notEmpty(),
    body('username').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 12 }),
    body('provisionSecret').notEmpty(),
  ],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const user = await provisionAdminUser(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        accountType: true,
        profileImage: true,
        phone: true,
        biography: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/change-password
authRouter.patch(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      await changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
      next(err);
    }
  }
);
