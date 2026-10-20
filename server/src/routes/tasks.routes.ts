import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { createTask, getTaskById, getTasksByBusiness, updateTaskStatus, addTaskComment } from '../services/task.service';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const tasksRouter = Router();

// POST /api/tasks
tasksRouter.post(
  '/',
  authenticate,
  [
    body('businessId').notEmpty(),
    body('brandId').notEmpty(),
    body('title').trim().notEmpty(),
    body('taskType').notEmpty(),
  ],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const task = await createTask(req.body, req.user!.id);
      res.status(201).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/tasks?businessId=&brandId=&status=&page=&limit=
tasksRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const { businessId, brandId, status, taskType, priority, assigneeId, page, limit } =
      req.query as Record<string, string>;

    if (!businessId) throw new AppError('businessId required', 400);

    const result = await getTasksByBusiness(businessId, req.user!.id, {
      brandId,
      status,
      taskType,
      priority,
      assigneeId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/daily?businessId=
tasksRouter.get('/daily', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const { businessId } = req.query as { businessId?: string };
    if (!businessId) throw new AppError('businessId required', 400);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const user = req.user!;

    // For collaborators, show only assigned tasks
    const where: any = {
      businessId,
      status: { notIn: ['CANCELLED'] },
    };

    if (user.accountType === 'COLLABORATOR') {
      where.assignees = { some: { userId: user.id } };
    }

    const [todayTasks, overdueTasks, upcomingTasks, completedToday] = await Promise.all([
      prisma.task.findMany({
        where: { ...where, dueDate: { gte: today, lt: tomorrow } },
        include: {
          brand: { select: { brandName: true, brandCode: true } },
          assignees: {
            include: { user: { select: { id: true, fullName: true, profileImage: true } } },
          },
        },
        orderBy: { priority: 'desc' },
      }),
      prisma.task.findMany({
        where: {
          ...where,
          dueDate: { lt: today },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        include: {
          brand: { select: { brandName: true, brandCode: true } },
          assignees: {
            include: { user: { select: { id: true, fullName: true, profileImage: true } } },
          },
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.task.findMany({
        where: {
          ...where,
          dueDate: { gte: tomorrow },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        include: {
          brand: { select: { brandName: true, brandCode: true } },
          assignees: {
            include: { user: { select: { id: true, fullName: true, profileImage: true } } },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      prisma.task.findMany({
        where: {
          ...where,
          completedAt: { gte: today, lt: tomorrow },
        },
        include: {
          brand: { select: { brandName: true, brandCode: true } },
        },
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    res.json({
      success: true,
      data: { todayTasks, overdueTasks, upcomingTasks, completedToday },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id
tasksRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const task = await getTaskById(req.params.id, req.user!.id);
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id/status
tasksRouter.patch(
  '/:id/status',
  authenticate,
  [body('status').notEmpty()],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const task = await updateTaskStatus(
        req.params.id,
        req.body.status,
        req.user!.id,
        req.body.notes
      );
      res.json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/tasks/:id/comments
tasksRouter.post(
  '/:id/comments',
  authenticate,
  [body('commentText').trim().notEmpty()],
  async (req: AuthenticatedRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const comment = await addTaskComment(req.params.id, req.user!.id, req.body.commentText);
      res.status(201).json({ success: true, data: comment });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/tasks/:id
tasksRouter.patch('/:id', authenticate, async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) throw new AppError('Task not found', 404);

    const business = await prisma.business.findUnique({ where: { id: task.businessId } });
    if (business?.ownerId !== req.user!.id && req.user!.accountType !== 'PLATFORM_ADMIN') {
      throw new AppError('Only business owner can edit task details', 403);
    }

    const { title, description, priority, dueDate, startDate, typeData } = req.body;
    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(priority && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(typeData !== undefined && { typeData }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});
