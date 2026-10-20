import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

// Generate a 4-character brand code from brand name
export const generateBrandCode = async (
  brandName: string,
  businessId: string
): Promise<string> => {
  const base = brandName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4)
    .padEnd(4, 'X');

  // Check uniqueness within business
  let code = base;
  let suffix = 0;
  while (true) {
    const existing = await prisma.brand.findFirst({
      where: { businessId, brandCode: code },
    });
    if (!existing) break;
    suffix++;
    code = base.slice(0, 3) + suffix.toString();
  }

  return code;
};

export const createBrand = async (
  data: {
    businessId: string;
    brandName?: string;
    name?: string;
    brandCode?: string;
    code?: string;
    description?: string;
    category?: string;
    industry?: string;
    instructions?: string;
    internalNotes?: string;
    website?: string;
    links?: Array<{
      title: string;
      url: string;
      category: string;
      description?: string;
    }>;
  },
  creatorId: string
) => {
  const brandName = data.brandName || data.name;
  if (!brandName) throw new AppError('Brand name is required', 400);

  const business = await prisma.business.findFirst({
    where: { id: data.businessId, ownerId: creatorId },
  });
  if (!business) throw new AppError('Business not found or access denied', 404);

  const desiredCode = (data.brandCode || data.code || '').trim().toUpperCase();
  const brandCode = desiredCode || (await generateBrandCode(brandName, data.businessId));

  const linksData: Array<{
    id: string;
    title: string;
    url: string;
    category: any;
    description?: string;
    addedById: string;
  }> = [];

  if (data.website) {
    const formattedUrl = data.website.startsWith('http://') || data.website.startsWith('https://')
      ? data.website
      : `https://${data.website}`;
    linksData.push({
      id: uuidv4(),
      title: 'Official Website',
      url: formattedUrl,
      category: 'REFERENCE_DOCUMENT',
      description: 'Official brand website',
      addedById: creatorId,
    });
  }

  if (data.links && Array.isArray(data.links)) {
    data.links.forEach((l) => {
      linksData.push({
        id: uuidv4(),
        title: l.title,
        url: l.url,
        category: l.category as any,
        description: l.description,
        addedById: creatorId,
      });
    });
  }

  const brand = await prisma.brand.create({
    data: {
      id: uuidv4(),
      businessId: data.businessId,
      brandName,
      brandCode,
      description: data.description,
      category: data.category || data.industry,
      instructions: data.instructions,
      internalNotes: data.internalNotes,
      links: linksData.length > 0 ? { create: linksData } : undefined,
    },
    include: {
      links: true,
      _count: {
        select: {
          products: true,
          tasks: true,
          orders: true,
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: creatorId,
      businessId: data.businessId,
      entityType: 'Brand',
      entityId: brand.id,
      action: 'CREATE',
      newValues: { brandName: brand.brandName, brandCode: brand.brandCode },
    },
  });

  return {
    ...brand,
    name: brand.brandName,
    code: brand.brandCode,
    industry: brand.category,
    website: brand.links?.[0]?.url || data.website || '',
  };
};

export const getBrandsByBusiness = async (
  businessId: string,
  userId: string,
  search?: string
) => {
  await verifyBusinessAccess(businessId, userId);

  const where: any = { businessId };
  if (search) {
    where.OR = [
      { brandName: { contains: search, mode: 'insensitive' } },
      { brandCode: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ];
  }

  const brands = await prisma.brand.findMany({
    where,
    include: {
      links: { where: { isArchived: false } },
      _count: {
        select: {
          products: true,
          tasks: { where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } },
          orders: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return brands.map((b) => ({
    ...b,
    name: b.brandName,
    code: b.brandCode,
    industry: b.category,
    website: b.links?.[0]?.url || '',
  }));
};

export const getBrandById = async (brandId: string, userId: string) => {
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: {
      links: { where: { isArchived: false }, orderBy: { createdAt: 'desc' } },
      products: { where: { status: { not: 'DISCONTINUED' } } },
      _count: {
        select: {
          tasks: true,
          orders: true,
          products: true,
          orderingIds: true,
        },
      },
    },
  });
  if (!brand) throw new AppError('Brand not found', 404);
  await verifyBusinessAccess(brand.businessId, userId);

  return {
    ...brand,
    name: brand.brandName,
    code: brand.brandCode,
    industry: brand.category,
    website: brand.links?.[0]?.url || '',
  };
};

export const updateBrand = async (
  brandId: string,
  data: Partial<{
    brandName: string;
    description: string;
    category: string;
    status: string;
    instructions: string;
    internalNotes: string;
  }>,
  userId: string
) => {
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) throw new AppError('Brand not found', 404);
  await verifyBusinessOwner(brand.businessId, userId);

  const updated = await prisma.brand.update({
    where: { id: brandId },
    data: data as any,
  });

  await prisma.auditLog.create({
    data: {
      actorId: userId,
      businessId: brand.businessId,
      entityType: 'Brand',
      entityId: brandId,
      action: 'UPDATE',
      previousValues: { status: brand.status },
      newValues: data,
    },
  });

  return updated;
};

export const addBrandLink = async (
  brandId: string,
  data: { title: string; url: string; category: string; description?: string },
  userId: string
) => {
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) throw new AppError('Brand not found', 404);
  await verifyBusinessAccess(brand.businessId, userId);

  return prisma.brandLink.create({
    data: {
      id: uuidv4(),
      brandId,
      title: data.title,
      url: data.url,
      category: data.category as any,
      description: data.description,
      addedById: userId,
    },
  });
};

export const getBrandOverview = async (brandId: string, userId: string) => {
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) throw new AppError('Brand not found', 404);
  await verifyBusinessAccess(brand.businessId, userId);

  const [
    orders,
    tasks,
    completedTasks,
    activeTasks,
    financials,
    products,
    links,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { brandId },
      _sum: { expectedAmount: true, actualAmount: true },
      _count: true,
    }),
    prisma.task.count({ where: { brandId } }),
    prisma.task.count({ where: { brandId, status: 'COMPLETED' } }),
    prisma.task.count({
      where: {
        brandId,
        status: { notIn: ['COMPLETED', 'CANCELLED', 'DRAFT'] },
      },
    }),
    prisma.taskFinancial.aggregate({
      where: { task: { brandId } },
      _sum: {
        actualRevenue: true,
        productCost: true,
        vendorCost: true,
        teamPayment: true,
        operationalExpenses: true,
        otherExpenses: true,
        fees: true,
      },
    }),
    prisma.product.count({ where: { brandId } }),
    prisma.brandLink.count({ where: { brandId, isArchived: false } }),
  ]);

  const totalOrderValue = orders._sum.expectedAmount || 0;
  const totalRevenue = financials._sum.actualRevenue || 0;
  const totalExpenses =
    Number(financials._sum.productCost || 0) +
    Number(financials._sum.vendorCost || 0) +
    Number(financials._sum.teamPayment || 0) +
    Number(financials._sum.operationalExpenses || 0) +
    Number(financials._sum.otherExpenses || 0) +
    Number(financials._sum.fees || 0);

  return {
    totalOrderValue,
    totalRevenue,
    totalExpenses,
    recordedProfit:
      Number(totalRevenue) > 0 && totalExpenses > 0
        ? Number(totalRevenue) - totalExpenses
        : null,
    orderCount: orders._count,
    taskCount: tasks,
    completedTaskCount: completedTasks,
    activeTaskCount: activeTasks,
    productCount: products,
    linkCount: links,
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const verifyBusinessAccess = async (businessId: string, userId: string) => {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw new AppError('Business not found', 404);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.accountType === 'PLATFORM_ADMIN') return;

  if (business.ownerId === userId) return;

  const membership = await prisma.businessMembership.findFirst({
    where: { businessId, userId, status: 'ACTIVE' },
  });
  if (!membership) throw new AppError('Access denied', 403);
};

const verifyBusinessOwner = async (businessId: string, userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.accountType === 'PLATFORM_ADMIN') return;

  const business = await prisma.business.findFirst({
    where: { id: businessId, ownerId: userId },
  });
  if (!business) throw new AppError('Owner access required', 403);
};
