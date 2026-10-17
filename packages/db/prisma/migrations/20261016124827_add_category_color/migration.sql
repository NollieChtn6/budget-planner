-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "color" TEXT NOT NULL;

-- CheckConstraint: a category color is always a #RRGGBB hex code
ALTER TABLE "categories" ADD CONSTRAINT "categories_color_format_check"
  CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
