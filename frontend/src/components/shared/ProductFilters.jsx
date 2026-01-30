// frontend/src/components/shared/ProductFilters.jsx

import React from "react";
import { ChevronDown, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const ProductFilters = ({
  filters,
  onFilterChange,
  priceRange,
  onPriceChange,
  activeFiltersCount,
  onClearFilters,
  currentCategory, // Category Object
  // hideCategory, // Is this needed?
  // isCategoryPage, // Is this needed?
  // onCategoryChange, // Handler if category switching is allowed
}) => {
  
  // Extract dynamic filters from schema or config
  // Ideally, currentCategory.specSchema and currentCategory.variantSchema define what's possible.
  // For simplicity, we can inspect unique values from the products if we had them, OR use schema options.
  
  // Filterable fields derivation:
  // 1. Variant attributes (Storage, Color, Connectivity, RAM, etc.)
  // 2. Spec attributes (Screen Size, etc - usually hard to filter unless discrete options)
  
  // Let's assume schema has 'options' for select fields, we can use those as filters.
  
  const generateFilterSections = () => {
    if (!currentCategory) return [];
    
    const sections = [];
    
    // 1. Variants Schema
    if (currentCategory.variantSchema) {
        Object.entries(currentCategory.variantSchema).forEach(([key, field]) => {
            if (field.type === 'select' && field.options?.length > 0) {
                sections.push({
                    id: key,
                    label: field.label,
                    options: field.options
                });
            }
        });
    }
    
    // 2. Specs Schema (if marked filterable or just all selects?)
    // Let's include Selects from Specs too
    if (currentCategory.specSchema) {
        Object.entries(currentCategory.specSchema).forEach(([key, field]) => {
             // Only filter meaningful fields (avoid huge lists if generic)
             // For now, let's filter if it has 'options' which means it's a constrained choice
            if (field.type === 'select' && field.options?.length > 0) {
                sections.push({
                    id: key,
                    label: field.label,
                    options: field.options
                });
            }
        });
    }
    
    return sections;
  };

  const filterSections = generateFilterSections();

  // Price Presets
//   const pricePresets = [
//     { label: "Dưới 10 triệu", min: 0, max: 10000000 },
//     { label: "10 - 20 triệu", min: 10000000, max: 20000000 },
//     { label: "20 - 30 triệu", min: 20000000, max: 30000000 },
//     { label: "Trên 30 triệu", min: 30000000, max: null },
//   ];

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">Bộ lọc tìm kiếm</h3>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-red-500 hover:bg-red-50 h-8 px-2"
          >
            Xóa tất cả
          </Button>
        )}
      </div>

      <Accordion type="multiple" defaultValue={['price', ...filterSections.map(s => s.id)]} className="w-full">
        {/* PRICE FILTER */}
        <AccordionItem value="price">
          <AccordionTrigger className="text-base font-semibold py-3 hover:no-underline">
            Khoảng giá
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <div className="space-y-4">
              {/* Slider removed for simplicity or can be added back */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    ₫
                  </span>
                  <input
                    type="number"
                    value={priceRange.min}
                    onChange={(e) =>
                      onPriceChange({ ...priceRange, min: e.target.value })
                    }
                    placeholder="Tối thiểu"
                    className="w-full pl-6 pr-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <span className="text-gray-400">-</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    ₫
                  </span>
                  <input
                    type="number"
                    value={priceRange.max}
                    onChange={(e) =>
                      onPriceChange({ ...priceRange, max: e.target.value })
                    }
                    placeholder="Tối đa"
                    className="w-full pl-6 pr-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* DYNAMIC FILTERS */}
        {filterSections.map((section) => (
          <AccordionItem key={section.id} value={section.id}>
            <AccordionTrigger className="text-base font-semibold py-3 hover:no-underline">
              {section.label}
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <div className="space-y-2">
                {section.options.map((option) => {
                  const isSelected = filters[section.id]?.includes(option);
                  return (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${section.id}-${option}`}
                        checked={isSelected}
                        onCheckedChange={() => onFilterChange(section.id, option)}
                      />
                      <Label
                        htmlFor={`${section.id}-${option}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {option}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default ProductFilters;
