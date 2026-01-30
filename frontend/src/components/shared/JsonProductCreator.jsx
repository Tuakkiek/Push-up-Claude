
import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { productAPI } from "@/lib/api";
import { CheckCircle2, AlertTriangle, Copy, Loader2, Play, RefreshCw } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const JsonProductCreator = ({ open, onOpenChange, onSuccess, defaultCategoryId }) => { 
  const { categories } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState(defaultCategoryId || "");
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState(null); 

  // Update selected category if default changes
  useEffect(() => {
    if (defaultCategoryId) setSelectedCategoryId(defaultCategoryId);
  }, [defaultCategoryId]);

  const activeCategory = useMemo(() => 
    categories.find(c => c._id === selectedCategoryId), 
  [categories, selectedCategoryId]);

  const generateSample = () => {
    if (!activeCategory) {
        toast.error("Please select a category first");
        return;
    }

    const specifications = {};
    if (activeCategory.specSchema) {
        activeCategory.specSchema.forEach(field => {
            specifications[field.key] = field.type === 'number' ? 0 : 
                                      field.type === 'select' ? (field.validation?.options?.[0] || "") : 
                                      "SAMPLE_VALUE";
        });
    }

    const variantAttributes = {};
    if (activeCategory.variantSchema) {
        activeCategory.variantSchema.forEach(field => {
             variantAttributes[field.key] = field.validation?.options?.[0] || "SAMPLE_VAR";
        });
    }

    const payload = {
        name: `Sample ${activeCategory.name} Product`,
        model: "SAMPLE-MODEL-01",
        brand: "Generic Brand",
        slug: `sample-${activeCategory.slug}-${Date.now()}`,
        condition: "NEW",
        description: `A great new ${activeCategory.name}`,
        status: "AVAILABLE",
        categoryId: activeCategory._id,
        specifications: specifications,
        variants: [
            {
                ...variantAttributes,
                images: [],
                options: [
                    { originalPrice: 1000, price: 900, stock: 100, storage: "256GB" } // Note: storage might be redundant if mapped in schema, but good for base
                ]
            }
        ],
        // Top level defaults if needed, though backend handles some
        originalPrice: 0,
        price: 0, 
        stock: 0
    };

    setInput(JSON.stringify(payload, null, 2));
    setValidationResult(null);
    toast.success(`Generated sample for ${activeCategory.name}`);
  };

  const handleValidate = async () => {
    try {
      if (!input.trim()) {
        setValidationResult({ valid: false, message: "Empty input" });
        return;
      }
      const parsed = JSON.parse(input);

      if (!parsed.categoryId && activeCategory?._id) {
        parsed.categoryId = activeCategory._id;
      }

      const response = await productAPI.validate({
        ...parsed,
        __source: "json",
      });

      const result = response.data?.data || response.data;
      if (result.valid) {
        setValidationResult({
          valid: true,
          message: `Valid payload • variants: ${result.variantCount}`,
          parsed,
        });
      } else {
        const details = [
          ...((result.errors || []).map((e) => `${e.path}: ${e.message}`) || []),
        ];
        if (result.unknownKeys?.length) {
          details.push(`Unknown keys: ${result.unknownKeys.join(", ")}`);
        }
        setValidationResult({
          valid: false,
          message: details.join("\n"),
        });
      }
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      setValidationResult({
        valid: false,
        message: "Validation failed: " + msg,
      });
    }
  };

  const handleSubmit = async () => {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 JSON PRODUCT CREATOR - SUBMIT');
    console.log('='.repeat(80));
    
    if (!validationResult?.valid) {
      console.log('⚠️  Payload not validated yet, running validation...');
      await handleValidate();
      if (!validationResult?.valid) {
        console.log('❌ Validation failed, aborting submit');
        console.log('='.repeat(80) + '\n');
        return;
      }
    }

    console.log('✅ Payload validated successfully');
    console.log('\n📤 SUBMITTING PAYLOAD:');
    console.log('  Category ID:', validationResult.parsed.categoryId);
    console.log('  Product Name:', validationResult.parsed.name);
    console.log('  Product Slug:', validationResult.parsed.slug);
    console.log('  Product Status:', validationResult.parsed.status);
    console.log('  Variants:', validationResult.parsed.variants?.length || 0);
    console.log('  Source:', '__source: "json"');

    setIsSubmitting(true);
    try {
        console.log('\n📡 Calling productAPI.create()...');
        const startTime = performance.now();
        
        const response = await productAPI.create({
          ...validationResult.parsed,
          __source: "json",
        });
        
        const duration = Math.round(performance.now() - startTime);
        console.log(`✅ API call completed in ${duration}ms`);
        
        const created = response.data?.data || response.data;
        
        console.log('\n📦 API RESPONSE:');
        console.log('  Success:', !!created);
        console.log('  Product ID:', created._id);
        console.log('  Product Name:', created.name);
        console.log('  Product Status:', created.status);
        console.log('  Variants Count:', created.variants?.length || 0);
        console.log('  Created At:', created.createdAt);
        
        console.log('\n🔍 FRONTEND VERIFICATION:');
        console.log('  Should appear in UI:', created.status === 'AVAILABLE' ? 'YES ✅' : 'NO ⚠️');
        console.log('  Has Category:', !!created.category ? 'YES ✅' : 'NO ❌');
        console.log('  Has Variants:', created.variants?.length > 0 ? 'YES ✅' : 'NO ❌');
        
        toast.success(`Product Created: ${created.name}`);
        console.log('\n✅ Product creation successful!');
        console.log('='.repeat(80) + '\n');
        
        onSuccess?.();
        onOpenChange(false);
        setInput("");
        setValidationResult(null);

    } catch (error) {
        console.log('\n❌ API CALL FAILED!');
        console.log('='.repeat(80));
        console.error("Creation Error:", error);
        
        const msg = error.response?.data?.message || error.message;
        const stack = error.response?.data?.stack;
        
        console.log('Error Type:', error.name);
        console.log('Error Message:', msg);
        console.log('Response Status:', error.response?.status);
        console.log('Response Data:', error.response?.data);
        
        if (msg.includes("Invalid Variant attributes")) {
            console.log('⚠️  Schema validation error detected');
            toast.error("Schema Validation Error");
            setValidationResult({ valid: false, message: msg + (stack ? `\n${stack.split('\n')[0]}` : "") });
        } else {
            toast.error(msg);
            setValidationResult({ valid: false, message: msg });
        }
        console.log('='.repeat(80) + '\n');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between mr-8">
            <DialogTitle>JSON Product Creator</DialogTitle>
          </div>
          <DialogDescription>
            Generate strict JSON payloads based on Category Schemas.
          </DialogDescription>
        </DialogHeader>

        {/* TOOLBAR */}
        <div className="flex flex-wrap items-center gap-4 py-2 bg-slate-50 p-3 rounded-md border">
            <div className="w-[200px]">
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map(cat => (
                            <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Button variant="outline" size="sm" onClick={generateSample} disabled={!selectedCategoryId}>
                <RefreshCw className="w-4 h-4 mr-2"/> 
                Load Sample
            </Button>
            
            {activeCategory && (
                <div className="flex gap-2">
                    {activeCategory.specSchema?.length > 0 && <Badge variant="secondary">{activeCategory.specSchema.length} Specs</Badge>}
                    {activeCategory.variantSchema?.length > 0 && <Badge variant="secondary">{activeCategory.variantSchema.length} Variant Keys</Badge>}
                </div>
            )}
            
            <div className="flex-1" />

            {validationResult && (
                <div className={`text-xs px-3 py-1 rounded-full flex items-center font-medium ${validationResult.valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {validationResult.valid ? <CheckCircle2 className="w-4 h-4 mr-2"/> : <AlertTriangle className="w-4 h-4 mr-2"/>}
                    {validationResult.valid ? "Valid" : "Invalid"}
                </div>
            )}
        </div>

        {/* EDITOR */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
            <Textarea 
                className="flex-1 font-mono text-sm resize-none leading-relaxed"
                placeholder='Select a category and click "Load Sample" to start...'
                value={input}
                onChange={(e) => {
                    setInput(e.target.value);
                    setValidationResult(null);
                }}
            />

            {validationResult?.message && (
                <div className={`p-4 rounded-lg border ${validationResult.valid ? "bg-green-50 border-green-200 text-green-900" : "bg-red-50 border-red-200 text-red-900"}`}>
                    <h5 className="font-medium mb-1 flex items-center">
                        {validationResult.valid ? <CheckCircle2 className="w-4 h-4 mr-2"/> : <AlertTriangle className="w-4 h-4 mr-2"/>}
                        {validationResult.valid ? "Payload Status" : "Validation Error"}
                    </h5>
                    <p className="whitespace-pre-wrap font-mono text-xs opacity-90 max-h-[100px] overflow-y-auto">
                        {validationResult.message}
                    </p>
                </div>
            )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="secondary" onClick={() => handleValidate()}>
             Verify JSON
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || (validationResult && !validationResult.valid)}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Play className="w-4 h-4 mr-2"/>}
            Create Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JsonProductCreator;
