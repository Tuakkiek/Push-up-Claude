// frontend/src/pages/admin/CustomSpecsManager.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Save, RotateCcw, GripVertical } from "lucide-react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const CATEGORIES = [
  { value: "iPhone", label: "iPhone" },
  { value: "iPad", label: "iPad" },
  { value: "Mac", label: "Mac" },
  { value: "AirPods", label: "AirPods" },
  { value: "AppleWatch", label: "Apple Watch" },
  { value: "Accessories", label: "Phụ kiện" },
];

const FIELD_TYPES = [
  { value: "text", label: "Text (Văn bản)" },
  { value: "number", label: "Number (Số)" },
  { value: "select", label: "Select (Dropdown)" },
  { value: "textarea", label: "Textarea (Văn bản dài)" },
];

const CustomSpecsManager = () => {
  const { category: categoryParam } = useParams();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("iPhone");
  const [config, setConfig] = useState({
    useCustomSpecs: false,
    fields: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!categoryParam) {
      navigate("/admin/categories");
    }
  }, [categoryParam, navigate]);

  useEffect(() => {
    fetchConfig(activeCategory);
  }, [activeCategory]);

  const fetchConfig = async (category) => {
    setIsLoading(true);
    try {
      const token = getToken();
      const response = await axios.get(`${BASE_URL}/custom-specs/${category}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.data.customSpec;
      setConfig({
        useCustomSpecs: data.useCustomSpecs || false,
        fields: data.fields || [],
      });
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Không thể tải cấu hình");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = getToken();
      await axios.put(`${BASE_URL}/custom-specs/${activeCategory}`, config, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Lưu cấu hình thành công!");
      fetchConfig(activeCategory);
    } catch (error) {
      console.error("Save error:", error);
      toast.error(error.response?.data?.message || "Lưu thất bại");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm(`Reset ${activeCategory} về specs mặc định?`)) return;

    try {
      const token = getToken();
      await axios.post(
        `${BASE_URL}/custom-specs/${activeCategory}/reset`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Đã reset về mặc định");
      fetchConfig(activeCategory);
    } catch (error) {
      console.error("Reset error:", error);
      toast.error("Reset thất bại");
    }
  };

  const addField = () => {
    setConfig((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          key: "",
          label: "",
          type: "text",
          required: false,
          placeholder: "",
          options: [],
          order: prev.fields.length,
        },
      ],
    }));
  };

  const updateField = (index, field, value) => {
    setConfig((prev) => {
      const newFields = [...prev.fields];
      newFields[index] = { ...newFields[index], [field]: value };
      return { ...prev, fields: newFields };
    });
  };

  const removeField = (index) => {
    setConfig((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const moveField = (index, direction) => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === config.fields.length - 1) return;

    const newFields = [...config.fields];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [
      newFields[targetIndex],
      newFields[index],
    ];

    // Update order
    newFields.forEach((field, i) => {
      field.order = i;
    });

    setConfig((prev) => ({ ...prev, fields: newFields }));
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý Thông số Kỹ thuật</h1>
          <p className="text-muted-foreground">
            Tùy chỉnh các trường thông số cho từng danh mục
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" /> Reset mặc định
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" /> {isSaving ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </div>

      {/* TABS */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid grid-cols-6 w-full">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat.value} value={cat.value} className="space-y-6">
            {/* TOGGLE CUSTOM SPECS */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">Sử dụng Thông số Tùy chỉnh</h3>
                <p className="text-sm text-muted-foreground">
                  Bật để sử dụng các trường tùy chỉnh thay vì mặc định
                </p>
              </div>
              <Switch
                checked={config.useCustomSpecs}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, useCustomSpecs: checked }))
                }
              />
            </div>

            {/* FIELDS EDITOR */}
            {config.useCustomSpecs && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Các trường thông số</h3>
                  <Button variant="outline" size="sm" onClick={addField}>
                    <Plus className="w-4 h-4 mr-2" /> Thêm trường
                  </Button>
                </div>

                {config.fields.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    Chưa có trường nào. Nhấn "Thêm trường" để bắt đầu.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {config.fields.map((field, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-5 h-5 text-muted-foreground" />
                            <span className="font-medium">
                              Trường #{index + 1}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveField(index, "up")}
                              disabled={index === 0}
                            >
                              ↑
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveField(index, "down")}
                              disabled={index === config.fields.length - 1}
                            >
                              ↓
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeField(index)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Key (Tên biến) *</Label>
                            <Input
                              value={field.key}
                              onChange={(e) =>
                                updateField(index, "key", e.target.value)
                              }
                              placeholder="VD: chip, ram, storage"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Label (Nhãn hiển thị) *</Label>
                            <Input
                              value={field.label}
                              onChange={(e) =>
                                updateField(index, "label", e.target.value)
                              }
                              placeholder="VD: Chip xử lý, RAM"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Loại</Label>
                            <Select
                              value={field.type}
                              onValueChange={(val) =>
                                updateField(index, "type", val)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FIELD_TYPES.map((type) => (
                                  <SelectItem
                                    key={type.value}
                                    value={type.value}
                                  >
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Placeholder</Label>
                            <Input
                              value={field.placeholder}
                              onChange={(e) =>
                                updateField(
                                  index,
                                  "placeholder",
                                  e.target.value
                                )
                              }
                              placeholder="VD: Nhập chip..."
                            />
                          </div>

                          {field.type === "select" && (
                            <div className="col-span-2 space-y-2">
                              <Label>Options (mỗi dòng 1 giá trị)</Label>
                              <textarea
                                value={(field.options || []).join("\n")}
                                onChange={(e) =>
                                  updateField(
                                    index,
                                    "options",
                                    e.target.value.split("\n").filter(Boolean)
                                  )
                                }
                                rows={3}
                                className="w-full px-3 py-2 border rounded-md"
                                placeholder="VD:&#10;128GB&#10;256GB&#10;512GB"
                              />
                            </div>
                          )}

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={field.required}
                              onCheckedChange={(checked) =>
                                updateField(index, "required", checked)
                              }
                            />
                            <Label>Bắt buộc</Label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PREVIEW */}
            {config.useCustomSpecs && config.fields.length > 0 && (
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold">Preview</h3>
                <div className="grid grid-cols-2 gap-4">
                  {config.fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label>
                        {field.label}{" "}
                        {field.required && (
                          <span className="text-red-500">*</span>
                        )}
                      </Label>
                      {field.type === "textarea" ? (
                        <textarea
                          className="w-full px-3 py-2 border rounded-md"
                          placeholder={field.placeholder}
                          rows={3}
                          disabled
                        />
                      ) : field.type === "select" ? (
                        <Select disabled>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={field.placeholder || "Chọn..."}
                            />
                          </SelectTrigger>
                        </Select>
                      ) : (
                        <Input
                          type={field.type}
                          placeholder={field.placeholder}
                          disabled
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

// Helper
const getToken = () => {
  const authStorage = localStorage.getItem("auth-storage");
  if (authStorage) {
    try {
      const { state } = JSON.parse(authStorage);
      return state?.token;
    } catch (e) {
      return null;
    }
  }
  return null;
};

export default CustomSpecsManager;
