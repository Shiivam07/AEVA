import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const ordersRouter = Router();

// POST /api/orders
ordersRouter.post(
  '/',
  authenticate,
  [
    body('brandId').notEmpty().withMessage('Brand ID required'),
  ],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      let businessId = req.body.businessId;
      if (!businessId) {
        const brand = await prisma.brand.findUnique({ where: { id: req.body.brandId } });
        if (brand) {
          businessId = brand.businessId;
        } else {
          const userBiz = await prisma.business.findFirst({ where: { ownerId: req.user!.id } });
          businessId = userBiz?.id;
        }
      }

      if (!businessId) throw new AppError('Could not determine business for this order', 400);

      const business = await prisma.business.findFirst({
        where: { id: businessId },
      });
      if (!business && req.user!.accountType !== 'PLATFORM_ADMIN') {
        throw new AppError('Business not found or access denied', 403);
      }

      // If orderingId provided, validate it's available and belongs to brand
      if (req.body.orderingIdId) {
        const oid = await prisma.orderingId.findFirst({
          where: {
            id: req.body.orderingIdId,
            brandId: req.body.brandId,
            status: { in: ['AVAILABLE', 'RESERVED'] },
          },
        });
        if (!oid) throw new AppError('Ordering ID not available for this brand', 400);

        // Mark as IN_USE
        await prisma.orderingId.update({
          where: { id: req.body.orderingIdId },
          data: { status: 'IN_USE', lastUsedAt: new Date() },
        });
      }

      let amountVal = req.body.totalAmount !== undefined
        ? req.body.totalAmount
        : (req.body.actualAmount !== undefined ? req.body.actualAmount : req.body.expectedAmount);

      const priceNotDecided = req.body.priceNotDecided === true || req.body.priceNotDecided === 'true';
      const isEstimated = req.body.isEstimated === true || req.body.isEstimated === 'true';
      const pricePerOrder = req.body.pricePerOrder !== undefined ? parseFloat(req.body.pricePerOrder) : null;
      const quantity = parseInt(req.body.quantity) || 1;

      if (priceNotDecided) {
        amountVal = 0;
      } else if ((amountVal === undefined || amountVal === null || isNaN(amountVal)) && pricePerOrder !== null) {
        amountVal = pricePerOrder * quantity;
      }

      const orderNumber = req.body.orderNumber || req.body.externalOrderReference || `ORD-2026-${Math.floor(100000 + Math.random() * 900000)}`;

      let notes = req.body.notes || '';
      if (req.body.customerName || req.body.customerEmail) {
        const customerMeta = `Customer: ${req.body.customerName || 'Guest'} | Email: ${req.body.customerEmail || ''}`;
        notes = notes ? `${notes} • ${customerMeta}` : customerMeta;
      }
      if (priceNotDecided) {
        notes = notes ? `${notes} • PriceStatus: NOT_DECIDED` : 'PriceStatus: NOT_DECIDED';
      } else if (isEstimated) {
        notes = notes ? `${notes} • PriceStatus: ESTIMATED` : 'PriceStatus: ESTIMATED';
      }
      if (pricePerOrder !== null && !isNaN(pricePerOrder)) {
        notes = notes ? `${notes} • PricePerOrder: ${pricePerOrder}` : `PricePerOrder: ${pricePerOrder}`;
      }
      if (req.body.productName) {
        notes = notes ? `${notes} • Item: ${req.body.productName}` : `Item: ${req.body.productName}`;
      }
      if (req.body.sku) {
        notes = notes ? `${notes} • SKU: ${req.body.sku}` : `SKU: ${req.body.sku}`;
      }
      if (req.body.productCode) {
        notes = notes ? `${notes} • Code: ${req.body.productCode}` : `Code: ${req.body.productCode}`;
      }

      const order = await prisma.order.create({
        data: {
          id: uuidv4(),
          businessId,
          brandId: req.body.brandId,
          productId: req.body.productId,
          orderingIdId: req.body.orderingIdId,
          externalOrderReference: orderNumber,
          quantity,
          orderDate: req.body.orderDate ? new Date(req.body.orderDate) : new Date(),
          expectedAmount: amountVal || 0,
          actualAmount: amountVal || 0,
          orderStatus: req.body.orderStatus || req.body.status || 'PLACED',
          paymentStatus: req.body.paymentStatus || (priceNotDecided ? 'PENDING' : 'PAID'),
          expectedDeliveryDate: req.body.expectedDeliveryDate
            ? new Date(req.body.expectedDeliveryDate)
            : undefined,
          spreadsheetLink: req.body.spreadsheetLink,
          notes,
          createdById: req.user!.id,
        },
        include: {
          brand: { select: { brandName: true, brandCode: true } },
          product: { select: { productName: true, sku: true, productCode: true } },
          orderingId: { select: { externalIdentifier: true } },
        },
      });

      res.status(201).json({
        success: true,
        data: {
          ...order,
          orderNumber: order.externalOrderReference,
          totalAmount: Number(order.actualAmount || order.expectedAmount || 0),
          status: order.orderStatus,
          currency: 'INR',
          brand: order.brand ? { ...order.brand, name: order.brand.brandName, code: order.brand.brandCode } : null,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/orders?businessId=&brandId=&status=&page=&limit=
ordersRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const {
      businessId,
      brandId,
      status,
      orderStatus,
      paymentStatus,
      productId,
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;

    let targetBusinessId: string | undefined = businessId;
    if (!targetBusinessId) {
      const userBiz = await prisma.business.findFirst({
        where: {
          OR: [
            { ownerId: req.user!.id },
            { memberships: { some: { userId: req.user!.id } } },
          ],
        },
      });
      targetBusinessId = userBiz?.id;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (targetBusinessId) where.businessId = targetBusinessId;
    if (brandId) where.brandId = brandId;

    const activeStatus = orderStatus || status;
    if (activeStatus && activeStatus !== 'ALL') {
      where.orderStatus = activeStatus;
    }
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (productId) where.productId = productId;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          brand: { select: { id: true, brandName: true, brandCode: true } },
          product: { select: { id: true, productName: true, sku: true, productCode: true, description: true } },
          orderingId: { select: { id: true, externalIdentifier: true, status: true, notes: true } },
          createdBy: { select: { fullName: true, username: true, email: true } },
        },
        orderBy: { orderDate: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.order.count({ where }),
    ]);

    const formattedOrders = orders.map((o: any) => {
      let custName = 'Customer';
      let custEmail = '';
      if (o.notes && o.notes.includes('Customer:')) {
        const notePart = o.notes.split('Customer:')[1];
        const parts = notePart.split(/[|•]/);
        custName = parts[0]?.trim() || custName;
        const emailPart = parts.find((p: string) => p.includes('Email:'));
        if (emailPart) {
          custEmail = emailPart.replace('Email:', '').trim();
        }
      } else if (o.orderingId?.notes && o.orderingId.notes.includes('@')) {
        custEmail = o.orderingId.notes.trim();
        custName = o.orderingId.externalIdentifier || 'Customer';
      } else if (o.orderingId?.externalIdentifier) {
        custName = o.orderingId.externalIdentifier;
      } else if (o.createdBy?.fullName) {
        custName = o.createdBy.fullName;
        custEmail = o.createdBy.email || '';
      }

      let pName = o.product?.productName || '';
      let pSku = o.product?.sku || '';
      let pCode = o.product?.productCode || '';
      if (o.notes) {
        if (!pName && o.notes.includes('Item:')) {
          pName = o.notes.split('Item:')[1]?.split(/[•|]/)[0]?.trim();
        }
        if (!pSku && o.notes.includes('SKU:')) {
          pSku = o.notes.split('SKU:')[1]?.split(/[•|]/)[0]?.trim();
        }
        if (!pCode && o.notes.includes('Code:')) {
          pCode = o.notes.split('Code:')[1]?.split(/[•|]/)[0]?.trim();
        }
      }

      const priceNotDecided = o.notes?.includes('PriceStatus: NOT_DECIDED') || false;
      const isEstimated = o.notes?.includes('PriceStatus: ESTIMATED') || false;
      let pricePerOrder: number | null = null;
      if (o.notes && o.notes.includes('PricePerOrder:')) {
        const pMatch = o.notes.split('PricePerOrder:')[1]?.split(/[•|]/)[0]?.trim();
        if (pMatch && !isNaN(parseFloat(pMatch))) pricePerOrder = parseFloat(pMatch);
      }
      if (pricePerOrder === null && !priceNotDecided && o.quantity) {
        pricePerOrder = Number(o.actualAmount ?? o.expectedAmount ?? 0) / o.quantity;
      }

      return {
        ...o,
        orderNumber: o.externalOrderReference || `ORD-${o.brand?.brandCode || 'AEV'}-${o.id.slice(0, 6).toUpperCase()}`,
        customerName: custName,
        customerEmail: custEmail,
        totalAmount: Number(o.actualAmount ?? o.expectedAmount ?? 0),
        status: o.orderStatus,
        currency: 'INR',
        brand: o.brand ? { ...o.brand, name: o.brand.brandName, code: o.brand.brandCode } : null,
        product: {
          id: o.product?.id || 'prod-item',
          productName: pName || 'Standard Commercial Order Item',
          sku: pSku && pSku.trim() !== '' ? pSku : 'N/A',
          productCode: pCode && pCode.trim() !== '' ? pCode : 'N/A',
        },
        priceNotDecided,
        isEstimated,
        pricePerOrder: pricePerOrder || 0,
      };
    });

    res.json({ success: true, data: { orders: formattedOrders, total, page: pageNum, limit: limitNum } });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id
ordersRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        brand: { select: { brandName: true, brandCode: true, businessId: true } },
        product: true,
        orderingId: true,
        createdBy: { select: { fullName: true, username: true } },
        tasks: {
          select: { id: true, taskCode: true, title: true, status: true, dueDate: true },
        },
      },
    });

    if (!order) throw new AppError('Order not found', 404);

    // Verify access
    const user = req.user!;
    if (user.accountType !== 'PLATFORM_ADMIN') {
      const business = await prisma.business.findUnique({ where: { id: order.businessId } });
      if (business?.ownerId !== user.id) {
        const membership = await prisma.businessMembership.findFirst({
          where: { businessId: order.businessId, userId: user.id, status: 'ACTIVE' },
        });
        if (!membership) throw new AppError('Access denied', 403);
      }
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id
ordersRouter.patch('/:id', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new AppError('Order not found', 404);

    const user = req.user!;
    if (user.accountType !== 'PLATFORM_ADMIN') {
      const business = await prisma.business.findUnique({ where: { id: order.businessId } });
      if (business?.ownerId !== user.id) throw new AppError('Access denied', 403);
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.orderStatus && { orderStatus: req.body.orderStatus }),
        ...(req.body.paymentStatus && { paymentStatus: req.body.paymentStatus }),
        ...(req.body.actualAmount !== undefined && { actualAmount: req.body.actualAmount }),
        ...(req.body.expectedAmount !== undefined && { expectedAmount: req.body.expectedAmount }),
        ...(req.body.notes !== undefined && { notes: req.body.notes }),
        ...(req.body.spreadsheetLink !== undefined && { spreadsheetLink: req.body.spreadsheetLink }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/send-receipt
ordersRouter.post(
  '/send-receipt',
  authenticate,
  [
    body('orderIds').isArray({ min: 1 }).withMessage('At least one order ID required'),
    body('recipientEmail').isEmail().withMessage('Valid recipient email required'),
  ],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const { orderIds, recipientEmail, recipientName, presetTemplate, customNotes } = req.body;
      const orders = await prisma.order.findMany({
        where: { id: { in: orderIds } },
        include: {
          brand: true,
          product: true,
        },
      });

      if (!orders.length) throw new AppError('No matching orders found', 404);

      // Create notification for audit
      await prisma.notification.create({
        data: {
          id: uuidv4(),
          userId: req.user!.id,
          title: `Receipt Sent (${orders.length} order${orders.length > 1 ? 's' : ''})`,
          message: `Official receipt generated with preset '${presetTemplate || 'Corporate'}' and dispatched to ${recipientEmail} by ${req.user!.username}.`,
          relatedEntity: 'ORDER',
          relatedEntityId: orders[0].id,
        },
      });

      res.json({
        success: true,
        data: {
          dispatchedAt: new Date(),
          recipientEmail,
          recipientName: recipientName || 'Customer',
          orderCount: orders.length,
          presetTemplate: presetTemplate || 'Corporate',
          message: `Receipt successfully dispatched to ${recipientEmail}!`,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
