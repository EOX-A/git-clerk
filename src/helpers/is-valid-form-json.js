export default function isValidFormJSON(fileContent, withErrors = false) {
  try {
    const schema = JSON.parse(fileContent);

    if (!schema || typeof schema !== "object") {
      return withErrors
        ? { isValid: false, errors: ["Schema must be a valid object"] }
        : false;
    }

    const errors = [];
    validateSchemaStructure(schema, errors);

    return withErrors
      ? { isValid: errors.length === 0, errors }
      : errors.length === 0;
  } catch (error) {
    return withErrors ? { isValid: false, errors: [error.message] } : false;
  }
}

function validateSchemaStructure(schema, errors = []) {
  try {
    // Handle combiners (allOf, anyOf, oneOf)
    if (schema.allOf) validateCombiner(schema.allOf, "allOf", errors);
    if (schema.anyOf) validateCombiner(schema.anyOf, "anyOf", errors);
    if (schema.oneOf) validateCombiner(schema.oneOf, "oneOf", errors);

    // Handle type validation
    if (schema.type) validateType(schema.type, errors);

    // Handle properties
    if (schema.properties) validateProperties(schema.properties, errors);

    // Handle array items
    if (schema.items) validateItems(schema.items, errors);

    // Handle conditional logic
    if (schema.if) {
      validateSchemaStructure(schema.if, errors);
      if (schema.then) validateSchemaStructure(schema.then, errors);
      if (schema.else) validateSchemaStructure(schema.else, errors);
    }

    // Handle definitions
    if (schema.definitions) validateProperties(schema.definitions, errors);
  } catch (error) {
    errors.push(error.message);
  }
}

function validateCombiner(combiner, name, errors) {
  if (!Array.isArray(combiner)) {
    errors.push(`${name} must be an array`);
    return;
  }
  combiner.forEach((subSchema) => validateSchemaStructure(subSchema, errors));
}

function validateType(type, errors) {
  const validTypes = [
    "object",
    "array",
    "string",
    "number",
    "integer",
    "boolean",
    "null",
  ];
  if (Array.isArray(type)) {
    type.forEach((t) => {
      if (!validTypes.includes(t)) {
        errors.push(`Invalid type: ${t}`);
      }
    });
  } else if (!validTypes.includes(type)) {
    errors.push(`Invalid type: ${type}`);
  }
}

function validateProperties(properties, errors) {
  if (typeof properties !== "object" || properties === null) {
    errors.push("Properties must be an object");
    return;
  }
  Object.values(properties).forEach((prop) =>
    validateSchemaStructure(prop, errors),
  );
}

function validateItems(items, errors) {
  if (Array.isArray(items)) {
    items.forEach((item) => validateSchemaStructure(item, errors));
  } else {
    validateSchemaStructure(items, errors);
  }
}
