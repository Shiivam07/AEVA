import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const distributionsRouter = Router();

// Alias routes - distributions are also accessed via financials router
// This provides a standalone distributions endpoint
distributionsRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const { businessId, status, page = '1', limit = '20' } = req.query as Record<string, string>;
    if (!businessId) throw new AppError('businessId required', 400);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { task: { businessId } };
    if (status) where.status = status;

    const [distributions, total] = await Promise.all([
      prisma.taskDistribution.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              taskCode: true,
              title: true,
              brand: { select: { brandName: true, brandCode: true } },
            },
          },
          participant: {
            select: { id: true, fullName: true, username: true, profileImage: true },
          },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.taskDistribution.count({ where }),
    ]);

    res.json({ success: true, data: { distributions, total, page: pageNum, limit: limitNum } });
  } catch (err) {
    next(err);
  }
});
