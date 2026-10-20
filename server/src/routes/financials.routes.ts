import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import {
  saveTaskFinancials,
  calculateTaskFinancials,
  createDistribution,
  recordDistributionPayment,
} from '../services/financial.service';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const financialsRouter = Router();

// PUT /api/financials/tasks/:taskId
financialsRouter.put(
  '/tasks/:taskId',
  authenticate,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const financial = await saveTaskFinancials(req.params.taskId, req.body, req.user!.id);
      const calculated = calculateTaskFinancials(financial);
      res.json({ success: true, data: { ...financial, calculated } });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/financials/tasks/:taskId
financialsRouter.get(
  '/tasks/:taskId',
  authenticate,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const financial = await prisma.taskFinancial.findUnique({
        where: { taskId: req.params.taskId },
      });

      if (!financial) {
        return res.json({ success: true, data: null });
      }

      const calculated = calculateTaskFinancials(financial);
      res.json({ success: true, data: { ...financial, calculated } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/financials/tasks/:taskId/distributions
financialsRouter.post(
  '/tasks/:taskId/distributions',
  authenticate,
  [body('distributions').isArray()],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const distributions = await createDistribution(
        req.params.taskId,
        req.body.distributions,
        req.user!.id
      );
      res.json({ success: true, data: distributions });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/financials/tasks/:taskId/distributions
financialsRouter.get(
  '/tasks/:taskId/distributions',
  authenticate,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const distributions = await prisma.taskDistribution.findMany({
        where: { taskId: req.params.taskId },
        include: {
          participant: {
            select: { id: true, fullName: true, username: true, profileImage: true },
          },
          payments: { orderBy: { createdAt: 'asc' } },
        },
      });
      res.json({ success: true, data: distributions });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/financials/distributions/:distributionId/payments
financialsRouter.post(
  '/distributions/:distributionId/payments',
  authenticate,
  [
    body('amount').isNumeric().withMessage('Valid amount required'),
    body('paymentDate').isISO8601().withMessage('Valid date required'),
  ],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const payment = await recordDistributionPayment(
        req.params.distributionId,
        {
          amount: req.body.amount,
          paymentDate: new Date(req.body.paymentDate),
          paymentMethod: req.body.paymentMethod,
          transactionReference: req.body.transactionReference,
          notes: req.body.notes,
        },
        req.user!.id
      );
      res.status(201).json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/financials/distributions?businessId=
financialsRouter.get(
  '/distributions',
  authenticate,
  async (req: AuthenticatedRequest, res: any, next: any) => {
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
                brand: { select: { brandName: true } },
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
  }
);
