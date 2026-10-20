import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notification.service';

export const notificationsRouter = Router();

// GET /api/notifications
notificationsRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const { page, limit } = req.query as Record<string, string>;
    const result = await getUserNotifications(
      req.user!.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read
notificationsRouter.patch(
  '/:id/read',
  authenticate,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const notification = await markNotificationRead(req.params.id, req.user!.id);
      res.json({ success: true, data: notification });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/notifications/mark-all-read
notificationsRouter.post(
  '/mark-all-read',
  authenticate,
  async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      await markAllNotificationsRead(req.user!.id);
      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
      next(err);
    }
  }
);
