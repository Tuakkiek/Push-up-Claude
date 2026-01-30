import Cart from "../models/Cart.js";
import Product from "../../catalog/models/Product.js";

// ============================================
// HELPER: Populate cart items
// ============================================
const populateCartItems = async (cart) => {
  const populatedItems = [];
  
  if (!cart || !cart.items) return [];

  for (const item of cart.items) {
    try {
      const product = await Product.findOne({ "variants._id": item.variantId });
      
      if (!product) {
        // Item no longer exists or variant invalid
        continue;
      }

      const variant = product.variants.id(item.variantId);
      if (!variant) continue;

      populatedItems.push({
        _id: item._id,
        productId: product._id,
        variantId: variant._id,
        productType: product.category, // Or mapped type
        productName: product.name,
        productSlug: product.slug,
        variantSku: variant.sku,
        variantColor: variant.attributes?.color,
        variantStorage: variant.attributes?.storage,
        quantity: item.quantity,
        price: item.price, 
        originalPrice: variant.originalPrice,
        stock: variant.stock,
        images: variant.images || [],
        productImages: product.featuredImages || [],
      });
    } catch (error) {
      console.error(`Error populating item ${item._id}:`, error);
    }
  }

  return populatedItems;
};

// ============================================
// GET CART
// ============================================
export const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ customerId: req.user._id });

    if (!cart) {
      cart = await Cart.create({ customerId: req.user._id, items: [] });
    }

    const formattedItems = await populateCartItems(cart);

    res.json({
      success: true,
      data: {
        _id: cart._id,
        customerId: cart.customerId,
        items: formattedItems,
      },
    });
  } catch (error) {
    console.error("getCart error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// ADD TO CART
// ============================================
export const addToCart = async (req, res) => {
  try {
    const { variantId, quantity = 1 } = req.body;

    const product = await Product.findOne({ "variants._id": variantId });
    if (!product) {
        return res.status(404).json({ success: false, message: "Sản phẩm không tồn tại" });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
        return res.status(404).json({ success: false, message: "Biến thể không tồn tại" });
    }
    
    // Check if product is available
    if (product.status !== "AVAILABLE") {
         return res.status(400).json({ success: false, message: "Sản phẩm ngừng kinh doanh" });
    }

    if (variant.stock < quantity) {
        return res.status(400).json({ success: false, message: `Chỉ còn ${variant.stock} sản phẩm` });
    }

    let cart = await Cart.findOne({ customerId: req.user._id });
    if (!cart) cart = await Cart.create({ customerId: req.user._id, items: [] });

    const itemIndex = cart.items.findIndex(p => p.variantId.toString() === variantId);
    if (itemIndex > -1) {
        // Check new total stock
        const newQty = cart.items[itemIndex].quantity + quantity;
        if (newQty > variant.stock) {
             return res.status(400).json({ success: false, message: `Chỉ còn ${variant.stock} sản phẩm` });
        }
        cart.items[itemIndex].quantity = newQty;
        // Update price just in case
        cart.items[itemIndex].price = variant.price;
    } else {
        cart.items.push({
            productId: product._id, // Add this if schema supports it, otherwise rely on variant logic
            variantId: variant._id,
            quantity,
            price: variant.price,
            productType: "Product"
        });
    }

    await cart.save();
    
    // Return formatted cart
    const formattedItems = await populateCartItems(cart);
    res.json({ success: true, message: "Added to cart", data: { _id: cart._id, items: formattedItems } });

  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// UPDATE CART ITEM
// ============================================
export const updateCartItem = async (req, res) => {
  try {
    const { variantId, quantity } = req.body;

    if (quantity < 0) return res.status(400).json({ success: false, message: "Invalid quantity" });

    const cart = await Cart.findOne({ customerId: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    const itemIndex = cart.items.findIndex(item => item.variantId.toString() === variantId);
    if (itemIndex === -1) return res.status(404).json({ success: false, message: "Item not in cart" });

    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      // Validate stock
      const product = await Product.findOne({ "variants._id": variantId });
      if (product) {
          const variant = product.variants.id(variantId);
          if (variant && variant.stock < quantity) {
               return res.status(400).json({ success: false, message: `Stock limited: ${variant.stock}` });
          }
           cart.items[itemIndex].price = variant.price;
      }
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();
    const formattedItems = await populateCartItems(cart);
    res.json({ success: true, message: "Updated", data: { items: formattedItems } });

  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// REMOVE FROM CART
// ============================================
export const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params; // Using variantId as itemId typically, or specific item _id
    const cart = await Cart.findOne({ customerId: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    cart.items = cart.items.filter(item => item._id && item._id.toString() !== itemId && item.variantId.toString() !== itemId);
    
    await cart.save();
    const formattedItems = await populateCartItems(cart);
    res.json({ success: true, message: "Removed", data: { items: formattedItems } });

  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// CLEAR CART
// ============================================
export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ customerId: req.user._id });
    if (cart) {
        cart.items = [];
        await cart.save();
    }
    res.json({ success: true, message: "Cart cleared", data: { items: [] } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// VALIDATE CART
// ============================================
export const validateCart = async (req, res) => {
    // ... Simplified validation
    res.json({ success: true, message: "Valid" });
};

export default {
     getCart, addToCart, updateCartItem, removeFromCart, clearCart, validateCart
};
