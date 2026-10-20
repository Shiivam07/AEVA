import Decimal from 'decimal.js';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

// Configure Decimal for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export const saveTaskFinancials = async (
  taskId: string,
  data: {
    expectedRevenue?: number;
    actualRevenue?: number;
    productCost?: number;
    vendorCost?: number;
    teamPayment?: number;
    operationalExpenses?: number;
    otherExpenses?: number;
    fees?: number;
    refundsOrAdjustments?: number;
    distributionBasis?: string;
  },
  userId: string
) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignees: true },
  });
  if (!task) throw new AppError('Task not found', 404);

  // Only creator or business owner can edit financials
  const isCreator = task.createdById === userId;
  const business = await prisma.business.findUnique({ where: { id: task.businessId } });
  const isOwner = business?.ownerId === userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!isCreator && !isOwner && user?.accountType !== 'PLATFORM_ADMIN') {
    throw new AppError('Not authorized to edit financials', 403);
  }

  const financialData: any = {};
  if (data.expectedRevenue !== undefined) financialData.expectedRevenue = new Decimal(data.expectedRevenue);
  if (data.actualRevenue !== undefined) financialData.actualRevenue = new Decimal(data.actualRevenue);
  if (data.productCost !== undefined) financialData.productCost = new Decimal(data.productCost);
  if (data.vendorCost !== undefined) financialData.vendorCost = new Decimal(data.vendorCost);
  if (data.teamPayment !== undefined) financialData.teamPayment = new Decimal(data.teamPayment);
  if (data.operationalExpenses !== undefined) financialData.operationalExpenses = new Decimal(data.operationalExpenses);
  if (data.otherExpenses !== undefined) financialData.otherExpenses = new Decimal(data.otherExpenses);
  if (data.fees !== undefined) financialData.fees = new Decimal(data.fees);
  if (data.refundsOrAdjustments !== undefined) financialData.refundsOrAdjustments = new Decimal(data.refundsOrAdjustments);
  if (data.distributionBasis) financialData.distributionBasis = data.distributionBasis;

  // Determine calculation status
  const hasRevenue = data.actualRevenue !== undefined || (await getExistingRevenue(taskId));
  const hasExpenses = Object.keys(data).some((k) =>
    ['productCost', 'vendorCost', 'teamPayment', 'operationalExpenses', 'otherExpenses', 'fees'].includes(k)
  );
  financialData.calculationStatus = hasRevenue && hasExpenses ? 'ESTIMATED' : 'INCOMPLETE';

  const existing = await prisma.taskFinancial.findUnique({ where: { taskId } });

  if (existing) {
    return prisma.taskFinancial.update({
      where: { taskId },
      data: financialData,
    });
  } else {
    return prisma.taskFinancial.create({
      data: {
        id: uuidv4(),
        taskId,
        ...financialData,
      },
    });
  }
};

export const calculateTaskFinancials = (financials: any) => {
  const toDecimal = (val: any) => (val ? new Decimal(val.toString()) : new Decimal(0));

  const expectedRevenue = toDecimal(financials.expectedRevenue);
  const actualRevenue = toDecimal(financials.actualRevenue);
  const refunds = toDecimal(financials.refundsOrAdjustments);

  const adjustedActualRevenue = actualRevenue.minus(refunds);

  const expectedExpenses = [
    financials.productCost,
    financials.vendorCost,
    financials.teamPayment,
    financials.operationalExpenses,
    financials.otherExpenses,
    financials.fees,
  ].reduce((sum, val) => sum.plus(toDecimal(val)), new Decimal(0));

  const actualExpenses = expectedExpenses; // In this model, actual = expected unless separately tracked

  const expectedProfit = expectedRevenue.minus(expectedExpenses);
  const actualProfit = adjustedActualRevenue.minus(actualExpenses);

  return {
    expectedRevenue: expectedRevenue.toFixed(2),
    actualRevenue: adjustedActualRevenue.toFixed(2),
    expectedExpenses: expectedExpenses.toFixed(2),
    actualExpenses: actualExpenses.toFixed(2),
    expectedProfit: expectedProfit.toFixed(2),
    actualProfit: actualProfit.toFixed(2),
    isComplete: financials.calculationStatus !== 'INCOMPLETE',
  };
};

