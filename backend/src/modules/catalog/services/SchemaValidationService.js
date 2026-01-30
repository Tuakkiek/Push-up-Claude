/**
 * Service to validate data against Category Schema Definitions
 */
class SchemaValidationService {
  /**
   * Validate a single object against a list of field definitions
   * @param {Object} data - The data object to validate (e.g., product.specs)
   * @param {Array} schemaDefinitions - Array of field definitions from Category
   * @param {String} context - 'spec' or 'variant' (for error messages)
   * @returns {Array} errors - List of validation errors, empty if valid
   */
  validate(data, schemaDefinitions, context = "field") {
    const errors = [];

    console.log(`🔍 Validating ${context}:`, {
      dataKeys: Object.keys(data),
      schemaKeys: schemaDefinitions.map(f => f.key)
    });

    // 1. Check for unknown fields (Strict Schema)
    const allowedKeys = new Set(schemaDefinitions.map((f) => f.key));
    Object.keys(data).forEach((rawKey) => {
      const key = String(rawKey).normalize("NFC");
      if (!allowedKeys.has(key)) {
        errors.push(`Unknown ${context} field: '${key}'`);
      }
    });

    // 2. Validate each defined field
    schemaDefinitions.forEach((field) => {
      const value = data[field.key];

      // REQUIRED Check
      if (field.validation?.required) {
        if (value === undefined || value === null || value === "") {
          errors.push(`Field '${field.label}' is required`);
          return; // Skip further checks if missing
        }
      }

      // Skip validation if optional and empty
      if (value === undefined || value === null || value === "") return;

      // TYPE Check
      switch (field.type) {
        case "number":
          if (typeof value !== "number" || isNaN(value)) {
             // Try to parse if string
             if (!isNaN(Number(value))) {
                 // value is acceptable but ideally should be casted before calling check
             } else {
                 errors.push(`Field '${field.label}' must be a number`);
             }
          } else {
             // MIN/MAX Check
            if (field.validation?.min !== undefined && value < field.validation.min) {
                 errors.push(`Field '${field.label}' must be at least ${field.validation.min}`);
            }
            if (field.validation?.max !== undefined && value > field.validation.max) {
                 errors.push(`Field '${field.label}' must be at most ${field.validation.max}`);
            }
          }
          break;

        case "boolean":
           if (typeof value !== "boolean") {
               if (value !== 'true' && value !== 'false') { // sloppy check 
                   errors.push(`Field '${field.label}' must be a boolean`);
               }
           }
           break;
        
        case "select":
          if (field.validation?.options && !field.validation.options.includes(value)) {
             errors.push(`Field '${field.label}' has invalid value. Allowed: ${field.validation.options.join(", ")}`);
          }
          break;
        
        case "multiselect":
          if (!Array.isArray(value)) {
             errors.push(`Field '${field.label}' must be an array`);
          } else if (field.validation?.options) {
             const invalidOptions = value.filter(v => !field.validation.options.includes(v));
             if (invalidOptions.length > 0) {
                 errors.push(`Field '${field.label}' contains invalid values: ${invalidOptions.join(", ")}`);
             }
          }
          break;

        case "text":
        default:
           if (typeof value !== "string") {
              errors.push(`Field '${field.label}' must be text`);
           } else {
              if (field.validation?.pattern) {
                 const regex = new RegExp(field.validation.pattern);
                 if (!regex.test(value)) {
                     errors.push(`Field '${field.label}' format is invalid`);
                 }
              }
              // Min/Max Length for text
              if (field.validation?.min !== undefined && value.length < field.validation.min) {
                   errors.push(`Field '${field.label}' must have at least ${field.validation.min} characters`);
              }
              if (field.validation?.max !== undefined && value.length > field.validation.max) {
                   errors.push(`Field '${field.label}' cannot exceed ${field.validation.max} characters`);
              }
           }
           break;
      }
    });

    return errors;
  }

  /**
   * Extended validator that also returns a flat list of unknown keys.
   * Used by /api/products/validate to build a detailed error response.
   */
  validateWithDetails(data, schemaDefinitions, context = "field") {
    const errors = [];
    const unknownKeys = [];

    const normalizedData = {};
    Object.keys(data || {}).forEach((k) => {
      const nKey = String(k).normalize("NFC");
      normalizedData[nKey] = data[k];
    });

    const allowedKeys = new Set(schemaDefinitions.map((f) => f.key));
    Object.keys(normalizedData).forEach((key) => {
      if (!allowedKeys.has(key)) {
        errors.push(`Unknown ${context} field: '${key}'`);
        unknownKeys.push(key);
      }
    });

    schemaDefinitions.forEach((field) => {
      const value = normalizedData[field.key];
      if (field.validation?.required) {
        if (value === undefined || value === null || value === "") {
          errors.push(`Field '${field.label}' is required`);
          return;
        }
      }
      if (value === undefined || value === null || value === "") return;

      switch (field.type) {
        case "number": {
          const n = typeof value === "number" ? value : Number(value);
          if (Number.isNaN(n)) {
            errors.push(`Field '${field.label}' must be a number`);
            break;
          }
          if (field.validation?.min !== undefined && n < field.validation.min) {
            errors.push(`Field '${field.label}' must be at least ${field.validation.min}`);
          }
          if (field.validation?.max !== undefined && n > field.validation.max) {
            errors.push(`Field '${field.label}' must be at most ${field.validation.max}`);
          }
          break;
        }

        case "boolean": {
          if (typeof value !== "boolean" && value !== "true" && value !== "false") {
            errors.push(`Field '${field.label}' must be a boolean`);
          }
          break;
        }

        case "select": {
          if (field.validation?.options && !field.validation.options.includes(value)) {
            errors.push(
              `Field '${field.label}' has invalid value. Allowed: ${field.validation.options.join(
                ", "
              )}`
            );
          }
          break;
        }

        case "multiselect": {
          if (!Array.isArray(value)) {
            errors.push(`Field '${field.label}' must be an array`);
          } else if (field.validation?.options) {
            const invalidOptions = value.filter((v) => !field.validation.options.includes(v));
            if (invalidOptions.length > 0) {
              errors.push(
                `Field '${field.label}' contains invalid values: ${invalidOptions.join(", ")}`
              );
            }
          }
          break;
        }

        case "text":
        default: {
          if (typeof value !== "string") {
            errors.push(`Field '${field.label}' must be text`);
            break;
          }
          if (field.validation?.pattern) {
            const regex = new RegExp(field.validation.pattern);
            if (!regex.test(value)) {
              errors.push(`Field '${field.label}' format is invalid`);
            }
          }
          if (field.validation?.min !== undefined && value.length < field.validation.min) {
            errors.push(
              `Field '${field.label}' must have at least ${field.validation.min} characters`
            );
          }
          if (field.validation?.max !== undefined && value.length > field.validation.max) {
            errors.push(
              `Field '${field.label}' cannot exceed ${field.validation.max} characters`
            );
          }
          break;
        }
      }
    });

    return { errors, unknownKeys };
  }
}

export default new SchemaValidationService();
