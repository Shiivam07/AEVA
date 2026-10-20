-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('PLATFORM_ADMIN', 'BUSINESS_OWNER', 'COLLABORATOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BrandStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MembershipRelationship" AS ENUM ('TEAM_MEMBER', 'VENDOR', 'CO_PARTNER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ConnectionRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "OrderingIdStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'IN_USE', 'TEMPORARILY_UNAVAILABLE', 'DISABLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PLANNED', 'PLACED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_DUE', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('ORDERING', 'MAKING_SHEET', 'REVIEWS', 'INVOICES', 'PRODUCT_RESEARCH', 'DATA_ENTRY', 'PAYMENT_FOLLOWUP', 'QUALITY_CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('DRAFT', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'BLOCKED', 'SUBMITTED_FOR_REVIEW', 'REVISION_REQUIRED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AssignmentRole" AS ENUM ('PRIMARY_ASSIGNEE', 'SECONDARY_ASSIGNEE', 'REVIEWER');

-- CreateEnum
CREATE TYPE "DistributionBasis" AS ENUM ('PERCENTAGE_OF_REVENUE', 'PERCENTAGE_OF_NET_PROFIT', 'FIXED_AMOUNT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DistributionStatus" AS ENUM ('NOT_DUE', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinancialCalculationStatus" AS ENUM ('INCOMPLETE', 'ESTIMATED', 'FINALIZED', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "LinkCategory" AS ENUM ('ORDERS', 'EXCEL_SHEET', 'GOOGLE_SHEET', 'PRODUCT_CATALOG', 'INVOICE_FOLDER', 'REFERENCE_DOCUMENT', 'DASHBOARD', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationRelatedEntity" AS ENUM ('TASK', 'ORDER', 'BRAND', 'BUSINESS', 'CONNECTION_REQUEST', 'DISTRIBUTION', 'PAYMENT', 'GENERAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACCESS', 'APPROVE', 'REJECT', 'ASSIGN', 'REVOKE');

-- CreateEnum
CREATE TYPE "RecurrencePattern" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "account_type" "AccountType" NOT NULL,
    "profile_image" TEXT,
    "phone" TEXT,
    "biography" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "status" "BusinessStatus" NOT NULL DEFAULT 'ACTIVE',
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_memberships" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "relationship_type" "MembershipRelationship" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "permissions" JSONB,
    "invited_by" TEXT,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection_requests" (
    "id" TEXT NOT NULL,
    "requester_user_id" TEXT NOT NULL,
    "recipient_user_id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "proposed_relationship_type" "MembershipRelationship" NOT NULL,
    "requested_permissions" JSONB,
    "message" TEXT,
    "status" "ConnectionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "connection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "brand_name" TEXT NOT NULL,
    "brand_code" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "status" "BrandStatus" NOT NULL DEFAULT 'ACTIVE',
    "instructions" TEXT,
    "internal_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_links" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" "LinkCategory" NOT NULL,
    "description" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "added_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_code" TEXT,
    "sku" TEXT,
    "description" TEXT,
    "category" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordering_ids" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "external_identifier" TEXT NOT NULL,
    "status" "OrderingIdStatus" NOT NULL DEFAULT 'AVAILABLE',
    "restrictions" TEXT,
    "notes" TEXT,
    "added_by" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordering_ids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "product_id" TEXT,
    "ordering_id_id" TEXT,
    "external_order_reference" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "order_date" TIMESTAMP(3) NOT NULL,
    "expected_amount" DECIMAL(15,2),
    "actual_amount" DECIMAL(15,2),
    "order_status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'NOT_DUE',
    "expected_delivery_date" TIMESTAMP(3),
    "spreadsheet_link" TEXT,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "task_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "task_type" "TaskType" NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT NOT NULL,
    "start_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "source_order_id" TEXT,
    "product_id" TEXT,
    "type_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_assignees" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "AssignmentRole" NOT NULL DEFAULT 'PRIMARY_ASSIGNEE',
    "assigned_by" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_co_partners" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "participation_percentage" DECIMAL(5,2),
    "distribution_basis" "DistributionBasis",
    "access_permissions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_co_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "comment_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_attachments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_status_history" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "from_status" "TaskStatus",
    "to_status" "TaskStatus" NOT NULL,
    "changed_by" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_templates" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "brand_id" TEXT,
    "title" TEXT NOT NULL,
    "task_type" "TaskType" NOT NULL,
    "description" TEXT,
    "recurrence_pattern" "RecurrencePattern" NOT NULL,
    "recurrence_rule" TEXT,
    "default_assignee_id" TEXT,
    "default_priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_financials" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "expected_revenue" DECIMAL(15,2),
    "actual_revenue" DECIMAL(15,2),
    "product_cost" DECIMAL(15,2),
    "vendor_cost" DECIMAL(15,2),
    "team_payment" DECIMAL(15,2),
    "operational_expenses" DECIMAL(15,2),
    "other_expenses" DECIMAL(15,2),
    "fees" DECIMAL(15,2),
    "refunds_or_adjustments" DECIMAL(15,2),
    "distribution_basis" "DistributionBasis",
    "calculation_status" "FinancialCalculationStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_financials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_distributions" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "participant_user_id" TEXT NOT NULL,
    "distribution_basis" "DistributionBasis" NOT NULL,
    "participation_percentage" DECIMAL(5,2),
    "eligible_amount" DECIMAL(15,2),
    "calculated_amount" DECIMAL(15,2),
    "amount_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "outstanding_amount" DECIMAL(15,2),
    "status" "DistributionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_payments" (
    "id" TEXT NOT NULL,
    "distribution_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "payment_method" TEXT,
    "transaction_reference" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'RECORDED',
    "recorded_by" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distribution_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "account_holder_name" TEXT,
    "bank_name" TEXT,
    "encrypted_account_number" TEXT,
    "ifsc" TEXT,
    "encrypted_upi_id" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "related_entity_type" "NotificationRelatedEntity" NOT NULL DEFAULT 'GENERAL',
    "related_entity_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "business_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "previous_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "business_memberships_business_id_user_id_relationship_type_key" ON "business_memberships"("business_id", "user_id", "relationship_type");

-- CreateIndex
CREATE UNIQUE INDEX "brands_business_id_brand_code_key" ON "brands"("business_id", "brand_code");

-- CreateIndex
CREATE UNIQUE INDEX "ordering_ids_brand_id_external_identifier_key" ON "ordering_ids"("brand_id", "external_identifier");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_task_code_key" ON "tasks"("task_code");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignees_task_id_user_id_role_key" ON "task_assignees"("task_id", "user_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "task_co_partners_task_id_user_id_key" ON "task_co_partners"("task_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_financials_task_id_key" ON "task_financials"("task_id");

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_links" ADD CONSTRAINT "brand_links_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_links" ADD CONSTRAINT "brand_links_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordering_ids" ADD CONSTRAINT "ordering_ids_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordering_ids" ADD CONSTRAINT "ordering_ids_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_ordering_id_id_fkey" FOREIGN KEY ("ordering_id_id") REFERENCES "ordering_ids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_source_order_id_fkey" FOREIGN KEY ("source_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_co_partners" ADD CONSTRAINT "task_co_partners_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_co_partners" ADD CONSTRAINT "task_co_partners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_status_history" ADD CONSTRAINT "task_status_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_default_assignee_id_fkey" FOREIGN KEY ("default_assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_financials" ADD CONSTRAINT "task_financials_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_distributions" ADD CONSTRAINT "task_distributions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_distributions" ADD CONSTRAINT "task_distributions_participant_user_id_fkey" FOREIGN KEY ("participant_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_payments" ADD CONSTRAINT "distribution_payments_distribution_id_fkey" FOREIGN KEY ("distribution_id") REFERENCES "task_distributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_payments" ADD CONSTRAINT "distribution_payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_profiles" ADD CONSTRAINT "payment_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
