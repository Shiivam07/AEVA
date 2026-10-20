import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  NotificationRelatedEntity,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export const createNotification = async (data: {
  userId: string;
  title: string;
  message: string;
  relatedEntity?: NotificationRelatedEntity;
  relatedEntityId?: string;
}) => {
  return prisma.notification.create({
    data: {
      id: uuidv4(),
      userId: data.userId,
      title: data.title,
      message: data.message,
      relatedEntity: data.relatedEntity || 'GENERAL',
      relatedEntityId: data.relatedEntityId,
    },
  });
};

export const getUserNotifications = async (
  userId: string,
  page = 1,
  limit = 20
) => {
  const skip = (page - 1) * limit;
  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return { notifications, total, unreadCount, page, limit };
};

export const markNotificationRead = async (
  notificationId: string,
  userId: string
) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification) throw new AppError('Notification not found', 404);

  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
};

export const markAllNotificationsRead = async (userId: string) => {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
};
