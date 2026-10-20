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
    if (relationshipType && relationshipType !== 'ALL') {
      let mappedType = relationshipType;
      if (mappedType === 'EMPLOYEE' || mappedType === 'CONTRACTOR') mappedType = 'TEAM_MEMBER';
      where.relationshipType = mappedType;
    }

    const members = await prisma.businessMembership.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            phone: true,
            profileImage: true,
            accountType: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const pendingRequests = await prisma.connectionRequest.findMany({
      where: { businessId, status: 'PENDING' },
      include: {
        recipient: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            phone: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        memberships: members,
        pendingRequests,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/people/invite  (Business Owner sends invitation)
peopleRouter.post(
  '/invite',
  authenticate,
  [
    body('businessId').notEmpty().withMessage('Business ID is required'),
    body().custom((body) => {
      const id = (body.recipientId || body.recipientEmail || body.recipientUsername || body.recipient || '').trim();
      if (!id) {
        throw new Error('Recipient email or username is required');
      }
      return true;
    }),
  ],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: errors.array()[0]?.msg || 'Validation failed',
        errors: errors.array(),
      });
    }
    try {
      const {
        businessId,
        recipientId,
        recipientEmail,
        recipientUsername,
        recipient,
        proposedRelationship,
        message,
        requestedPermissions,
      } = req.body;

      // Verify inviter is owner
      const business = await prisma.business.findFirst({
        where: { id: businessId, ownerId: req.user!.id },
      });
      if (!business && req.user!.accountType !== 'PLATFORM_ADMIN') {
        throw new AppError('Business not found or you are not the owner', 403);
      }

      // Determine recipient identifier
      const targetIdentifier = (recipientEmail || recipientUsername || recipient || recipientId || '').trim();

      let targetUser = null;
      if (recipientId) {
        targetUser = await prisma.user.findUnique({ where: { id: recipientId } });
      }

      if (!targetUser && targetIdentifier) {
        if (targetIdentifier.includes('@')) {
          targetUser = await prisma.user.findFirst({
            where: { email: { equals: targetIdentifier, mode: 'insensitive' } },
          });
        } else {
          targetUser = await prisma.user.findFirst({
            where: {
              OR: [
                { username: { equals: targetIdentifier, mode: 'insensitive' } },
                { email: { equals: targetIdentifier, mode: 'insensitive' } },
                { id: targetIdentifier },
              ],
            },
          });
        }
      }

      if (!targetUser) {
        throw new AppError(
          `No user found with "${targetIdentifier}". Please check the email or username, or have them register on AEVA first.`,
          404
        );
      }

      if (targetUser.id === req.user!.id) {
        throw new AppError('You cannot invite yourself to your own business.', 400);
      }

      // Check for existing active membership
      const existingMembership = await prisma.businessMembership.findFirst({
        where: {
          businessId,
          userId: targetUser.id,
          status: 'ACTIVE',
        },
      });
      if (existingMembership) {
        throw new AppError(
          `${targetUser.fullName || targetUser.username} is already an active collaborator in this business.`,
          409
        );
      }

      // Normalize proposed relationship
      let normalizedRelationship: 'TEAM_MEMBER' | 'VENDOR' | 'CO_PARTNER' = 'TEAM_MEMBER';
      const relUpper = (proposedRelationship || '').toUpperCase();
      if (relUpper === 'VENDOR') {
        normalizedRelationship = 'VENDOR';
      } else if (relUpper === 'CO_PARTNER') {
        normalizedRelationship = 'CO_PARTNER';
      } else {
        normalizedRelationship = 'TEAM_MEMBER';
      }

      // Check for existing pending request
      const existing = await prisma.connectionRequest.findFirst({
        where: {
          recipientId: targetUser.id,
          businessId,
          status: 'PENDING',
        },
      });
      if (existing) {
        throw new AppError(
          `An invitation is already pending for ${targetUser.fullName || targetUser.username}.`,
          409
        );
      }

      const request = await prisma.connectionRequest.create({
        data: {
          id: uuidv4(),
          requesterId: req.user!.id,
          recipientId: targetUser.id,
          businessId,
          proposedRelationship: normalizedRelationship,
          message: message?.trim() || null,
          requestedPermissions: requestedPermissions || null,
          status: 'PENDING',
        },
        include: {
          recipient: {
            select: { id: true, fullName: true, username: true, email: true, profileImage: true },
          },
        },
      });

      // Notify recipient
      await createNotification({
        userId: targetUser.id,
        title: 'Business Invitation',
        message: `You have been invited by @${req.user!.username} to join ${(business || {}).businessName || 'the business'} as a ${normalizedRelationship.replace('_', ' ')}`,
        relatedEntity: 'CONNECTION_REQUEST',
        relatedEntityId: request.id,
      });

      res.status(201).json({
        success: true,
        message: `Invitation successfully sent to ${targetUser.fullName || targetUser.username}`,
        data: request,
      });
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

// DELETE /api/people/requests/:id  (withdraw pending invitation)
peopleRouter.delete(
  '/requests/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const request = await prisma.connectionRequest.findUnique({
        where: { id: req.params.id },
        include: { business: true },
      });
      if (!request) throw new AppError('Invitation not found', 404);

      if (
        request.business.ownerId !== req.user!.id &&
        request.requesterId !== req.user!.id &&
        req.user!.accountType !== 'PLATFORM_ADMIN'
      ) {
        throw new AppError('Only the business owner can withdraw this invitation', 403);
      }

      await prisma.connectionRequest.update({
        where: { id: req.params.id },
        data: { status: 'WITHDRAWN' },
      });

      res.json({ success: true, message: 'Invitation withdrawn' });
    } catch (err) {
      next(err);
    }
  }
);
