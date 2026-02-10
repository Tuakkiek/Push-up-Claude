# Frontend Migration Guide: Old APIs → Unified API

## 📋 Overview

This guide shows how to update your frontend code from category-specific APIs to the new unified API.

---

## 🔄 Step-by-Step Migration

### Step 1: Wrap App with ProductTypeProvider

**File**: `frontend/src/main.jsx` or `frontend/src/App.jsx`

```javascript
// Before
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// After
import App from './App';
import { ProductTypeProvider } from './contexts/ProductTypeContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ProductTypeProvider>
      <App />
    </ProductTypeProvider>
  </React.StrictMode>
);
```

---

### Step 2: Replace Hard-Coded CATEGORIES

**Before** (`frontend/src/constants/index.js`):
```javascript
export const CATEGORIES = [
  "iPhone",
  "iPad",
  "Mac",
  "AirPods",
  "Apple Watch",
  "Accessory"
];
```

**After**: Use `useProductTypes` hook
```javascript
import { useProductTypes } from '../hooks/useProductTypes';

function MyComponent() {
  const { productTypes, loading } = useProductTypes();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {productTypes.map(type => (
        <div key={type._id}>{type.name}</div>
      ))}
    </div>
  );
}
```

---

### Step 3: Replace Category-Specific API Calls

#### Example 1: Get Products by Category

**Before** (`ProductList.jsx`):
```javascript
import { getAllIPhones } from '../services/iPhoneAPI';
import { getAllIPads } from '../services/iPadAPI';

const fetchProducts = async (category) => {
  switch (category) {
    case "iPhone":
      return await getAllIPhones();
    case "iPad":
      return await getAllIPads();
    // ... more cases
  }
};
```

**After**:
```javascript
import { getProductsByType } from '../services/unifiedProductAPI';

const fetchProducts = async (typeSlug) => {
  return await getProductsByType(typeSlug);
};
```

#### Example 2: Get Product Detail

**Before**:
```javascript
import { getIPhoneBySlug } from '../services/iPhoneAPI';
import { getIPadBySlug } from '../services/iPadAPI';

const fetchProduct = async (category, slug) => {
  switch (category) {
    case "iPhone":
      return await getIPhoneBySlug(slug);
    case "iPad":
      return await getIPadBySlug(slug);
    // ... more cases
  }
};
```

**After**:
```javascript
import { getProductBySlug } from '../services/unifiedProductAPI';

const fetchProduct = async (slug) => {
  const data = await getProductBySlug(slug);
  return data.product;
};
```

#### Example 3: Create Product

**Before**:
```javascript
import { createIPhone } from '../services/iPhoneAPI';
import { createIPad } from '../services/iPadAPI';

const handleCreate = async (category, productData) => {
  switch (category) {
    case "iPhone":
      return await createIPhone(productData);
    case "iPad":
      return await createIPad(productData);
    // ... more cases
  }
};
```

**After**:
```javascript
import { createProduct } from '../services/unifiedProductAPI';

const handleCreate = async (productData) => {
  // productData must include productTypeId
  return await createProduct(productData);
};
```

---

### Step 4: Update Category Selector

**Before** (`CategorySelector.jsx`):
```javascript
import { CATEGORIES } from '../constants';

function CategorySelector({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {CATEGORIES.map(category => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
}
```

**After**:
```javascript
import { useProductTypes } from '../hooks/useProductTypes';

function ProductTypeSelector({ value, onChange }) {
  const { productTypes, loading } = useProductTypes();

  if (loading) return <div>Loading...</div>;

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All Types</option>
      {productTypes.map(type => (
        <option key={type._id} value={type.slug}>
          {type.name}
        </option>
      ))}
    </select>
  );
}
```

---

### Step 5: Update Product Card Component

**Before** (`ProductCard.jsx`):
```javascript
function ProductCard({ product, category }) {
  // Hard-coded category logic
  const getCategoryIcon = (cat) => {
    switch (cat) {
      case "iPhone": return "📱";
      case "iPad": return "💻";
      // ...
    }
  };

  return (
    <div>
      <span>{getCategoryIcon(category)}</span>
      <h3>{product.name}</h3>
    </div>
  );
}
```

