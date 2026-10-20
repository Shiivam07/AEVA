import {
  PrismaClient,
  AccountType,
  TaskType,
  TaskPriority,
  TaskStatus,
  MembershipRelationship,
  DistributionBasis,
  NotificationRelatedEntity,
  AuditAction,
  OrderStatus,
  OrderingIdStatus,
  AssignmentRole,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting comprehensive database seed for AEVA Platform...');

  // 1. Clean existing records in reverse dependency order
  await prisma.distributionPayment.deleteMany();
  await prisma.taskDistribution.deleteMany();
  await prisma.taskFinancial.deleteMany();
  await prisma.taskAssignee.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskStatusHistory.deleteMany();
  await prisma.taskAttachment.deleteMany();
  await prisma.taskCoPartner.deleteMany();
  await prisma.task.deleteMany();
  await prisma.order.deleteMany();
  await prisma.orderingId.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brandLink.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.businessMembership.deleteMany();
  await prisma.connectionRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing tables');

  // 2. Passwords
  const adminPw = await bcrypt.hash('AdminPassword123!', 10);
  const ownerPw = await bcrypt.hash('OwnerPassword123!', 10);
  const userPw = await bcrypt.hash('Password123!', 10);

  // 3. Create Users
  const adminUser = await prisma.user.create({
    data: {
      id: uuidv4(),
      fullName: 'System Administrator',
      username: 'admin',
      email: 'admin@aeva.com',
      passwordHash: adminPw,
      accountType: 'PLATFORM_ADMIN',
      status: 'ACTIVE',
      biography: 'Platform administrator overseeing AEVA operations and system health.',
    },
  });

  const ownerUser = await prisma.user.create({
    data: {
      id: uuidv4(),
      fullName: 'Shivam Chaurasia',
      username: 'owner',
      email: 'owner@aeva.com',
      passwordHash: ownerPw,
      accountType: 'BUSINESS_OWNER',
      phone: '+91 98765 43210',
      status: 'ACTIVE',
      biography: 'Platform founder and multi-brand business owner. Built with love by Shivam Chaurasia.',
    },
  });

  const marcusPartner = await prisma.user.create({
    data: {
      id: uuidv4(),
      fullName: 'Marcus Vance',
      username: 'marcus',
      email: 'marcus@aeva.com',
      passwordHash: userPw,
      accountType: 'COLLABORATOR',
      phone: '+1 (555) 876-5432',
      status: 'ACTIVE',
      biography: 'Strategic equity partner and product growth specialist.',
    },
  });

  const elenaLead = await prisma.user.create({
    data: {
      id: uuidv4(),
      fullName: 'Elena Rostova',
      username: 'elena',
      email: 'elena@aeva.com',
      passwordHash: userPw,
      accountType: 'COLLABORATOR',
      status: 'ACTIVE',
      biography: 'Operations Lead handling logistics, fulfillment, and daily standups.',
    },
  });

  const chenVendor = await prisma.user.create({
    data: {
      id: uuidv4(),
      fullName: 'Chen Wei',
      username: 'chen',
      email: 'chen@aeva.com',
      passwordHash: userPw,
      accountType: 'COLLABORATOR',
      status: 'ACTIVE',
      biography: 'Overseas manufacturing liaison and supply chain sourcing specialist.',
    },
  });

  console.log('👤 Users seeded: Platform Admin, Business Owner (Shivam Chaurasia), 3 Collaborators');

  // 4. Create Business
  const business = await prisma.business.create({
    data: {
      id: uuidv4(),
      businessName: 'AEVA Ventures Group',
      ownerId: ownerUser.id,
      currency: 'INR',
      status: 'ACTIVE',
      description: 'Holding entity managing athletic apparel, health nutrition, and smart hardware brands. Owned by Shivam Chaurasia.',
    },
  });

  // 5. Business Memberships
  await prisma.businessMembership.createMany({
    data: [
      {
        id: uuidv4(),
        businessId: business.id,
        userId: marcusPartner.id,
        relationshipType: 'CO_PARTNER',
        status: 'ACTIVE',
        permissions: { canViewFinancials: true, canManageTasks: true },
        invitedBy: ownerUser.id,
        acceptedAt: new Date(),
      },
      {
        id: uuidv4(),
        businessId: business.id,
        userId: elenaLead.id,
        relationshipType: 'TEAM_MEMBER',
        status: 'ACTIVE',
        permissions: { canManageTasks: true, canFulfillOrders: true },
        invitedBy: ownerUser.id,
        acceptedAt: new Date(),
      },
      {
        id: uuidv4(),
        businessId: business.id,
        userId: chenVendor.id,
        relationshipType: 'VENDOR',
        status: 'ACTIVE',
        permissions: { canViewTasks: true },
        invitedBy: ownerUser.id,
        acceptedAt: new Date(),
      },
    ],
  });

  console.log('🏢 Business and Team Memberships created');

  // 6. Create Brands
  const apexBrand = await prisma.brand.create({
    data: {
      id: uuidv4(),
      businessId: business.id,
      brandName: 'Apex Athletics',
      brandCode: 'APX',
      description: 'Performance activewear engineered with breathable compression fabrics for elite athletes.',
      status: 'ACTIVE',
    },
  });

  const luminaBrand = await prisma.brand.create({
    data: {
      id: uuidv4(),
      businessId: business.id,
      brandName: 'Lumina Organics',
      brandCode: 'LUM',
      description: 'Certified organic superfoods, adaptogenic recovery supplements, and clean proteins.',
      status: 'ACTIVE',
    },
  });

  const novaBrand = await prisma.brand.create({
    data: {
      id: uuidv4(),
      businessId: business.id,
      brandName: 'Nova Tech Gear',
      brandCode: 'NOV',
      description: 'Minimalist wireless charging stations and premium audio accessories.',
      status: 'ACTIVE',
    },
  });

  console.log('🏷️ 3 Portfolio Brands created: Apex, Lumina, Nova');

  // 7. Products
  const p1 = await prisma.product.create({
    data: {
      id: uuidv4(),
      brandId: apexBrand.id,
      productName: 'AeroVent Seamless Compression Tee',
      productCode: 'APX-AV-01',
      sku: 'APX-AV-BLK-M',
      category: 'Apparel',
      description: 'Moisture-wicking athletic compression shirt with laser-cut ventilation.',
      status: 'ACTIVE',
    },
  });

  const p2 = await prisma.product.create({
    data: {
      id: uuidv4(),
      brandId: apexBrand.id,
      productName: 'HyperFlex Pro Training Shorts',
      productCode: 'APX-HF-02',
      sku: 'APX-HF-NVY-L',
      category: 'Apparel',
      description: '4-way stretch training shorts with zippered smartphone pocket.',
      status: 'ACTIVE',
    },
  });

  const p3 = await prisma.product.create({
    data: {
      id: uuidv4(),
      brandId: luminaBrand.id,
      productName: 'Organic Grass-Fed Whey Isolate (Vanilla)',
      productCode: 'LUM-WHEY-VN',
      sku: 'LUM-WHEY-VN-2LB',
      category: 'Supplements',
      description: 'Non-GMO pasture-raised whey protein with natural bourbon vanilla bean.',
      status: 'ACTIVE',
    },
  });

  const p4 = await prisma.product.create({
    data: {
      id: uuidv4(),
      brandId: novaBrand.id,
      productName: 'MagCharge 3-in-1 Foldable Dock',
      productCode: 'NOV-MC3',
      sku: 'NOV-MC3-SILV',
      category: 'Electronics',
      description: 'Compact 15W Qi2 wireless charger for iPhone, Apple Watch, and AirPods.',
      status: 'ACTIVE',
    },
  });

  // 8. Ordering Accounts
  const acc1 = await prisma.orderingId.create({
    data: {
      id: uuidv4(),
      brandId: apexBrand.id,
      externalIdentifier: 'APX-AMZ-US-9912',
      notes: 'Amazon US FBA Account',
      addedById: ownerUser.id,
      status: 'IN_USE',
    },
  });

  const acc2 = await prisma.orderingId.create({
    data: {
      id: uuidv4(),
      brandId: luminaBrand.id,
      externalIdentifier: 'lumina-direct.myshopify.com',
      notes: 'Shopify Direct Store',
      addedById: ownerUser.id,
      status: 'IN_USE',
    },
  });

  // 9. Orders
  await prisma.order.createMany({
    data: [
      {
        id: uuidv4(),
        businessId: business.id,
        brandId: apexBrand.id,
        orderingIdId: acc1.id,
        externalOrderReference: 'ORD-2026-9001',
        orderDate: new Date(Date.now() - 3 * 86400000),
        quantity: 2,
        expectedAmount: 184.50,
        actualAmount: 184.50,
        orderStatus: 'COMPLETED',
        createdById: ownerUser.id,
        notes: 'Jordan Miller - 742 Evergreen Terrace, Springfield, OR',
      },
      {
        id: uuidv4(),
        businessId: business.id,
        brandId: apexBrand.id,
        orderingIdId: acc1.id,
        externalOrderReference: 'ORD-2026-9002',
        orderDate: new Date(Date.now() - 1 * 86400000),
        quantity: 1,
        expectedAmount: 95.00,
        actualAmount: 95.00,
        orderStatus: 'PROCESSING',
        createdById: ownerUser.id,
        notes: 'Samantha Cruz - 120 Ocean Drive, Miami, FL',
      },
      {
        id: uuidv4(),
        businessId: business.id,
        brandId: luminaBrand.id,
        orderingIdId: acc2.id,
        externalOrderReference: 'ORD-2026-9003',
        orderDate: new Date(),
        quantity: 3,
        expectedAmount: 142.00,
        actualAmount: 142.00,
        orderStatus: 'PROCESSING',
        createdById: ownerUser.id,
        notes: 'Liam Hemsworth - 450 Sunset Blvd, Los Angeles, CA',
      },
      {
        id: uuidv4(),
        businessId: business.id,
        brandId: novaBrand.id,
        externalOrderReference: 'ORD-2026-9004',
        orderDate: new Date(),
        quantity: 1,
        expectedAmount: 89.99,
        actualAmount: 89.99,
        orderStatus: 'PLACED',
        createdById: ownerUser.id,
        notes: 'David Zhang - 88 Market St, San Francisco, CA',
      },
    ],
  });

  console.log('📦 Products, Accounts, and Orders populated');

  // 10. Operational Tasks
  const task1 = await prisma.task.create({
    data: {
      id: uuidv4(),
      businessId: business.id,
      brandId: apexBrand.id,
      taskCode: 'TSK-APX-01',
      title: 'Summer Compression Line Batch Production (5,000 units)',
      description: 'Oversee factory tooling, sample quality check, ocean freight transit, and Amazon FBA warehouse check-in.',
      taskType: 'PRODUCT_RESEARCH',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      createdById: ownerUser.id,
      productId: p1.id,
      startDate: new Date(Date.now() - 10 * 86400000),
      dueDate: new Date(Date.now() + 15 * 86400000),
    },
  });

  const task2 = await prisma.task.create({
    data: {
      id: uuidv4(),
      businessId: business.id,
      brandId: luminaBrand.id,
      taskCode: 'TSK-LUM-02',
      title: 'Q3 Retail Wholesale Distribution (1,200 Cases)',
      description: 'Fulfill boutique fitness studios and organic grocer orders. Reconcile invoices and calculate freight splits.',
      taskType: 'ORDERING',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      createdById: ownerUser.id,
      productId: p3.id,
      startDate: new Date(Date.now() - 4 * 86400000),
      dueDate: new Date(Date.now() + 3 * 86400000),
    },
  });

  const task3 = await prisma.task.create({
    data: {
      id: uuidv4(),
      businessId: business.id,
      brandId: novaBrand.id,
      taskCode: 'TSK-NOV-03',
      title: 'Daily Logistics & Restock Check',
      description: 'Review low stock SKUs, verify customer returns, and confirm supplier delivery receipts.',
      taskType: 'DATA_ENTRY',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      createdById: ownerUser.id,
      dueDate: new Date(),
    },
  });

  // Assignees
  await prisma.taskAssignee.createMany({
    data: [
      { id: uuidv4(), taskId: task1.id, userId: chenVendor.id, role: 'PRIMARY_ASSIGNEE', assignedBy: ownerUser.id },
      { id: uuidv4(), taskId: task1.id, userId: marcusPartner.id, role: 'SECONDARY_ASSIGNEE', assignedBy: ownerUser.id },
      { id: uuidv4(), taskId: task2.id, userId: elenaLead.id, role: 'PRIMARY_ASSIGNEE', assignedBy: ownerUser.id },
      { id: uuidv4(), taskId: task3.id, userId: elenaLead.id, role: 'PRIMARY_ASSIGNEE', assignedBy: ownerUser.id },
    ],
  });

  // Comments
  await prisma.taskComment.createMany({
    data: [
      {
        id: uuidv4(),
        taskId: task1.id,
        userId: chenVendor.id,
        commentText: 'Pre-production lab dip fabric samples approved. Mass cutting commenced yesterday.',
      },
      {
        id: uuidv4(),
        taskId: task1.id,
        userId: ownerUser.id,
        commentText: 'Excellent news. Ensure carton labeling adheres strictly to Amazon FBA pallet standards.',
      },
    ],
  });

  console.log('📋 Tasks, Assignees, and Discussion history added');

  // 11. Task Financials & Profit Calculations
  await prisma.taskFinancial.create({
    data: {
      id: uuidv4(),
      taskId: task1.id,
      expectedRevenue: 125000.0,
      actualRevenue: 138400.0,
      productCost: 45000.0,
      vendorCost: 8500.0,
      teamPayment: 6000.0,
      operationalExpenses: 4500.0,
      fees: 4400.0,
      refundsOrAdjustments: 1200.0,
      distributionBasis: 'PERCENTAGE_OF_NET_PROFIT',
      calculationStatus: 'FINALIZED',
    },
  });

  await prisma.taskFinancial.create({
    data: {
      id: uuidv4(),
      taskId: task2.id,
      expectedRevenue: 48000.0,
      actualRevenue: 52000.0,
      productCost: 16000.0,
      vendorCost: 3200.0,
      teamPayment: 2500.0,
      operationalExpenses: 1800.0,
      fees: 1500.0,
      refundsOrAdjustments: 0.0,
      distributionBasis: 'PERCENTAGE_OF_NET_PROFIT',
      calculationStatus: 'FINALIZED',
    },
  });

  // 12. Profit Distributions & Payouts
  const dist1 = await prisma.taskDistribution.create({
    data: {
      id: uuidv4(),
      taskId: task1.id,
      participantId: marcusPartner.id,
      distributionBasis: 'PERCENTAGE_OF_NET_PROFIT',
      participationPercentage: 30.0,
      calculatedAmount: 20640.0,
      amountPaid: 15000.0,
      outstandingAmount: 5640.0,
      status: 'PARTIALLY_PAID',
    },
  });

  await prisma.distributionPayment.create({
    data: {
      id: uuidv4(),
      distributionId: dist1.id,
      amount: 15000.0,
      paymentDate: new Date(Date.now() - 2 * 86400000),
      paymentMethod: 'BANK_TRANSFER',
      transactionReference: 'WIRE-US-9812401',
      notes: 'Tranche 1 payment upon milestone 3 completion.',
      recordedById: ownerUser.id,
    },
  });

  const dist2 = await prisma.taskDistribution.create({
    data: {
      id: uuidv4(),
      taskId: task1.id,
      participantId: elenaLead.id,
      distributionBasis: 'PERCENTAGE_OF_NET_PROFIT',
      participationPercentage: 10.0,
      calculatedAmount: 6880.0,
      amountPaid: 6880.0,
      outstandingAmount: 0.0,
      status: 'PAID',
    },
  });

  await prisma.distributionPayment.create({
    data: {
      id: uuidv4(),
      distributionId: dist2.id,
      amount: 6880.0,
      paymentDate: new Date(Date.now() - 1 * 86400000),
      paymentMethod: 'BANK_TRANSFER',
      transactionReference: 'ACH-8891002',
      notes: 'Full performance bonus disburse.',
      recordedById: ownerUser.id,
    },
  });

  const dist3 = await prisma.taskDistribution.create({
    data: {
      id: uuidv4(),
      taskId: task2.id,
      participantId: marcusPartner.id,
      distributionBasis: 'PERCENTAGE_OF_NET_PROFIT',
      participationPercentage: 25.0,
      calculatedAmount: 6750.0,
      amountPaid: 0.0,
      outstandingAmount: 6750.0,
      status: 'PENDING',
    },
  });

  console.log('💰 Task Financials, Profit Distributions, and Payment Proofs generated');

  // 13. Notifications
  await prisma.notification.createMany({
    data: [
      {
        id: uuidv4(),
        userId: ownerUser.id,
        title: 'New Wholesale Order Received',
        message: 'Order #ORD-2026-9003 for Lumina Organics ($142.00) was placed.',
        relatedEntity: 'ORDER',
        relatedEntityId: 'ORD-2026-9003',
      },
      {
        id: uuidv4(),
        userId: ownerUser.id,
        title: 'Payout Disbursement Pending',
        message: 'Marcus Vance has an outstanding payout balance of $5,640.00 for Summer Compression Line.',
        relatedEntity: 'DISTRIBUTION',
        relatedEntityId: dist1.id,
      },
      {
        id: uuidv4(),
        userId: marcusPartner.id,
        title: 'Milestone Disbursed',
        message: 'A wire payment of $15,000.00 has been recorded for your profit share in task #1.',
        relatedEntity: 'PAYMENT',
        relatedEntityId: dist1.id,
      },
      {
        id: uuidv4(),
        userId: elenaLead.id,
        title: 'New Daily Checklist Available',
        message: 'Today\'s operational restock check is assigned to you.',
        relatedEntity: 'TASK',
        relatedEntityId: task3.id,
      },
    ],
  });

  // 14. Audit Log
  await prisma.auditLog.createMany({
    data: [
      {
        id: uuidv4(),
        actorId: ownerUser.id,
        businessId: business.id,
        entityType: 'BUSINESS',
        entityId: business.id,
        action: 'CREATE',
        newValues: { businessName: 'AEVA Ventures Group', currency: 'INR' },
      },
      {
        id: uuidv4(),
        actorId: ownerUser.id,
        businessId: business.id,
        entityType: 'BRAND',
        entityId: apexBrand.id,
        action: 'CREATE',
        newValues: { brandName: 'Apex Athletics', code: 'APX' },
      },
      {
        id: uuidv4(),
        actorId: ownerUser.id,
        businessId: business.id,
        entityType: 'DISTRIBUTION_PAYMENT',
        entityId: dist1.id,
        action: 'APPROVE',
        newValues: { distributionId: dist1.id, amount: 15000.0, method: 'BANK_TRANSFER' },
      },
    ],
  });

  console.log('🔔 Notifications and Audit Trail created');
  console.log('🎉 Seed completed successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
