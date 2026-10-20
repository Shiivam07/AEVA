import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const reportsRouter = Router();

// GET /api/reports/overview?businessId=&startDate=&endDate=
reportsRouter.get('/overview', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const { businessId, startDate, endDate } = req.query as Record<string, string>;
    if (!businessId) throw new AppError('businessId required', 400);

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new AppError('Business not found', 404);

    const user = req.user!;
    if (business.ownerId !== user.id && user.accountType !== 'PLATFORM_ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const where: any = { businessId };
    if (Object.keys(dateFilter).length) where.createdAt = dateFilter;

    const [
      taskStats,
      orderStats,
      brandStats,
      financialStats,
      distributionStats,
    ] = await Promise.all([
      prisma.task.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.order.groupBy({
        by: ['orderStatus'],
        where,
        _count: true,
      }),
      prisma.brand.findMany({
        where: { businessId },
        include: {
          _count: {
            select: { tasks: true, orders: true, products: true },
          },
        },
      }),
      prisma.taskFinancial.aggregate({
        where: { task: where },
        _sum: {
          actualRevenue: true,
          productCost: true,
          vendorCost: true,
          teamPayment: true,
          operationalExpenses: true,
          otherExpenses: true,
          fees: true,
        },
      }),
      prisma.taskDistribution.aggregate({
        where: { task: where },
        _sum: {
          calculatedAmount: true,
          amountPaid: true,
          outstandingAmount: true,
        },
      }),
    ]);

    const totalExpenses = [
      financialStats._sum.productCost,
      financialStats._sum.vendorCost,
      financialStats._sum.teamPayment,
      financialStats._sum.operationalExpenses,
      financialStats._sum.otherExpenses,
      financialStats._sum.fees,
    ].reduce((sum, val) => sum + Number(val || 0), 0);

    res.json({
      success: true,
      data: {
        taskStats,
        orderStats,
        brandStats,
        financials: {
          totalRevenue: Number(financialStats._sum.actualRevenue || 0),
          totalExpenses,
          recordedProfit:
            Number(financialStats._sum.actualRevenue || 0) - totalExpenses,
        },
        distributions: {
          totalCalculated: Number(distributionStats._sum.calculatedAmount || 0),
          totalPaid: Number(distributionStats._sum.amountPaid || 0),
          totalOutstanding: Number(distributionStats._sum.outstandingAmount || 0),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/tasks-by-brand?businessId=
reportsRouter.get(
  '/tasks-by-brand',
  authenticate,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const { businessId } = req.query as { businessId?: string };
      if (!businessId) throw new AppError('businessId required', 400);

      const data = await prisma.task.groupBy({
        by: ['brandId', 'status'],
        where: { businessId },
        _count: true,
      });

      const brandIds = [...new Set(data.map((d) => d.brandId))];
      const brands = await prisma.brand.findMany({
        where: { id: { in: brandIds } },
        select: { id: true, brandName: true, brandCode: true },
      });

      const brandMap = Object.fromEntries(brands.map((b) => [b.id, b]));

      const result = data.map((d) => ({
        ...d,
        brand: brandMap[d.brandId],
      }));

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/reports/collaborator-workload?businessId=
reportsRouter.get(
  '/collaborator-workload',
  authenticate,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const { businessId } = req.query as { businessId?: string };
      if (!businessId) throw new AppError('businessId required', 400);

      const assignees = await prisma.taskAssignee.groupBy({
        by: ['userId'],
        where: { task: { businessId } },
        _count: true,
      });

      const userIds = assignees.map((a) => a.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fullName: true, username: true, profileImage: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

      // Get completed count per user
      const completedCounts = await prisma.taskAssignee.groupBy({
        by: ['userId'],
        where: { task: { businessId, status: 'COMPLETED' } },
        _count: true,
      });
      const completedMap = Object.fromEntries(completedCounts.map((c) => [c.userId, c._count]));

      const result = assignees.map((a) => ({
        user: userMap[a.userId],
        totalAssigned: a._count,
        completed: completedMap[a.userId] || 0,
        pending: a._count - (completedMap[a.userId] || 0),
      }));

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);