**After**:
```javascript
import { useProductTypes } from '../hooks/useProductTypes';

function ProductCard({ product }) {
  const { getIcon, getDisplayName } = useProductTypes();

  // Product has productTypeId populated
  const icon = getIcon(product.productTypeId?.slug);
  const typeName = getDisplayName(product.productTypeId?.slug);

  return (
    <div>
      {icon && <span>{icon}</span>}
      <span>{typeName}</span>
      <h3>{product.name}</h3>
    </div>
  );
}
```

---

### Step 6: Update Routes

**Before** (`routes.jsx`):
```javascript
<Route path="/iphones" element={<IPhonePage />} />
<Route path="/ipads" element={<IPadPage />} />
<Route path="/macs" element={<MacPage />} />
// ... 3 more routes
```

**After**:
```javascript
<Route path="/products/:typeSlug" element={<ProductListPage />} />
```

**ProductListPage.jsx**:
```javascript
import { useParams } from 'react-router-dom';
import { useProductTypes } from '../hooks/useProductTypes';
import { getProductsByType } from '../services/unifiedProductAPI';

function ProductListPage() {
  const { typeSlug } = useParams();
  const { getProductTypeBySlug } = useProductTypes();
  const [products, setProducts] = useState([]);

  const productType = getProductTypeBySlug(typeSlug);

  useEffect(() => {
    const fetchProducts = async () => {
      const data = await getProductsByType(typeSlug);
      setProducts(data.products);
    };
    fetchProducts();
  }, [typeSlug]);

  return (
    <div>
      <h1>{productType?.name || 'Products'}</h1>
      {products.map(product => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
```

---

### Step 7: Update Navigation

**Before** (`Navigation.jsx`):
```javascript
import { CATEGORIES } from '../constants';

function Navigation() {
  return (
    <nav>
      {CATEGORIES.map(category => (
        <Link to={`/${category.toLowerCase()}`} key={category}>
          {category}
        </Link>
      ))}
    </nav>
  );
}
```

**After**:
```javascript
import { useProductTypes } from '../hooks/useProductTypes';

function Navigation() {
  const { productTypes, loading } = useProductTypes();

  if (loading) return <div>Loading...</div>;

  return (
    <nav>
      {productTypes.map(type => (
        <Link to={`/products/${type.slug}`} key={type._id}>
          {type.name}
        </Link>
      ))}
    </nav>
  );
}
```

---

### Step 8: Update Admin Forms

**Before** (`ProductForm.jsx`):
```javascript
import { CATEGORIES } from '../constants';

function ProductForm() {
  const [category, setCategory] = useState("iPhone");

  return (
    <select value={category} onChange={(e) => setCategory(e.target.value)}>
      {CATEGORIES.map(cat => (
        <option key={cat} value={cat}>{cat}</option>
      ))}
    </select>
  );
}
```

**After**:
```javascript
import { useProductTypes } from '../hooks/useProductTypes';

function ProductForm() {
  const { productTypes } = useProductTypes();
  const [productTypeId, setProductTypeId] = useState("");

  return (
    <select value={productTypeId} onChange={(e) => setProductTypeId(e.target.value)}>
      <option value="">Select Product Type</option>
      {productTypes.map(type => (
        <option key={type._id} value={type._id}>
          {type.name}
        </option>
      ))}
    </select>
  );
}
```

---

## 📊 Complete API Mapping

| Old API | New API | Notes |
|---------|---------|-------|
| `getAllIPhones()` | `getProductsByType('iphone')` | Pass type slug |
| `getIPhoneBySlug(slug)` | `getProductBySlug(slug)` | Works for all types |
| `createIPhone(data)` | `createProduct(data)` | Include `productTypeId` |
| `updateIPhone(id, data)` | `updateProduct(id, data)` | Same for all types |
| `deleteIPhone(id)` | `deleteProduct(id)` | Same for all types |
| `getAllIPads()` | `getProductsByType('ipad')` | Pass type slug |
| `getMacBySlug(slug)` | `getProductBySlug(slug)` | Works for all types |

---

## 🔧 Utility Conversions

### Get Product Type ID from Slug

```javascript
const { getProductTypeBySlug } = useProductTypes();

const typeSlug = "iphone";
const productType = getProductTypeBySlug(typeSlug);
const productTypeId = productType?._id;
```

