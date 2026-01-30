// frontend/src/components/shared/specs/UnifiedSpecsForm.jsx

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Form specifications chung, render dựa trên schema của Category
 * @param {array} schema - category.specSchema (array of field definitions)
 * @param {object} specs - values hiện tại
 * @param {function} onChange - handler change (key, value)
 */

const UnifiedSpecsForm = ({ schema, specs, onChange, onColorChange, onAddColor, onRemoveColor }) => {
  const colors = specs.colors || [''];

  // Nếu không có schema, hiển thị fallback
  if (!schema || !Array.isArray(schema)) {
    return <div className="text-gray-500 italic">Chọn danh mục để xem thông số</div>;
  }

  // Sort by ui.order if available
  const sortedFields = [...schema].sort((a, b) => (a.ui?.order || 0) - (b.ui?.order || 0));

  return (
    <div className="space-y-6">
      {/* ✅ DYNAMIC FIELDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedFields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label>
              {field.label} {field.validation?.required && <span className="text-red-500">*</span>}
            </Label>
            
            {field.type === "select" ? (
              <Select
                value={specs[field.key] || ""}
                onValueChange={(v) => onChange(field.key, v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={field.ui?.placeholder || "Chọn..."} />
                </SelectTrigger>
                <SelectContent>
                  {field.validation?.options?.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.type === "number" ? (
              <Input
                type="number"
                value={specs[field.key] || ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.ui?.placeholder}
                required={field.validation?.required}
                min={field.validation?.min}
                max={field.validation?.max}
              />
            ) : field.type === "boolean" ? (
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  checked={specs[field.key] || false}
                  onChange={(e) => onChange(field.key, e.target.checked)}
                />
                <span className="text-sm text-muted-foreground">
                  {field.ui?.placeholder || "Enable"}
                </span>
              </div>
            ) : (
              <Input
                value={specs[field.key] || ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.ui?.placeholder}
                required={field.validation?.required}
              />
            )}
            {field.ui?.unit && <span className="text-xs text-muted-foreground ml-1">({field.ui.unit})</span>}
          </div>
        ))}
      </div>

      {/* ✅ COLORS SECTION (Optional, for filtering) */}
      <div className="space-y-3 border-t pt-4">
        <Label className="text-base font-semibold">Màu sắc (Dùng để hiển thị bộ lọc)</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {colors.map((color, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={color}
                onChange={(e) => onColorChange(idx, e.target.value)}
                placeholder="VD: Space Black"
                className="flex-1"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => onRemoveColor(idx)}
                disabled={colors.length === 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAddColor} className="mt-2">
          <Plus className="w-4 h-4 mr-2" /> Thêm màu
        </Button>
      </div>

    </div>
  );
};

export default UnifiedSpecsForm;
