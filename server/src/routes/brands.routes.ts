import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import {
  createBrand,
  getBrandsByBusiness,
  getBrandById,
  updateBrand,
  addBrandLink,
  getBrandOverview,
} from '../services/brand.service';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const brandsRouter = Router();

// POST /api/brands
brandsRouter.post(
  '/',
  authenticate,
  [
    body('businessId').notEmpty().withMessage('Business ID required'),
    body().custom((value) => {
      if (!value.brandName && !value.name) {
        throw new Error('Brand name required');
      }
      return true;
    }),
  ],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const brand = await createBrand(req.body, req.user!.id);
      res.status(201).json({ success: true, data: brand });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/brands?businessId=&search=
brandsRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const { businessId, search } = req.query as { businessId?: string; search?: string };
    if (!businessId) throw new AppError('businessId required', 400);

    const brands = await getBrandsByBusiness(businessId, req.user!.id, search);
    res.json({ success: true, data: brands });
  } catch (err) {
    next(err);
  }
});

// GET /api/brands/:id
brandsRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const brand = await getBrandById(req.params.id, req.user!.id);
    res.json({ success: true, data: brand });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/brands/:id
brandsRouter.patch('/:id', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const brand = await updateBrand(req.params.id, req.body, req.user!.id);
    res.json({ success: true, data: brand });
  } catch (err) {
    next(err);
  }
});

// GET /api/brands/:id/overview
brandsRouter.get(
  '/:id/overview',
  authenticate,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const overview = await getBrandOverview(req.params.id, req.user!.id);
      res.json({ success: true, data: overview });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/brands/:id/links
brandsRouter.post(
  '/:id/links',
  authenticate,
  [
    body('title').trim().notEmpty(),
    body('url').isURL().withMessage('Valid URL required'),
    body('category').notEmpty(),
  ],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const link = await addBrandLink(req.params.id, req.body, req.user!.id);
      res.status(201).json({ success: true, data: link });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/brands/:id/links/:linkId
brandsRouter.patch(
  '/:id/links/:linkId',
  authenticate,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const link = await prisma.brandLink.findFirst({
        where: { id: req.params.linkId, brandId: req.params.id },
      });
      if (!link) throw new AppError('Link not found', 404);

      const updated = await prisma.brandLink.update({
        where: { id: req.params.linkId },
        data: {
          title: req.body.title || link.title,
          url: req.body.url || link.url,
          category: req.body.category || link.category,
          description: req.body.description ?? link.description,
          isArchived: req.body.isArchived ?? link.isArchived,
        },
      });
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/brands/:id/activity
brandsRouter.get(
  '/:id/activity',
  authenticate,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const brand = await prisma.brand.findUnique({ where: { id: req.params.id } });
      if (!brand) throw new AppError('Brand not found', 404);

      const logs = await prisma.auditLog.findMany({
        where: { entityType: 'Brand', entityId: req.params.id },
        include: {
          actor: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      res.json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  }
);
