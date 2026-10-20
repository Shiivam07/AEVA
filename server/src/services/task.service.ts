import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { createNotification } from './notification.service';

// Generate unique task code: BRND-YYYYMMDD-XXXX
export const generateTaskCode = async (
  brandCode: string,
  createdAt: Date = new Date()
): Promise<string> => {
  const datePart = createdAt
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');

  // Use a loop to prevent collision
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Math.random()
      .toString(36)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 4)
      .padEnd(4, '0');
    const code = `${brandCode}-${datePart}-${suffix}`;

    const existing = await prisma.task.findUnique({ where: { taskCode: code } });
    if (!existing) return code;
  }

  // Fallback: use uuid fragment
  const fallback = `${brandCode}-${datePart}-${uuidv4().slice(0, 4).toUpperCase()}`;
  return fallback;
};

export const createTask = async (
  data: {
    businessId: string;
    brandId: string;
    title: string;
    description?: string;
    taskType: string;
    priority?: string;
    startDate?: Date;
    dueDate?: Date;
    productId?: string;
    sourceOrderId?: string;
    typeData?: Record<string, unknown>;
    assigneeIds?: string[];
    reviewerIds?: string[];
    coPartners?: Array<{
      userId: string;
      participationPercentage?: number;
      distributionBasis?: string;
    }>;
  },
  creatorId: string
) => {
  const brand = await prisma.brand.findFirst({
    where: { id: data.brandId, businessId: data.businessId },
  });
  if (!brand) throw new AppError('Brand not found in this business', 404);

  const taskCode = await generateTaskCode(brand.brandCode);

  const task = await prisma.$transaction(async (tx) => {
    const newTask = await tx.task.create({
      data: {
        id: uuidv4(),
        businessId: data.businessId,
        brandId: data.brandId,
        taskCode,
        title: data.title,
        description: data.description,
        taskType: data.taskType as any,
        priority: (data.priority as any) || 'MEDIUM',
        status: 'DRAFT',
        createdById: creatorId,
        startDate: data.startDate,
        dueDate: data.dueDate,
        productId: data.productId,
        sourceOrderId: data.sourceOrderId,
        typeData: data.typeData as any,
      },
    });

    // Create assignees
    const assignees: any[] = [];
    if (data.assigneeIds?.length) {
      for (let i = 0; i < data.assigneeIds.length; i++) {
        await tx.taskAssignee.create({
          data: {
            id: uuidv4(),
            taskId: newTask.id,
            userId: data.assigneeIds[i],
            role: i === 0 ? 'PRIMARY_ASSIGNEE' : 'SECONDARY_ASSIGNEE',
            assignedBy: creatorId,
          },
        });
        assignees.push(data.assigneeIds[i]);
      }
    }

    // Create reviewers
    if (data.reviewerIds?.length) {
      for (const reviewerId of data.reviewerIds) {
        await tx.taskAssignee.create({
          data: {
            id: uuidv4(),
            taskId: newTask.id,
            userId: reviewerId,
            role: 'REVIEWER',
            assignedBy: creatorId,
          },
        });
      }
    }

    // Create co-partners
    if (data.coPartners?.length) {
      for (const cp of data.coPartners) {
        await tx.taskCoPartner.create({
          data: {
            id: uuidv4(),
            taskId: newTask.id,
            userId: cp.userId,
            participationPercentage: cp.participationPercentage,
            distributionBasis: cp.distributionBasis as any,
          },
        });
      }
    }

    // Update status to ASSIGNED if assignees exist
    if (assignees.length > 0) {
      await tx.task.update({
        where: { id: newTask.id },
        data: { status: 'ASSIGNED' },
      });

      await tx.taskStatusHistory.create({
        data: {
          id: uuidv4(),
          taskId: newTask.id,
          fromStatus: 'DRAFT',
          toStatus: 'ASSIGNED',
          changedBy: creatorId,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: creatorId,
        businessId: data.businessId,
        entityType: 'Task',
        entityId: newTask.id,
        action: 'CREATE',
        newValues: { taskCode, title: data.title, taskType: data.taskType },
      },
    });

    return newTask;
  });

  // Send notifications to assignees (outside transaction)
  if (data.assigneeIds?.length) {
    for (const assigneeId of data.assigneeIds) {
      await createNotification({
        userId: assigneeId,
        title: 'New Task Assigned',
        message: `You have been assigned task ${taskCode}: ${data.title}`,
        relatedEntity: 'TASK',
        relatedEntityId: task.id,
      });
    }
  }

  return getTaskById(task.id, creatorId);
};

export const getTaskById = async (taskId: string, userId: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      brand: { select: { id: true, brandName: true, brandCode: true } },
      product: { select: { id: true, productName: true } },
      assignees: {
        include: {
          user: { select: { id: true, fullName: true, username: true, profileImage: true } },
        },
      },
      coPartners: {
        include: {
          user: { select: { id: true, fullName: true, username: true, profileImage: true } },
        },
      },
      comments: {
        include: {
          user: { select: { id: true, fullName: true, username: true, profileImage: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      attachments: {
        include: {
          uploadedBy: { select: { id: true, fullName: true, username: true } },
        },
      },
      financials: true,
      distributions: {
        include: {
          participant: { select: { id: true, fullName: true, username: true } },
          payments: true,
        },
      },
      statusHistory: {
        orderBy: { createdAt: 'asc' },
      },
      createdBy: { select: { id: true, fullName: true, username: true } },
    },
  });

  if (!task) throw new AppError('Task not found', 404);

  // Verify access
  await verifyTaskAccess(task, userId);

  return task;
};

export const getTasksByBusiness = async (
  businessId: string,
  userId: string,
  filters: {
    brandId?: string;
    status?: string;
    taskType?: string;
    assigneeId?: string;
    priority?: string;
    page?: number;
    limit?: number;
  } = {}
) => {
  const { page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  await verifyBusinessAccessForTask(businessId, userId);

  const where: any = { businessId };
  if (filters.brandId) where.brandId = filters.brandId;
  if (filters.status) where.status = filters.status;
  if (filters.taskType) where.taskType = filters.taskType;
  if (filters.priority) where.priority = filters.priority;
  if (filters.assigneeId) {
    where.assignees = { some: { userId: filters.assigneeId } };
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        brand: { select: { id: true, brandName: true, brandCode: true } },
        assignees: {
          include: {
            user: { select: { id: true, fullName: true, username: true, profileImage: true } },
          },
        },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  return { tasks, total, page, limit };
};

export const updateTaskStatus = async (
  taskId: string,
  newStatus: string,
  userId: string,
  notes?: string
) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignees: true },
  });
  if (!task) throw new AppError('Task not found', 404);

  // Validate transition
  validateStatusTransition(task.status, newStatus as any);

  // Only creators, assignees, and reviewers can update
  const isAssignee = task.assignees.some((a) => a.userId === userId);
  const isCreator = task.createdById === userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!isAssignee && !isCreator && user?.accountType !== 'PLATFORM_ADMIN') {
    throw new AppError('Not authorized to update this task', 403);
  }

  const updatedTask = await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        status: newStatus as any,
        completedAt: newStatus === 'COMPLETED' ? new Date() : undefined,
      },
    });

    await tx.taskStatusHistory.create({
      data: {
        id: uuidv4(),
        taskId,
        fromStatus: task.status,
        toStatus: newStatus as any,
        changedBy: userId,
        notes,
      },
    });

    return updated;
  });

  // Notify creator if submitted for review
  if (newStatus === 'SUBMITTED_FOR_REVIEW' && task.createdById !== userId) {
    await createNotification({
      userId: task.createdById,
      title: 'Task Submitted for Review',
      message: `Task ${task.taskCode} has been submitted for review`,
      relatedEntity: 'TASK',
      relatedEntityId: taskId,
    });
  }

  return updatedTask;
};