export const createDistribution = async (
  taskId: string,
  distributions: Array<{
    participantId: string;
    distributionBasis: string;
    participationPercentage?: number;
    eligibleAmount?: number;
  }>,
  userId: string
) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { financials: true },
  });
  if (!task) throw new AppError('Task not found', 404);

  const business = await prisma.business.findUnique({ where: { id: task.businessId } });
  if (business?.ownerId !== userId) {
    throw new AppError('Only business owner can configure distributions', 403);
  }

  // Validate percentages sum to 100 for percentage-based distributions
  const percentageBased = distributions.filter(
    (d) => d.distributionBasis !== 'FIXED_AMOUNT' && d.participationPercentage !== undefined
  );
  if (percentageBased.length > 0) {
    const total = percentageBased.reduce(
      (sum, d) => sum + (d.participationPercentage || 0),
      0
    );
    if (Math.abs(total - 100) > 0.01) {
      throw new AppError(`Percentages must sum to 100%. Current total: ${total}%`, 400);
    }
  }

  // Calculate amounts based on basis
  const financials = task.financials;
  const toDecimal = (val: any) => (val ? new Decimal(val.toString()) : new Decimal(0));

  const results = await prisma.$transaction(async (tx) => {
    // Clear existing distributions for this task
    await tx.taskDistribution.deleteMany({ where: { taskId } });

    const created = [];
    for (const dist of distributions) {
      let calculatedAmount: Decimal | null = null;
      let eligibleAmount: Decimal | null = null;

      if (financials) {
        const revenue = toDecimal(financials.actualRevenue).minus(toDecimal(financials.refundsOrAdjustments));
        const expenses = [
          financials.productCost,
          financials.vendorCost,
          financials.teamPayment,
          financials.operationalExpenses,
          financials.otherExpenses,
          financials.fees,
        ].reduce<Decimal>((sum: Decimal, val: any) => sum.plus(toDecimal(val)), new Decimal(0));
        const netProfit = revenue.minus(expenses);

        switch (dist.distributionBasis) {
          case 'PERCENTAGE_OF_REVENUE':
            eligibleAmount = revenue;
            if (dist.participationPercentage) {
              calculatedAmount = revenue.times(dist.participationPercentage).dividedBy(100);
            }
            break;
          case 'PERCENTAGE_OF_NET_PROFIT':
            eligibleAmount = netProfit;
            if (dist.participationPercentage) {
              calculatedAmount = netProfit.times(dist.participationPercentage).dividedBy(100);
            }
            break;
          case 'FIXED_AMOUNT':
            eligibleAmount = dist.eligibleAmount ? new Decimal(dist.eligibleAmount) : null;
            calculatedAmount = eligibleAmount;
            break;
        }
      }

      const distribution = await tx.taskDistribution.create({
        data: {
          id: uuidv4(),
          taskId,
          participantId: dist.participantId,
          distributionBasis: dist.distributionBasis as any,
          participationPercentage: dist.participationPercentage,
          eligibleAmount,
          calculatedAmount,
          outstandingAmount: calculatedAmount,
          status: 'PENDING',
        },
      });
      created.push(distribution);
    }

    return created;
  });

  return results;
};

export const recordDistributionPayment = async (
  distributionId: string,
  data: {
    amount: number;
    paymentDate: Date;
    paymentMethod?: string;
    transactionReference?: string;
    notes?: string;
  },
  userId: string
) => {
  const distribution = await prisma.taskDistribution.findUnique({
    where: { id: distributionId },
    include: { task: true },
  });
  if (!distribution) throw new AppError('Distribution not found', 404);

  const business = await prisma.business.findUnique({
    where: { id: distribution.task.businessId },
  });
  if (business?.ownerId !== userId) {
    throw new AppError('Only business owner can record payments', 403);
  }

  const paymentAmount = new Decimal(data.amount);
  const outstanding = new Decimal(distribution.outstandingAmount?.toString() || '0');

  if (paymentAmount.greaterThan(outstanding)) {
    throw new AppError(
      `Payment amount (${paymentAmount}) exceeds outstanding balance (${outstanding})`,
      400
    );
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.distributionPayment.create({
      data: {
        id: uuidv4(),
        distributionId,
        amount: paymentAmount,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        transactionReference: data.transactionReference,
        notes: data.notes,
        recordedById: userId,
      },
    });

    const newPaid = new Decimal(distribution.amountPaid.toString()).plus(paymentAmount);
    const newOutstanding = outstanding.minus(paymentAmount);
    const newStatus = newOutstanding.isZero() ? 'PAID' : 'PARTIALLY_PAID';

    await tx.taskDistribution.update({
      where: { id: distributionId },
      data: {
        amountPaid: newPaid,
        outstandingAmount: newOutstanding,
        status: newStatus,
      },
    });

    return payment;
  });
};

// Helper
const getExistingRevenue = async (taskId: string): Promise<boolean> => {
  const f = await prisma.taskFinancial.findUnique({ where: { taskId } });
  return f?.actualRevenue !== null && f?.actualRevenue !== undefined;
};
