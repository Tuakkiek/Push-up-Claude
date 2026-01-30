// ============================================
// FILE: backend/src/controllers/reviewController.js
// ✅ UPDATED: Unified Product Model Support
// ============================================

import Review from "../models/Review.js";
import Order from "../../sales/models/Order.js";
import Product from "../models/Product.js";

const MAX_REVIEWS_PER_ORDER = 20;

// Helper: Find product and update rating
const findProductAndUpdateRating = async (productId) => {
  // ✅ REFACTORED: Use Unified Product Model
  const product = await Product.findById(productId);
  if (product) {
    const reviews = await Review.find({ productId, isHidden: false });

    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
      product.averageRating = Math.round((sum / reviews.length) * 10) / 10;
      product.totalReviews = reviews.length;
    } else {
      product.averageRating = 0;
      product.totalReviews = 0;
    }

    await product.save();
    return product;
  }
  return null;
};

// ============================================
// CHECK IF USER CAN REVIEW
// ============================================
export const canReviewProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const customerId = req.user._id;

    // Find delivered orders containing the product
    const orders = await Order.find({
      customerId,
      status: "DELIVERED",
      "items.productId": productId,
    }).select("_id orderNumber createdAt");

    if (orders.length === 0) {
      return res.json({
        success: true,
        data: {
          canReview: false,
          reason: "Bạn cần mua sản phẩm để đánh giá",
          orders: [],
        },
      });
    }

    // Count reviews per order
    const orderReviewCounts = await Promise.all(
      orders.map(async (order) => {
        const reviewCount = await Review.countDocuments({
          productId,
          customerId,
          orderId: order._id,
        });

        return {
          _id: order._id,
          orderNumber: order.orderNumber,
          createdAt: order.createdAt,
          reviewCount,
          canReview: reviewCount < MAX_REVIEWS_PER_ORDER,
          remainingReviews: MAX_REVIEWS_PER_ORDER - reviewCount,
        };
      })
    );

    const existingReviews = await Review.find({
      productId,
      customerId,
    })
      .select("_id orderId rating comment createdAt")
      .populate("orderId", "orderNumber")
      .sort({ createdAt: -1 });

    const availableOrders = orderReviewCounts.filter((o) => o.canReview);
    const totalReviews = existingReviews.length;
    const maxPossibleReviews = orders.length * MAX_REVIEWS_PER_ORDER;

    res.json({
      success: true,
      data: {
        canReview: availableOrders.length > 0,
        orders: availableOrders.map((o) => ({
          _id: o._id,
          orderNumber: o.orderNumber,
          reviewCount: o.reviewCount,
          remainingReviews: o.remainingReviews,
        })),
        orderReviewCounts,
        existingReviews: existingReviews.map((r) => ({
          _id: r._id,
          orderId: r.orderId._id,
          orderNumber: r.orderId.orderNumber,
          rating: r.rating,
          comment: r.comment.substring(0, 100),
          createdAt: r.createdAt,
        })),
        stats: {
          totalOrders: orders.length,
          totalReviews,
          maxPossibleReviews,
          availableSlots: maxPossibleReviews - totalReviews,
        },
      },
    });
  } catch (error) {
    console.error("❌ canReviewProduct error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// GET PRODUCT REVIEWS
// ============================================
export const getProductReviews = async (req, res) => {
  try {
    const { hasImages } = req.query;
    const query = { productId: req.params.productId };

    if (!req.user || req.user.role !== "ADMIN") {
      query.isHidden = false;
    }

    if (hasImages === "true") {
      query.images = { $exists: true, $not: { $size: 0 } };
    }

    const reviews = await Review.find(query)
      .populate("customerId", "fullName avatar")
      .populate("adminReply.adminId", "fullName role avatar")
      .populate("orderId", "orderNumber")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { reviews } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// CREATE REVIEW
// ============================================
export const createReview = async (req, res) => {
  try {
    const { productId, orderId, rating, comment, images, productModel } =
      req.body;
    const customerId = req.user._id;

    // Verify Order
    const order = await Order.findOne({
      _id: orderId,
      customerId,
      status: "DELIVERED",
      "items.productId": productId,
    });

    if (!order) {
      return res.status(403).json({
        success: false,
        message: "Bạn cần mua và nhận sản phẩm trước khi đánh giá",
      });
    }

    // Check review count limit
    const reviewCount = await Review.countDocuments({
      productId,
      customerId,
      orderId,
    });

    if (reviewCount >= MAX_REVIEWS_PER_ORDER) {
      return res.status(400).json({
        success: false,
        message: `Bạn đã đánh giá đơn hàng này ${MAX_REVIEWS_PER_ORDER} lần rồi.`,
      });
    }

    const validImages = Array.isArray(images)
      ? images.filter(Boolean).slice(0, 5)
      : [];

    const review = await Review.create({
      productId,
      productModel, // This might be redundant or can be just "Product" now
      customerId,
      orderId,
      rating,
      comment,
      images: validImages,
      purchaseVerified: true,
      verified: true,
    });

    await findProductAndUpdateRating(productId);

    const newReviewCount = await Review.countDocuments({
      productId,
      customerId,
      orderId,
    });

    res.status(201).json({
      success: true,
      message: "Đánh giá sản phẩm thành công",
      data: {
        review,
        reviewCount: newReviewCount,
        remainingReviews: MAX_REVIEWS_PER_ORDER - newReviewCount,
      },
    });
  } catch (error) {
    console.error("❌ Create review error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// UPDATE REVIEW
// ============================================
export const updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    if (review.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { rating, comment, images } = req.body;
    review.rating = rating;
    review.comment = comment;

    if (images !== undefined) {
      const validImages = Array.isArray(images)
        ? images.filter(Boolean).slice(0, 5)
        : [];
      review.images = validImages;
    }

    await review.save();
    await findProductAndUpdateRating(review.productId);

    res.json({ success: true, message: "Updated successfully", data: { review } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// DELETE REVIEW
// ============================================
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    if (review.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const productId = review.productId;
    await review.deleteOne();
    await findProductAndUpdateRating(productId);

    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// LIKE/UNLIKE REVIEW
// ============================================
export const likeReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    const userId = req.user._id;
    const hasLiked = review.likedBy.some((id) => id.toString() === userId.toString());

    if (hasLiked) {
      review.likedBy = review.likedBy.filter((id) => id.toString() !== userId.toString());
      review.helpful = Math.max(0, review.helpful - 1);
    } else {
      review.likedBy.push(userId);
      review.helpful += 1;
    }

    await review.save();

    res.json({
      success: true,
      message: hasLiked ? "Unliked" : "Liked",
      data: { review, hasLiked: !hasLiked, helpful: review.helpful },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// ADMIN ACTIONS
// ============================================
export const replyToReview = async (req, res) => {
  try {
    const { content } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Content required" });
    }

    review.adminReply = {
      content: content.trim(),
      adminId: req.user._id,
      repliedAt: new Date(),
    };

    await review.save();
    await review.populate("adminReply.adminId", "fullName role avatar");

    res.json({ success: true, message: "Replied", data: { review } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateAdminReply = async (req, res) => {
  try {
    const { content } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    if (!review.adminReply?.content) return res.status(400).json({ success: false, message: "No reply to edit" });
    if (!content || !content.trim()) return res.status(400).json({ success: false, message: "Content required" });

    review.adminReply.content = content.trim();
    review.adminReply.repliedAt = new Date();

    await review.save();
    await review.populate("adminReply.adminId", "fullName role avatar");

    res.json({ success: true, message: "Updated reply", data: { review } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const toggleReviewVisibility = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    review.isHidden = !review.isHidden;
    await review.save();

    res.json({ success: true, message: review.isHidden ? "Hidden" : "Visible", data: { review } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export default {
  canReviewProduct,
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  likeReview,
  replyToReview,
  updateAdminReply,
  toggleReviewVisibility,
};
