import { Router } from 'express';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';

export const businessRouter = Router();

// POST /api/businesses
businessRouter.post(
  '/',
  authenticate,
  requireRole('BUSINESS_OWNER'),
  [
    body('businessName').trim().notEmpty().withMessage('Business name required'),
    body('currency').optional().trim(),
    body('timezone').optional().trim(),
  ],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const business = await prisma.business.create({
        data: {
          id: uuidv4(),
          ownerId: req.user!.id,
          businessName: req.body.businessName,
          description: req.body.description,
          currency: req.body.currency || 'INR',
          timezone: req.body.timezone || 'Asia/Kolkata',
          contactEmail: req.body.contactEmail,
          contactPhone: req.body.contactPhone,
        },
      });
      res.status(201).json({ success: true, data: business });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/businesses
businessRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const user = req.user!;
    let businesses;

    if (user.accountType === 'PLATFORM_ADMIN') {
      businesses = await prisma.business.findMany({
        include: {
          owner: { select: { id: true, fullName: true, email: true } },
          _count: { select: { brands: true, tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Owned or member businesses
      const ownedBusinesses = await prisma.business.findMany({
        where: { ownerId: user.id },
        include: {
          _count: { select: { brands: true, tasks: true, orders: true } },
        },
      });

      const memberBusinesses = await prisma.business.findMany({
        where: {
          memberships: { some: { userId: user.id, status: 'ACTIVE' } },
          NOT: { ownerId: user.id },
        },
        include: {
          _count: { select: { brands: true, tasks: true } },
        },
      });

      businesses = [...ownedBusinesses, ...memberBusinesses];
    }

    res.json({ success: true, data: businesses });
  } catch (err) {
    next(err);
  }
});

// GET /api/businesses/:id
businessRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, fullName: true, username: true, profileImage: true } },
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            user: { select: { id: true, fullName: true, username: true, profileImage: true } },
          },
        },
        _count: {
          select: { brands: true, tasks: true, orders: true, memberships: true },
        },
      },
    });

    if (!business) throw new AppError('Business not found', 404);

    const user = req.user!;
    if (user.accountType !== 'PLATFORM_ADMIN') {
      if (business.ownerId !== user.id) {
        const membership = await prisma.businessMembership.findFirst({
          where: { businessId: business.id, userId: user.id, status: 'ACTIVE' },
        });
        if (!membership) throw new AppError('Access denied', 403);
      }
    }

    res.json({ success: true, data: business });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/businesses/:id
businessRouter.patch(
  '/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const business = await prisma.business.findUnique({ where: { id: req.params.id } });
      if (!business) throw new AppError('Business not found', 404);

      const user = req.user!;
      if (business.ownerId !== user.id && user.accountType !== 'PLATFORM_ADMIN') {
        throw new AppError('Access denied', 403);
      }

      const { businessName, description, currency, timezone, status, contactEmail, contactPhone, logoUrl } = req.body;

      const updated = await prisma.business.update({
        where: { id: req.params.id },
        data: {
          ...(businessName && { businessName }),
          ...(description !== undefined && { description }),
          ...(currency && { currency }),
          ...(timezone && { timezone }),
          ...(status && { status }),
          ...(contactEmail !== undefined && { contactEmail }),
          ...(contactPhone !== undefined && { contactPhone }),
          ...(logoUrl !== undefined && { logoUrl }),
        },
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/businesses/:id/dashboard
businessRouter.get(
  '/:id/dashboard',
  authenticate,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const businessId = req.params.id;
      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (!business) throw new AppError('Business not found', 404);

      const user = req.user!;
      if (business.ownerId !== user.id && user.accountType !== 'PLATFORM_ADMIN') {
        const membership = await prisma.businessMembership.findFirst({
          where: { businessId, userId: user.id, status: 'ACTIVE' },
        });
        if (!membership) throw new AppError('Access denied', 403);
      }

      const [
        brandCount,
        activeBrandCount,
        taskCount,
        activeTaskCount,
        overdueTaskCount,
        completedTaskCount,
        orderCount,
        activeOrderCount,
        memberCount,
        recentTasks,
        recentOrders,
      ] = await Promise.all([
        prisma.brand.count({ where: { businessId } }),
        prisma.brand.count({ where: { businessId, status: 'ACTIVE' } }),
        prisma.task.count({ where: { businessId } }),
        prisma.task.count({
          where: { businessId, status: { notIn: ['COMPLETED', 'CANCELLED', 'DRAFT'] } },
        }),
        prisma.task.count({
          where: {
            businessId,
            dueDate: { lt: new Date() },
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
        }),
        prisma.task.count({ where: { businessId, status: 'COMPLETED' } }),
        prisma.order.count({ where: { businessId } }),
        prisma.order.count({
          where: {
            businessId,
            orderStatus: { notIn: ['COMPLETED', 'CANCELLED', 'RETURNED'] },
          },
        }),
        prisma.businessMembership.count({ where: { businessId, status: 'ACTIVE' } }),
        prisma.task.findMany({
          where: { businessId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            brand: { select: { brandName: true, brandCode: true } },
            assignees: {
              include: {
                user: { select: { fullName: true, profileImage: true } },
              },
              take: 1,
            },
          },
        }),
        prisma.order.findMany({
          where: { businessId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            brand: { select: { brandName: true } },
            product: { select: { productName: true } },
          },
        }),
      ]);

      // Financial aggregates
      const financialsAgg = await prisma.taskFinancial.aggregate({
        where: { task: { businessId } },
        _sum: {
          actualRevenue: true,
          productCost: true,
          vendorCost: true,
          teamPayment: true,
          operationalExpenses: true,
          otherExpenses: true,
          fees: true,
        },
      });

      const orderValueAgg = await prisma.order.aggregate({
        where: { businessId },
        _sum: { expectedAmount: true, actualAmount: true },
      });

      const distributionAgg = await prisma.taskDistribution.aggregate({
        where: { task: { businessId }, status: { not: 'PAID' } },
        _sum: { outstandingAmount: true },
      });

      const totalExpenses = [
        financialsAgg._sum.productCost,
        financialsAgg._sum.vendorCost,
        financialsAgg._sum.teamPayment,
        financialsAgg._sum.operationalExpenses,
        financialsAgg._sum.otherExpenses,
        financialsAgg._sum.fees,
      ].reduce((sum, val) => sum + Number(val || 0), 0);

      res.json({
        success: true,
        data: {
          brandCount,
          activeBrandCount,
          taskCount,
          activeTaskCount,
          overdueTaskCount,
          completedTaskCount,
          orderCount,
          activeOrderCount,
          memberCount,
          financials: {
            totalOrderValue: Number(orderValueAgg._sum.expectedAmount || 0),
            totalRevenue: Number(financialsAgg._sum.actualRevenue || 0),
            totalExpenses,
            pendingDistributions: Number(distributionAgg._sum.outstandingAmount || 0),
          },
          recentTasks,
          recentOrders,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
