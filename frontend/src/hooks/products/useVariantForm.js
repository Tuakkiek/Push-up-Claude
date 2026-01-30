import { useCallback } from "react";


export const useVariantForm = (formData, setFormData, effectiveCategory) => {
  const addVariant = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          color: "",
          images: [""],
          options: [{
             price: "",
             originalPrice: "",
             stock: "",
             sku: ""
          }] // Generic empty option
        }
      ],
    }));
  }, [setFormData]);

  const removeVariant = useCallback(
    (vIdx) => {
      setFormData((prev) => ({
        ...prev,
        variants: prev.variants.filter((_, i) => i !== vIdx),
      }));
    },
    [setFormData]
  );

  const handleVariantChange = useCallback(
    (vIdx, field, value) => {
      if (!formData) return;
      const variants = [...formData.variants];
      variants[vIdx] = { ...variants[vIdx], [field]: value };
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData, setFormData]
  );

  const handleVariantImageChange = useCallback(
    (vIdx, imgIdx, value) => {
      if (!formData) return;
      const variants = [...formData.variants];
      variants[vIdx].images[imgIdx] = value;
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData, setFormData]
  );

  const addVariantImage = useCallback(
    (vIdx) => {
      if (!formData) return;
      const variants = [...formData.variants];
      variants[vIdx].images.push("");
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData, setFormData]
  );

  const removeVariantImage = useCallback(
    (vIdx, imgIdx) => {
      if (!formData) return;
      const variants = [...formData.variants];
      variants[vIdx].images = variants[vIdx].images.filter(
        (_, i) => i !== imgIdx
      );
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData, setFormData]
  );

  const addVariantOption = useCallback(
    (vIdx) => {
      if (!formData) return;
      const variants = [...formData.variants];
      const newOption = {
        originalPrice: "",
        price: "",
        stock: "",
      };

      if (effectiveCategory === "iPhone") {
        newOption.storage = "";
      } else if (effectiveCategory === "iPad") {
        newOption.storage = "";
        newOption.connectivity = "WIFI";
      } else if (effectiveCategory === "Mac") {
        newOption.cpuGpu = "";
        newOption.ram = "";
        newOption.storage = "";
      } else if (
        ["AirPods", "AppleWatch", "Accessories"].includes(effectiveCategory)
      ) {
        newOption.variantName = "";
        if (effectiveCategory === "AppleWatch") {
          newOption.bandSize = "";
        }
      }

      variants[vIdx].options.push(newOption);
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData, effectiveCategory, setFormData]
  );

  const removeVariantOption = useCallback(
    (vIdx, oIdx) => {
      if (!formData) return;
      const variants = [...formData.variants];
      variants[vIdx].options = variants[vIdx].options.filter(
        (_, i) => i !== oIdx
      );
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData, setFormData]
  );

  const handleVariantOptionChange = useCallback(
    (vIdx, oIdx, field, value) => {
      if (!formData) return;
      const variants = [...formData.variants];
      variants[vIdx].options[oIdx] = {
        ...variants[vIdx].options[oIdx],
        [field]: value,
      };
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData, setFormData]
  );

  return {
    addVariant,
    removeVariant,
    handleVariantChange,
    handleVariantImageChange,
    addVariantImage,
    removeVariantImage,
    handleVariantOptionChange,
    addVariantOption,
    removeVariantOption,
  };
};