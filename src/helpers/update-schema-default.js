export default function updateSchemaDefaults(schema, formValues) {
  // Return early if schema or formValues is not valid
  if (!schema || !formValues || typeof formValues !== "object") {
    return schema;
  }

  // Handle different schema structures
  if (schema.type === "object" && schema.properties) {
    updatePropertiesWithNesting(schema.properties, formValues);
  } else if (schema.allOf) {
    schema.allOf.forEach((subSchema) => {
      if (subSchema.properties) {
        updatePropertiesWithNesting(subSchema.properties, formValues);
      }
    });
  }

  return schema;
}

function updatePropertiesWithNesting(properties, formValues) {
  for (let key in formValues) {
    if (properties[key] && !properties[key]?.options?.hidden) {
      if (
        properties[key].type === "object" &&
        properties[key].properties &&
        typeof formValues[key] === "object"
      ) {
        // Handle nested objects
        updatePropertiesWithNesting(
          properties[key].properties,
          formValues[key],
        );
      } else {
        // Handle direct values
        if (isValidDefaultValue(properties[key], formValues[key])) {
          properties[key].default = formValues[key];
        }
      }
    }
  }
}

function isValidDefaultValue(property, value) {
  switch (property.type) {
    case "string":
      return typeof value === "string";
    case "number":
    case "integer":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return (
        typeof value === "object" && value !== null && !Array.isArray(value)
      );
    default:
      return true;
  }
}
