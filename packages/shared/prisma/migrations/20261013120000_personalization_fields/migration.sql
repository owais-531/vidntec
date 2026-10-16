-- Generic, admin-defined personalization fields. Purely additive: new columns
-- with defaults, plus a backfill that converts the old fixed name/colour model.
-- The legacy columns are left in place (now unused) and can be dropped later.

-- AlterTable
ALTER TABLE "products" ADD COLUMN "personalizationFields" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "cart_items"
  ADD COLUMN "personalization" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "customizationKey" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN "personalization" JSONB NOT NULL DEFAULT '[]';

-- DropIndex / CreateIndex (cart line lookup now includes the personalization key)
DROP INDEX "cart_items_cartId_variantId_idx";
CREATE INDEX "cart_items_cartId_variantId_customizationKey_idx" ON "cart_items"("cartId", "variantId", "customizationKey");

-- Backfill: products with the old name / colour switches get equivalent fields
UPDATE "products"
SET "personalizationFields" =
  (CASE WHEN "customizationNameEnabled"
    THEN jsonb_build_array(jsonb_build_object(
      'id', 'name', 'type', 'text', 'label', 'Name',
      'required', true, 'placeholder', '', 'maxLength', 40))
    ELSE '[]'::jsonb END)
  ||
  (CASE WHEN "customizationColorEnabled"
    THEN jsonb_build_array(jsonb_build_object(
      'id', 'colour', 'type', 'dropdown', 'label', 'Colour',
      'required', true, 'choices', "customizationColorOptions"))
    ELSE '[]'::jsonb END)
WHERE "customizationNameEnabled" OR "customizationColorEnabled";

-- Backfill: existing cart lines
UPDATE "cart_items"
SET "personalization" =
  (CASE WHEN "customName" IS NOT NULL
    THEN jsonb_build_array(jsonb_build_object(
      'fieldId', 'name', 'label', 'Name', 'type', 'text', 'value', "customName"))
    ELSE '[]'::jsonb END)
  ||
  (CASE WHEN "customColorLabel" IS NOT NULL
    THEN jsonb_build_array(jsonb_build_object(
      'fieldId', 'colour', 'label', 'Colour', 'type', 'dropdown',
      'value', "customColorLabel", 'hex', "customColorHex"))
    ELSE '[]'::jsonb END),
  "customizationKey" = '[' || concat_ws(',',
    CASE WHEN "customName" IS NOT NULL
      THEN '["name",' || to_json("customName")::text || ']' END,
    CASE WHEN "customColorLabel" IS NOT NULL
      THEN '["colour",' || to_json("customColorLabel")::text || ']' END
  ) || ']'
WHERE "customName" IS NOT NULL OR "customColorLabel" IS NOT NULL;

-- Backfill: existing order lines
UPDATE "order_items"
SET "personalization" =
  (CASE WHEN "customNameSnapshot" IS NOT NULL
    THEN jsonb_build_array(jsonb_build_object(
      'fieldId', 'name', 'label', 'Name', 'type', 'text', 'value', "customNameSnapshot"))
    ELSE '[]'::jsonb END)
  ||
  (CASE WHEN "customColorLabelSnapshot" IS NOT NULL
    THEN jsonb_build_array(jsonb_build_object(
      'fieldId', 'colour', 'label', 'Colour', 'type', 'dropdown',
      'value', "customColorLabelSnapshot", 'hex', "customColorHexSnapshot"))
    ELSE '[]'::jsonb END)
WHERE "customNameSnapshot" IS NOT NULL OR "customColorLabelSnapshot" IS NOT NULL;