### Get Specification Fields

```javascript
const { getSpecificationFields } = useProductTypes();

const fields = getSpecificationFields("iphone");
// Returns: [{ name: "chip", label: "Chip", type: "text", ... }]
```

### Check if Type Exists

```javascript
const { productTypeExists } = useProductTypes();

if (productTypeExists("iphone")) {
  // Type exists
}
```

---

## ✅ Migration Checklist

- [ ] Wrap app with `ProductTypeProvider`
- [ ] Replace `CATEGORIES` constant with `useProductTypes` hook
- [ ] Update all API imports to use `unifiedProductAPI`
- [ ] Replace category switches with unified API calls
- [ ] Update category selectors to product type selectors
- [ ] Update routes from `/iphones` to `/products/:typeSlug`
- [ ] Update navigation links
- [ ] Update product cards to use `productTypeId`
- [ ] Update admin forms to use `productTypeId`
- [ ] Test all product CRUD operations
- [ ] Test all product listings
- [ ] Test product detail pages
- [ ] Remove old API service files (after verification)

---

## 🐛 Common Issues

### Issue 1: "productTypes is undefined"
**Cause**: Component not wrapped in `ProductTypeProvider`
**Solution**: Wrap your app with the provider in `main.jsx`

### Issue 2: "Product has no productTypeId"
**Cause**: Using old products not yet migrated
**Solution**: Run migration script (Step 5) or create new products with `productTypeId`

### Issue 3: Category-based URLs not working
**Cause**: Old routes still active
**Solution**: Update routes to use `/products/:typeSlug` pattern

### Issue 4: Specification fields not showing
**Cause**: ProductType not loaded or wrong slug
**Solution**: Check that productTypeId is populated in product data

---

## 🎯 Best Practices

1. **Always check loading state**:
```javascript
const { productTypes, loading } = useProductTypes();
if (loading) return <Spinner />;
```

2. **Use memoization for expensive computations**:
```javascript
const productTypeMap = useMemo(() => {
  return productTypes.reduce((map, type) => {
    map[type.slug] = type;
    return map;
  }, {});
}, [productTypes]);
```

3. **Handle errors gracefully**:
```javascript
const { error } = useProductTypes();
if (error) return <ErrorMessage message={error} />;
```

4. **Cache product types**:
Product types are automatically cached in localStorage and refreshed every 5 minutes.

---

## 🚀 Testing Strategy

1. **Test each product type separately**:
   - Create products for each type
   - View product listings
   - View product details
   - Update products
   - Delete products

2. **Test navigation**:
   - Click through all product type links
   - Verify URLs are correct
   - Verify correct products load

3. **Test admin features**:
   - Create new products
   - Update existing products
   - Verify specification fields render correctly

4. **Test edge cases**:
   - No product types available
   - Loading states
   - Error states
   - Empty product listings

---

## ✨ Example: Complete Component Migration

**Before**:
```javascript
import { useState, useEffect } from 'react';
import { getAllIPhones } from '../services/iPhoneAPI';
import { CATEGORIES } from '../constants';

function IPhoneList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getAllIPhones();
        setProducts(data);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div>
      <h1>iPhone Products</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {products.map(product => (
            <div key={product._id}>{product.name}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**After**:
```javascript
import { useState, useEffect } from 'react';
import { getProductsByType } from '../services/unifiedProductAPI';
import { useProductTypes } from '../hooks/useProductTypes';

function ProductList({ typeSlug = 'iphone' }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getDisplayName } = useProductTypes();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getProductsByType(typeSlug);
        setProducts(data.products);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [typeSlug]);

  return (
    <div>
      <h1>{getDisplayName(typeSlug)} Products</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {products.map(product => (
            <div key={product._id}>{product.name}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Benefits**:
- ✅ Works for ANY product type (not just iPhone)
- ✅ No hard-coded category logic
- ✅ Dynamic product type name
- ✅ Single component for all types
- ✅ Easy to extend to new types

---

## 📝 Summary

The migration process involves:
1. Adding ProductTypeProvider
2. Replacing hard-coded constants with dynamic data
3. Switching from category-specific APIs to unified API
4. Updating routes and navigation
5. Testing thoroughly

**Result**: Frontend that works with ANY product type without code changes! 🎉
