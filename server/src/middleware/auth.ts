import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AppError } from './errorHandler';
import { AccountType } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        accountType: AccountType;
        email: string;
        username: string;
      };
    }
  }
}

export interface AuthenticatedRequest<P = any, ResBody = any, ReqBody = any, ReqQuery = any> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: string;
    accountType: AccountType;
    email: string;
    username: string;
  };
  body: any;
  query: any;
  params: any;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.cookies?.token;

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as {
      userId: string;
      accountType: AccountType;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        accountType: true,
        email: true,
        username: true,
        status: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 401);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('Account is not active', 403);
    }

    req.user = {
      id: user.id,
      accountType: user.accountType,
      email: user.email,
      username: user.username,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new AppError('Invalid or expired token', 401));
  }
};

export const requireRole = (...roles: AccountType[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (!roles.includes(req.user.accountType)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
};

export const requireBusinessAccess = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const businessId = req.params.businessId || req.body.businessId;
    if (!businessId) return next();

    const user = req.user!;

    // Platform admin can access all
    if (user.accountType === 'PLATFORM_ADMIN') return next();

    // Business owner
    if (user.accountType === 'BUSINESS_OWNER') {
      const business = await prisma.business.findFirst({
        where: { id: businessId, ownerId: user.id },
      });
      if (business) return next();
    }

    // Check membership
    const membership = await prisma.businessMembership.findFirst({
      where: {
        businessId,
        userId: user.id,
        status: 'ACTIVE',
      },
    });

    if (!membership) {
      return next(new AppError('Access denied to this business', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};
