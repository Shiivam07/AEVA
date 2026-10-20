import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import { createNotification } from '../services/notification.service';

export const peopleRouter = Router();

// GET /api/people?businessId=&type=
peopleRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const { businessId, relationshipType } = req.query as Record<string, string>;
    if (!businessId) throw new AppError('businessId required', 400);

    const where: any = { businessId, status: 'ACTIVE' };
    if (relationshipType) where.relationshipType = relationshipType;

    const members = await prisma.businessMembership.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            profileImage: true,
            accountType: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: members });
  } catch (err) {
    next(err);
  }
});

// POST /api/people/invite  (Business Owner sends invitation)
peopleRouter.post(
  '/invite',
  authenticate,
  [
    body('businessId').notEmpty(),
    body('recipientId').notEmpty(),
    body('proposedRelationship').isIn(['TEAM_MEMBER', 'VENDOR', 'CO_PARTNER']),
  ],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const { businessId, recipientId, proposedRelationship, message, requestedPermissions } = req.body;

      // Verify inviter is owner
      const business = await prisma.business.findFirst({
        where: { id: businessId, ownerId: req.user!.id },
      });
      if (!business) throw new AppError('Business not found or not owner', 403);

      // Check for existing pending request
      const existing = await prisma.connectionRequest.findFirst({
        where: {
          requesterId: req.user!.id,
          recipientId,
          businessId,
          proposedRelationship,
          status: 'PENDING',
        },
      });
      if (existing) throw new AppError('Invitation already pending', 409);

      const request = await prisma.connectionRequest.create({
        data: {
          id: uuidv4(),
          requesterId: req.user!.id,
          recipientId,
          businessId,
          proposedRelationship,
          message,
          requestedPermissions,
          status: 'PENDING',
        },
      });

      // Notify recipient
      await createNotification({
        userId: recipientId,
        title: 'Business Invitation',
        message: `You have been invited to join ${business.businessName} as a ${proposedRelationship.replace('_', ' ')}`,
        relatedEntity: 'CONNECTION_REQUEST',
        relatedEntityId: request.id,
      });

      res.status(201).json({ success: true, data: request });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/people/requests  (received requests for current user)
peopleRouter.get(
  '/requests',
  authenticate,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const requests = await prisma.connectionRequest.findMany({
        where: { recipientId: req.user!.id, status: 'PENDING' },
        include: {
          requester: {
            select: { id: true, fullName: true, username: true, profileImage: true },
          },
          business: { select: { id: true, businessName: true, logoUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: requests });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/people/requests/:id/respond
peopleRouter.post(
  '/requests/:id/respond',
  authenticate,
  [body('action').isIn(['accept', 'reject'])],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const request = await prisma.connectionRequest.findFirst({
        where: { id: req.params.id, recipientId: req.user!.id },
        include: { business: true },
      });
      if (!request) throw new AppError('Request not found', 404);
      if (request.status !== 'PENDING') throw new AppError('Request already responded', 400);

      const { action } = req.body;
      const newStatus = action === 'accept' ? 'ACCEPTED' : 'REJECTED';

      await prisma.$transaction(async (tx) => {
        await tx.connectionRequest.update({
          where: { id: request.id },
          data: { status: newStatus, respondedAt: new Date() },
        });

        if (action === 'accept') {
          // Check if membership already exists
          const existing = await tx.businessMembership.findFirst({
            where: {
              businessId: request.businessId,
              userId: req.user!.id,
              relationshipType: request.proposedRelationship,
            },
          });

          if (!existing) {
            await tx.businessMembership.create({
              data: {
                id: uuidv4(),
                businessId: request.businessId,
                userId: req.user!.id,
                relationshipType: request.proposedRelationship,
                status: 'ACTIVE',
                permissions: (request.requestedPermissions as any) ?? undefined,
                invitedBy: request.requesterId,
                acceptedAt: new Date(),
              },
            });
          }

          // Notify requester
          await createNotification({
            userId: request.requesterId,
            title: 'Invitation Accepted',
            message: `Your invitation to ${request.business.businessName} was accepted`,
            relatedEntity: 'CONNECTION_REQUEST',
            relatedEntityId: request.id,
          });
        }
      });

      res.json({ success: true, message: `Invitation ${action}ed` });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/people/:membershipId  (revoke access)
peopleRouter.delete(
  '/:membershipId',
  authenticate,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const membership = await prisma.businessMembership.findUnique({
        where: { id: req.params.membershipId },
        include: { business: true },
      });
      if (!membership) throw new AppError('Membership not found', 404);

      if (membership.business.ownerId !== req.user!.id && req.user!.accountType !== 'PLATFORM_ADMIN') {
        throw new AppError('Only business owner can revoke access', 403);
      }

      await prisma.businessMembership.update({
        where: { id: req.params.membershipId },
        data: { status: 'REVOKED' },
      });

      res.json({ success: true, message: 'Access revoked' });
    } catch (err) {
      next(err);
    }
  }
);
