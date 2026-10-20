import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const orderingIdsRouter = Router();

// POST /api/ordering-ids
orderingIdsRouter.post(
  '/',
  authenticate,
  [
    body('brandId').notEmpty(),
    body('externalIdentifier').trim().notEmpty(),
  ],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const brand = await prisma.brand.findUnique({
        where: { id: req.body.brandId },
        include: { business: true },
      });
      if (!brand) throw new AppError('Brand not found', 404);
      if (brand.business.ownerId !== req.user!.id && req.user!.accountType !== 'PLATFORM_ADMIN') {
        throw new AppError('Access denied', 403);
      }

      const orderingId = await prisma.orderingId.create({
        data: {
          id: uuidv4(),
          brandId: req.body.brandId,
          externalIdentifier: req.body.externalIdentifier,
          status: req.body.status || 'AVAILABLE',
          restrictions: req.body.restrictions,
          notes: req.body.notes,
          addedById: req.user!.id,
        },
      });

      res.status(201).json({ success: true, data: orderingId });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/ordering-ids?brandId=
orderingIdsRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const { brandId } = req.query as { brandId?: string };
    if (!brandId) throw new AppError('brandId required', 400);

    const orderingIds = await prisma.orderingId.findMany({
      where: { brandId },
      include: {
        _count: { select: { orders: true } },
        addedBy: { select: { fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: orderingIds });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/ordering-ids/:id
orderingIdsRouter.patch(
  '/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const oid = await prisma.orderingId.findUnique({
        where: { id: req.params.id },
        include: { brand: { include: { business: true } } },
      });
      if (!oid) throw new AppError('Ordering ID not found', 404);
      if (
        oid.brand.business.ownerId !== req.user!.id &&
        req.user!.accountType !== 'PLATFORM_ADMIN'
      ) {
        throw new AppError('Access denied', 403);
      }

      const { status, restrictions, notes } = req.body;
      const updated = await prisma.orderingId.update({
        where: { id: req.params.id },
        data: {
          ...(status && { status }),
          ...(restrictions !== undefined && { restrictions }),
          ...(notes !== undefined && { notes }),
        },
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);
