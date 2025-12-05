// frontend/src/components/shared/specs/DynamicSpecsForm.jsx
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Dynamic Specs Form - Render fields dựa trên config từ backend
 */
const DynamicSpecsForm = ({ fields, specs, onChange }) => {
  if (!fields || fields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chưa có cấu hình thông số kỹ thuật. Admin cần thiết lập trước.
      </div>
    );
  }

  // Sort fields by order
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  const renderField = (field) => {
    const value = specs[field.key] || "";

    switch (field.type) {
      case "textarea":
        return (
          <div key={field.key} className="space-y-2 col-span-full">
            <Label>
              {field.label}{" "}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              value={value}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              rows={4}
            />
          </div>
        );

      case "select":
        return (
          <div key={field.key} className="space-y-2">
            <Label>
              {field.label}{" "}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => onChange(field.key, val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || "Chọn..."} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "number":
        return (
          <div key={field.key} className="space-y-2">
            <Label>
              {field.label}{" "}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
            />
          </div>
        );

      case "text":
      default:
        return (
          <div key={field.key} className="space-y-2">
            <Label>
              {field.label}{" "}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              type="text"
              value={value}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
            />
          </div>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedFields.map(renderField)}
    </div>
  );
};

export default DynamicSpecsForm;
