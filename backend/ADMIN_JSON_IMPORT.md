## Admin JSON / CSV Product Import

### 1. Prerequisites

- Ensure the backend server is running on the configured `VITE_API_URL` (default `/api`).
- Seed canonical categories (including Smartphone) using the existing seed script if necessary.

### 2. JSON Flow (Admin)

1. Open the Warehouse `Products` page in the admin UI.
2. Choose **JSON** in the "Chọn kiểu thêm" dropdown and click **Thêm sản phẩm**.
3. In the `JsonProductCreator` dialog:
   - Select a **Category**.
   - Click **Load Sample** to generate a valid JSON payload based on that Category schema.
   - Optionally edit the JSON (name, specs, variants, etc.).
4. Click **Verify JSON**:
   - This calls `POST /api/products/validate`.
   - Field-level errors and unknown keys are returned and shown in the panel under the editor.
   - Fix issues until the payload is reported as valid.
5. Click **Create Product**:
   - This calls `POST /api/products`.
   - On success, the product list auto-refreshes and a success toast is shown.

### 3. CSV Flow (Admin)

1. Prepare a CSV based on `backend/samples/iphone17pro_template.csv`.
   - Each row represents **one variant** (with its own `storage`, `color`, `price`, `originalPrice`, `stock`, `sku`).
   - Repeat base columns (`name`, `model`, `brand`, etc.) per row, or configure UI defaults.
2. In the Warehouse `Products` page:
   - Choose **CSV** mode and click **Thêm sản phẩm**.
   - Upload the CSV in the `CSVImporter` component.
3. The importer:
   - Parses rows with PapaParse.
   - Groups rows into payloads matching the product create API.
   - (Planned) calls `POST /api/products/validate` for a dry-run and shows an error report.
   - Calls `POST /api/products` for each valid product.
4. Check the result section for:
   - Number of successful imports.
   - List of failed products with error messages.

### 4. Manual Form Flow

1. Open **Admin → Products Editor** or the Warehouse `Products` page with **Bình thường** or **Chi tiết** mode.
2. Select a **Category**; the UI will:
   - Render **Specifications** from `Category.specSchema`.
   - Render **Variants** from `Category.variantSchema` using `UnifiedVariantsForm`.
3. Fill:
   - **Basic Info** (name, model, brand, status, condition).
   - **Media** (featured images, video URL).
   - **Specifications** (all required fields; optional fields as needed).
   - **Variants**:
     - Add color groups.
     - For each group, add one or more options (price, originalPrice, stock, plus dynamic fields defined in variant schema).
4. Save:
   - The form is cleaned and normalized in `useProductAPI`.
   - The backend validates and creates the product and embedded variants.

### 5. Manual Verification

1. Use `backend/test_product_api.js` or a REST client:
   - Call `GET /api/categories` and confirm canonical categories exist.
2. Use the JSON creator:
   - Load a Smartphone sample.
   - Validate, then create.
3. Confirm new product:
   - In Admin product list (Warehouse → Products).
   - In MongoDB shell:
     - `db.products.findOne({ _id: ObjectId("<PRODUCT_ID_FROM_RESPONSE>") })`.

