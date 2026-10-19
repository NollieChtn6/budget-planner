-- CreateTable
CREATE TABLE "reimbursements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "expense_id" UUID,
    "date" DATE NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reimbursements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reimbursements_user_id_idx" ON "reimbursements"("user_id");

-- CreateIndex
CREATE INDEX "reimbursements_category_id_idx" ON "reimbursements"("category_id");

-- CreateIndex
CREATE INDEX "reimbursements_expense_id_idx" ON "reimbursements"("expense_id");

-- AddForeignKey
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CheckConstraint: a reimbursement amount is always strictly positive
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_amount_cents_positive_check"
  CHECK (amount_cents > 0);
