import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const productsRouter = Router();

// POST /api/products
productsRouter.post(
  '/',
  authenticate,
  [
    body('brandId').notEmpty(),
    body('productName').trim().notEmpty(),
  ],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const brand = await prisma.brand.findUnique({ where: { id: req.body.brandId } });
      if (!brand) throw new AppError('Brand not found', 404);

      // Verify owner access
      const business = await prisma.business.findUnique({ where: { id: brand.businessId } });
      if (business?.ownerId !== req.user!.id && req.user!.accountType !== 'PLATFORM_ADMIN') {
        throw new AppError('Access denied', 403);
      }

      const product = await prisma.product.create({
        data: {
          id: uuidv4(),
          brandId: req.body.brandId,
          productName: req.body.productName,
          productCode: req.body.productCode,
          sku: req.body.sku,
          description: req.body.description,
          category: req.body.category,
        },
      });

      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/products?brandId=
productsRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const { brandId } = req.query as { brandId?: string };
    if (!brandId) throw new AppError('brandId required', 400);

    const products = await prisma.product.findMany({
      where: { brandId },
      include: {
        _count: { select: { orders: true, tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
productsRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        brand: { select: { id: true, brandName: true, brandCode: true, businessId: true } },
        orders: {
          include: {
            orderingId: { select: { externalIdentifier: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        tasks: {
          where: { status: { not: 'CANCELLED' } },
          select: {
            id: true,
            taskCode: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
          },
        },
      },
    });

    if (!product) throw new AppError('Product not found', 404);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/products/:id
productsRouter.patch('/:id', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { brand: { include: { business: true } } },
    });
    if (!product) throw new AppError('Product not found', 404);

    if (
      product.brand.business.ownerId !== req.user!.id &&
      req.user!.accountType !== 'PLATFORM_ADMIN'
    ) {
      throw new AppError('Access denied', 403);
    }

    const { productName, description, category, status, productCode, sku } = req.body;
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(productName && { productName }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(status && { status }),
        ...(productCode !== undefined && { productCode }),
        ...(sku !== undefined && { sku }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});
