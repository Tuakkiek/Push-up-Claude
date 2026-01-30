// ============================================
// FILE: frontend/src/components/homepage/DynamicSection.jsx
// ✅ FIXED: Properly pass videos to modal
// ============================================

import React, { useState } from "react";
import { HeroBannerCarousel } from "@/components/shared/HeroBanner";
import SecondaryBanners from "@/components/shared/SecondaryBanners";
import PromoStrip from "@/components/shared/PromoStrip";
import DealsGridSection from "@/components/shared/DealsGridSection";
import MagicDealsSection from "@/components/shared/MagicDealsSection";
import IPhoneShowcase from "@/components/shared/iPhoneShowcase";
import CategoryNav from "./CategoryNav";
import ProductsSection from "./ProductsSection";
import ShortVideoSection from "./ShortVideoSection";
import ShortVideoPlayerModal from "./ShortVideoPlayerModal";

const DynamicSection = ({
  section,
  allProducts,
  isAdmin,
  onEdit,
  onDelete,
}) => {
  // ✅ FIX: State for video modal
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoInitialIndex, setVideoInitialIndex] = useState(0);
  const [currentVideos, setCurrentVideos] = useState([]);

  if (!section || !section.enabled) return null;

  const { type, config, title } = section;

  // ✅ FIX: Handler nhận cả videos array
  const handleVideoClick = (index, videos) => {
    console.log("🎬 Video clicked:", { index, videosCount: videos.length });
    setVideoInitialIndex(index);
    setCurrentVideos(videos);
    setVideoModalOpen(true);
  };

  switch (type) {
    // ============================================
    // HERO BANNER
    // ============================================
    case "hero":
      return (
        <HeroBannerCarousel
          banners={config.images?.map((img, i) => ({
            imageSrc: img,
            alt: `Banner ${i + 1}`,
            ctaLink: config.links?.[i] || "/",
          }))}
        />
      );

    // ============================================
    // SECONDARY BANNERS
    // ============================================
    case "secondary-banners":
      return (
        <SecondaryBanners
          banners={config.images?.map((img, i) => ({
            imageSrc: img,
            link: config.links?.[i] || "/",
            alt: `Secondary Banner ${i + 1}`,
          }))}
        />
      );

    // ============================================
    // PROMO STRIP
    // ============================================
    case "promo-strip":
      return <PromoStrip />;

    // ============================================
    // CATEGORY NAVIGATION
    // ============================================
    case "category-nav":
      return <CategoryNav allProducts={allProducts} />;

    // ============================================
    // SHORT VIDEOS (✅ FIXED)
    // ============================================
    case "short-videos":
      return (
        <>
          <ShortVideoSection
            title={title || "Video ngắn"}
            videoLimit={config.videoLimit || 6}
            videoType={config.videoType || "latest"}
            onVideoClick={handleVideoClick}
          />
          <ShortVideoPlayerModal
            open={videoModalOpen}
            onClose={() => setVideoModalOpen(false)}
            initialIndex={videoInitialIndex}
            videos={currentVideos}
          />
        </>
      );

    // ============================================
    // DEALS GRID
    // ============================================
    case "deals-grid":
      return (
        <DealsGridSection
          deals={config.dealImages?.map((img, i) => ({
            image: img,
            link: config.dealLinks?.[i] || "/products",
          }))}
        />
      );

    // ============================================
    // MAGIC DEALS
    // ============================================
    case "magic-deals":
      return <MagicDealsSection config={config} allProducts={allProducts} />;

    // ============================================
    // NEW PRODUCTS
    // ============================================
    case "products-new":
      const newProducts = [...allProducts]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, config.limit || 10);

      return (
        <ProductsSection
          title={title || "Sản phẩm mới"}
          products={newProducts}
          showBadges={true}
          badgeType="new"
          isAdmin={isAdmin}
          onEdit={onEdit}
          onDelete={onDelete}
          viewAllLink="/products?sort=createdAt"
        />
      );

    // ============================================
    // TOP SELLERS
    // ============================================
    case "products-topSeller":
      const topSellers = [...allProducts]
        .filter((p) => p.salesCount > 0)
        .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
        .slice(0, config.limit || 10);

      return (
        <ProductsSection
          title={title || "Sản phẩm bán chạy"}
          products={topSellers}
          showBadges={true}
          badgeType="seller"
          isAdmin={isAdmin}
          onEdit={onEdit}
          onDelete={onDelete}
          viewAllLink="/products?sort=salesCount"
        />
      );

    // ============================================
    // CATEGORY SECTION
    // ============================================
    case "category-section":
      const categoryProducts = allProducts
        .filter((p) => {
           // Handle populated category object or direct ID string
           const pCatId = p.category?._id || p.category;
           const pCatSlug = p.category?.slug;
           const filter = config.categoryFilter;
           
           return pCatId === filter || pCatSlug === filter;
        })
        .slice(0, config.limit || 10);

      return (
        <ProductsSection
          title={title || config.categoryFilter}
          products={categoryProducts}
          showBadges={false}
          allProducts={allProducts}
          category={config.categoryFilter}
          isAdmin={isAdmin}
          onEdit={onEdit}
          onDelete={onDelete}
          viewAllLink={`/products?category=${config.categoryFilter}`}
        />
      );

    // ============================================
    // IPHONE SHOWCASE
    // ============================================
    case "iphone-showcase":
      return <IPhoneShowcase items={config.showcaseItems} />;

    // ============================================
    // DEFAULT
    // ============================================
    default:
      console.warn(`Unknown section type: ${type}`);
      return null;
  }
};

export default DynamicSection;
