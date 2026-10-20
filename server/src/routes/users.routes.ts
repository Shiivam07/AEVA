import { Router } from 'express';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { body, validationResult } from 'express-validator';

export const usersRouter = Router();

// GET /api/users/search?q=username
usersRouter.get('/search', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const q = (req.query.q as string) || '';
    if (q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { status: 'ACTIVE' },
          { accountType: { not: 'PLATFORM_ADMIN' } },
          {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { fullName: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        profileImage: true,
        accountType: true,
      },
      take: 20,
    });

    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/profile
usersRouter.get('/profile', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
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
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            business: { select: { id: true, businessName: true, currency: true } },
          },
        },
      },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/profile
usersRouter.patch(
  '/profile',
  authenticate,
  [
    body('fullName').optional().trim().notEmpty(),
    body('phone').optional().trim(),
    body('biography').optional().trim(),
  ],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const { fullName, phone, biography, profileImage } = req.body;
      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          ...(fullName && { fullName }),
          ...(phone !== undefined && { phone }),
          ...(biography !== undefined && { biography }),
          ...(profileImage !== undefined && { profileImage }),
        },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          profileImage: true,
          phone: true,
          biography: true,
        },
      });
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }
);
