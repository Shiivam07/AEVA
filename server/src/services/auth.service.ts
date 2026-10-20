import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AccountType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { createNotification } from './notification.service';

const SALT_ROUNDS = 12;

export const generateTokens = (userId: string, accountType: AccountType) => {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  const token = jwt.sign({ userId, accountType }, secret, { expiresIn } as jwt.SignOptions);
  return { token };
};

export const registerUser = async (data: {
  fullName: string;
  username: string;
  email: string;
  password: string;
  phone?: string;
  accountType: 'BUSINESS_OWNER' | 'COLLABORATOR';
}) => {
  // Prevent creating admin accounts via public registration
  if (!['BUSINESS_OWNER', 'COLLABORATOR'].includes(data.accountType)) {
    throw new AppError('Invalid account type for registration', 400);
  }

  const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingEmail) throw new AppError('Email already registered', 409);

  const existingUsername = await prisma.user.findUnique({ where: { username: data.username } });
  if (existingUsername) throw new AppError('Username already taken', 409);

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      id: uuidv4(),
      fullName: data.fullName,
      username: data.username,
      email: data.email,
      passwordHash,
      accountType: data.accountType as AccountType,
      phone: data.phone,
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      accountType: true,
      createdAt: true,
    },
  });

  const { token } = generateTokens(user.id, user.accountType);
  return { user, token };
};

export const loginUser = async (data: { identifier: string; password: string }) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: data.identifier }, { username: data.identifier }],
    },
  });

  if (!user) throw new AppError('Invalid credentials', 401);
  if (user.status !== 'ACTIVE') throw new AppError('Account is not active', 403);

  const passwordMatch = await bcrypt.compare(data.password, user.passwordHash);
  if (!passwordMatch) throw new AppError('Invalid credentials', 401);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      action: 'LOGIN',
    },
  });

  const { token } = generateTokens(user.id, user.accountType);

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      accountType: user.accountType,
      profileImage: user.profileImage,
    },
    token,
  };
};

export const provisionAdminUser = async (data: {
  fullName: string;
  username: string;
  email: string;
  password: string;
  provisionSecret: string;
}) => {
  if (data.provisionSecret !== process.env.ADMIN_PROVISION_SECRET) {
    throw new AppError('Invalid provisioning secret', 403);
  }

  const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingEmail) throw new AppError('Email already registered', 409);

  const existingUsername = await prisma.user.findUnique({ where: { username: data.username } });
  if (existingUsername) throw new AppError('Username already taken', 409);

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      id: uuidv4(),
      fullName: data.fullName,
      username: data.username,
      email: data.email,
      passwordHash,
      accountType: 'PLATFORM_ADMIN',
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      accountType: true,
      createdAt: true,
    },
  });

  return user;
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordMatch) throw new AppError('Current password is incorrect', 400);

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
};
