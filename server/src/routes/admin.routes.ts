import { Router } from 'express';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export const adminRouter = Router();

// All admin routes require PLATFORM_ADMIN
adminRouter.use(authenticate, requireRole('PLATFORM_ADMIN'));

// GET /api/admin/dashboard
adminRouter.get('/dashboard', async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const [
      totalUsers,
      activeUsers,
      businessCount,
      activeBrandCount,
      totalTasks,
      pendingTasks,
      completedTasks,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count({ where: { accountType: { not: 'PLATFORM_ADMIN' } } }),
      prisma.user.count({ where: { accountType: { not: 'PLATFORM_ADMIN' }, status: 'ACTIVE' } }),
      prisma.business.count(),
      prisma.brand.count({ where: { status: 'ACTIVE' } }),
      prisma.task.count(),
      prisma.task.count({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      prisma.task.count({ where: { status: 'COMPLETED' } }),
      prisma.user.findMany({
        where: { accountType: { not: 'PLATFORM_ADMIN' } },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          accountType: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        businessCount,
        activeBrandCount,
        totalTasks,
        pendingTasks,
        completedTasks,
        recentUsers,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users
adminRouter.get('/users', async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const { page = '1', limit = '20', search, status, accountType } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (accountType) where.accountType = accountType;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          accountType: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { ownedBusinesses: true, memberships: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: { users, total, page: pageNum, limit: limitNum } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/status
adminRouter.patch('/users/:id/status', async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new AppError('User not found', 404);

    // Cannot deactivate another platform admin
    if (user.accountType === 'PLATFORM_ADMIN' && user.id !== req.user!.id) {
      throw new AppError('Cannot modify another Platform Admin status', 403);
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { status },
      select: { id: true, fullName: true, status: true },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        entityType: 'User',
        entityId: req.params.id,
        action: 'UPDATE',
        newValues: { status },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users  (create additional admin)
adminRouter.post(
  '/users',
  [
    body('fullName').trim().notEmpty(),
    body('username').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 12 }),
    body('accountType').isIn(['PLATFORM_ADMIN', 'BUSINESS_OWNER', 'COLLABORATOR']),
  ],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const { fullName, username, email, password, accountType } = req.body;

      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) throw new AppError('Email already registered', 409);

      const existingUsername = await prisma.user.findUnique({ where: { username } });
      if (existingUsername) throw new AppError('Username already taken', 409);

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          id: uuidv4(),
          fullName,
          username,
          email,
          passwordHash,
          accountType,
        },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          accountType: true,
          createdAt: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          entityType: 'User',
          entityId: user.id,
          action: 'CREATE',
          newValues: { accountType, username, email },
        },
      });

      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/audit-logs
adminRouter.get('/audit-logs', async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const { page = '1', limit = '50', entityType } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (entityType) where.entityType = entityType;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ success: true, data: { logs, total, page: pageNum, limit: limitNum } });
  } catch (err) {
    next(err);
  }
});
