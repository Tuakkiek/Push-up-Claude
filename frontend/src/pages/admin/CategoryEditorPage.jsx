// frontend/src/pages/admin/CategoryEditorPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { categoryAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FIELD_TYPES = ["text", "number", "select", "boolean", "multiselect"];

// Single Field Editor Component - Enhanced for full schema support
const SchemaFieldEditor = ({ field, onChange, onRemove, index }) => {
  const handleChange = (path, value) => {
    const updated = { ...field };
    const keys = path.split(".");
    let current = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    onChange(updated);
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono text-muted-foreground">
            {field.key || `field_${index}`}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive/90"
            onClick={onRemove}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Key (Unique ID) *</Label>
            <Input
              value={field.key || ""}
              onChange={(e) => handleChange("key", e.target.value)}
              placeholder="e.g. screenSize"
              className="h-9 font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Display Label *</Label>
            <Input
              value={field.label || ""}
              onChange={(e) => handleChange("label", e.target.value)}
              placeholder="e.g. Screen Size"
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Field Type</Label>
            <Select
              value={field.type || "text"}
              onValueChange={(v) => handleChange("type", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Unit (optional)</Label>
            <Input
              value={field.ui?.unit || ""}
              onChange={(e) => handleChange("ui.unit", e.target.value)}
              placeholder="e.g. GB, inch, mAh"
              className="h-9"
            />
          </div>
        </div>

        {/* Options for select/multiselect */}
        {(field.type === "select" || field.type === "multiselect") && (
          <div className="space-y-2">
            <Label className="text-xs">Options (comma-separated)</Label>
            <Input
              value={field.validation?.options?.join(", ") || ""}
              onChange={(e) =>
                handleChange(
                  "validation.options",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
              placeholder="Option1, Option2, Option3"
              className="h-9"
            />
          </div>
        )}

        {/* Validation */}
        <div className="border-t pt-3 space-y-3">
          <Label className="text-xs font-semibold">Validation Rules</Label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={field.validation?.required || false}
                onChange={(e) =>
                  handleChange("validation.required", e.target.checked)
                }
              />
              Required Field
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Min Value/Length</Label>
              <Input
                type="number"
                value={field.validation?.min || ""}
                onChange={(e) => handleChange("validation.min", e.target.value ? Number(e.target.value) : undefined)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Value/Length</Label>
              <Input
                type="number"
                value={field.validation?.max || ""}
                onChange={(e) => handleChange("validation.max", e.target.value ? Number(e.target.value) : undefined)}
                className="h-8"
              />
            </div>
          </div>
        </div>

        {/* UI Metadata */}
        <div className="border-t pt-3 space-y-3">
          <Label className="text-xs font-semibold">UI Configuration</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Placeholder</Label>
              <Input
                value={field.ui?.placeholder || ""}
                onChange={(e) => handleChange("ui.placeholder", e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">UI Order</Label>
              <Input
                type="number"
                value={field.ui?.order || 0}
                onChange={(e) => handleChange("ui.order", Number(e.target.value))}
                className="h-8"
              />
            </div>
          </div>
        </div>

        {/* Flags */}
        <div className="border-t pt-3 space-y-2">
          <Label className="text-xs font-semibold">Feature Flags</Label>
          <div className="grid grid-cols-3 gap-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={field.flags?.isSearchable ?? true}
                onChange={(e) =>
                  handleChange("flags.isSearchable", e.target.checked)
                }
              />
              Searchable
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={field.flags?.isFilterable ?? true}
                onChange={(e) =>
                  handleChange("flags.isFilterable", e.target.checked)
                }
              />
              Filterable
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={field.flags?.isComparable ?? true}
                onChange={(e) =>
                  handleChange("flags.isComparable", e.target.checked)
                }
              />
              Comparable
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Schema Builder Component - Array-based
const SchemaBuilder = ({ schema, onChange, schemaType }) => {
  const [newKey, setNewKey] = useState("");

  const handleFieldChange = (index, updatedField) => {
    const newSchema = [...schema];
    newSchema[index] = updatedField;
    onChange(newSchema);
  };

  const handleAddField = () => {
    const trimmedKey = newKey.trim();
    if (!trimmedKey) return toast.error("Nhập Key cho field mới");
    
    // Check duplicate key
    if (schema.some(f => f.key === trimmedKey)) {
      return toast.error("Key đã tồn tại");
    }

    const newField = {
      key: trimmedKey,
      label: trimmedKey.replace(/([A-Z])/g, " $1").trim(),
      type: "text",
      validation: { required: false },
      ui: { order: schema.length, group: "General" },
      flags: { isSearchable: true, isFilterable: true, isComparable: true },
    };

    onChange([...schema, newField]);
    setNewKey("");
  };

  const handleRemoveField = (index) => {
    onChange(schema.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
        <p className="text-xs text-amber-800">
          {schemaType === "spec" 
            ? "Specs define product characteristics (e.g., Screen Size, Processor). These appear in product detail pages."
            : "Variants define purchasable options (e.g., Color, Storage). Each combination creates a unique SKU with its own price/stock."
          }
        </p>
      </div>

      {schema.map((field, index) => (
        <SchemaFieldEditor
          key={field.key || index}
          field={field}
          index={index}
          onChange={(updated) => handleFieldChange(index, updated)}
          onRemove={() => handleRemoveField(index)}
        />
      ))}

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex gap-2 items-end">
            <div className="flex-1 max-w-xs">
              <Label>Add New Field (Key)</Label>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="e.g. screenSize, storage, color..."
                onKeyPress={(e) => e.key === "Enter" && handleAddField()}
              />
            </div>
            <Button
              type="button"
              onClick={handleAddField}
              disabled={!newKey.trim()}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Field
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const CategoryEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    specSchema: [],
    variantSchema: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("specs"); // Control tab state

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      categoryAPI
        .getAll()
        .then((res) => {
          const cat = res.data.data.find((c) => c._id === id);
          if (cat) {
            setFormData({
              name: cat.name,
              description: cat.description || "",
              specSchema: cat.specSchema || [],
              variantSchema: cat.variantSchema || [],
            });
          } else {
            toast.error("Không tìm thấy danh mục");
            navigate("/admin/categories");
          }
        })
        .catch(() => toast.error("Lỗi tải danh mục"))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit, navigate]);

  const handleSubmit = async () => {
    console.log("📝 [CATEGORY FORM] Starting submission...");
    console.log("📝 [CATEGORY FORM] Form data:", formData);
    
    // Validation
    if (!formData.name.trim()) {
      console.log("❌ [CATEGORY FORM] Validation failed: Name is empty");
      return toast.error("Tên danh mục là bắt buộc");
    }

    // Validate schema keys
    const specKeys = formData.specSchema.map(f => f.key).filter(Boolean);
    const variantKeys = formData.variantSchema.map(f => f.key).filter(Boolean);
    
    console.log("🔍 [CATEGORY FORM] Schema validation:", {
      specKeys,
      variantKeys,
      specDuplicates: specKeys.length !== new Set(specKeys).size,
      variantDuplicates: variantKeys.length !== new Set(variantKeys).size
    });
    
    if (new Set(specKeys).size !== specKeys.length) {
      console.log("❌ [CATEGORY FORM] Spec schema has duplicate keys");
      return toast.error("Spec schema có key trùng lặp");
    }
    if (new Set(variantKeys).size !== variantKeys.length) {
      console.log("❌ [CATEGORY FORM] Variant schema has duplicate keys");
      return toast.error("Variant schema có key trùng lặp");
    }

    // Check all fields have keys
    if (formData.specSchema.some(f => !f.key)) {
      console.log("❌ [CATEGORY FORM] Some spec fields are missing keys");
      return toast.error("Tất cả spec fields phải có key");
    }
    if (formData.variantSchema.some(f => !f.key)) {
      console.log("❌ [CATEGORY FORM] Some variant fields are missing keys");
      return toast.error("Tất cả variant fields phải có key");
    }

    // Generate slug from name
    const slug = formData.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    const payload = {
      ...formData,
      slug,
    };

    console.log("📤 [CATEGORY FORM] Sending payload:", payload);
    console.log("📤 [CATEGORY FORM] Mode:", isEdit ? 'UPDATE' : 'CREATE');
    
    setLoading(true);
    try {
      let response;
      if (isEdit) {
        console.log("🔄 [CATEGORY FORM] Updating category ID:", id);
        response = await categoryAPI.update(id, payload);
        console.log("✅ [CATEGORY FORM] Update response:", response.data);
        toast.success("Cập nhật thành công");
      } else {
        console.log("➕ [CATEGORY FORM] Creating new category");
        response = await categoryAPI.create(payload);
        console.log("✅ [CATEGORY FORM] Create response:", response.data);
        toast.success("Tạo mới thành công");
      }
      console.log("🎉 [CATEGORY FORM] Navigating to categories list");
      navigate("/admin/categories");
    } catch (error) {
      console.error("❌ [CATEGORY FORM] Error occurred:", error);
      console.error("❌ [CATEGORY FORM] Error response:", error.response?.data);
      console.error("❌ [CATEGORY FORM] Error status:", error.response?.status);
      toast.error(error.response?.data?.message || "Lưu thất bại");
    } finally {
      setLoading(false);
      console.log("🏁 [CATEGORY FORM] Submission completed");
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEdit ? "Edit Category" : "Create New Category"}
          </h1>
          <p className="text-muted-foreground">
            Define product type configuration including specs and variants
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* BASIC INFO */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Category Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Smartphones, Laptops, Smart Home Devices"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of this product category..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* SCHEMA BUILDER */}
        <Card>
          <CardHeader>
            <CardTitle>Schema Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="specs">
                  Specification Schema ({formData.specSchema.length})
                </TabsTrigger>
                <TabsTrigger value="variants">
                  Variant Schema ({formData.variantSchema.length})
                </TabsTrigger>
              </TabsList>
              <div className="mt-6">
                <TabsContent value="specs" className="space-y-4">
                  <SchemaBuilder
                    schema={formData.specSchema}
                    onChange={(newSchema) =>
                      setFormData({ ...formData, specSchema: newSchema })
                    }
                    schemaType="spec"
                  />
                </TabsContent>
                <TabsContent value="variants" className="space-y-4">
                  <SchemaBuilder
                    schema={formData.variantSchema}
                    onChange={(newSchema) =>
                      setFormData({ ...formData, variantSchema: newSchema })
                    }
                    schemaType="variant"
                  />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/admin/categories")}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Category</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CategoryEditorPage;