export const addTaskComment = async (
  taskId: string,
  userId: string,
  commentText: string
) => {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new AppError('Task not found', 404);

  await verifyTaskAccessById(taskId, userId);

  return prisma.taskComment.create({
    data: {
      id: uuidv4(),
      taskId,
      userId,
      commentText,
    },
    include: {
      user: { select: { id: true, fullName: true, username: true, profileImage: true } },
    },
  });
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const validTransitions: Record<string, string[]> = {
  DRAFT: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['SUBMITTED_FOR_REVIEW', 'BLOCKED', 'CANCELLED'],
  BLOCKED: ['IN_PROGRESS', 'CANCELLED'],
  SUBMITTED_FOR_REVIEW: ['REVISION_REQUIRED', 'COMPLETED', 'CANCELLED'],
  REVISION_REQUIRED: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const validateStatusTransition = (current: string, next: string) => {
  const allowed = validTransitions[current] || [];
  if (!allowed.includes(next)) {
    throw new AppError(
      `Cannot transition task from ${current} to ${next}`,
      400
    );
  }
};

const verifyTaskAccess = async (task: any, userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.accountType === 'PLATFORM_ADMIN') return;

  const business = await prisma.business.findUnique({ where: { id: task.businessId } });
  if (business?.ownerId === userId) return;

  const isAssignee = task.assignees?.some((a: any) => a.userId === userId);
  const isCoPartner = task.coPartners?.some((cp: any) => cp.userId === userId);
  if (isAssignee || isCoPartner) return;

  const membership = await prisma.businessMembership.findFirst({
    where: { businessId: task.businessId, userId, status: 'ACTIVE' },
  });
  if (!membership) throw new AppError('Access denied', 403);
};

const verifyTaskAccessById = async (taskId: string, userId: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignees: true, coPartners: true },
  });
  if (!task) throw new AppError('Task not found', 404);
  await verifyTaskAccess(task, userId);
};

const verifyBusinessAccessForTask = async (businessId: string, userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.accountType === 'PLATFORM_ADMIN') return;

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw new AppError('Business not found', 404);
  if (business.ownerId === userId) return;

  const membership = await prisma.businessMembership.findFirst({
    where: { businessId, userId, status: 'ACTIVE' },
  });
  if (!membership) throw new AppError('Access denied', 403);
};
