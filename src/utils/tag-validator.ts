/**
 * Validates a tag name according to Obsidian-compatible rules
 * https://help.obsidian.md/tags#Tag+format
 * @param tag The tag name to validate
 * @returns An object with validation result and error message if invalid
 */
export function validateTag(tag: string): { isValid: boolean; error?: string } {
  // Check for allowed characters (letters, numbers, underscore, hyphen, forward slash)
  const validCharRegex = /^[a-zA-Z0-9_\-\/]+$/;
  if (!validCharRegex.test(tag)) {
    return {
      isValid: false,
      error: "Tags can only contain letters, numbers, underscore (_), hyphen (-), and forward slash (/)."
    };
  }

  // Check for at least one non-numerical character
  const hasNonNumeric = /[a-zA-Z_\-\/]/.test(tag);
  if (!hasNonNumeric) {
    return {
      isValid: false,
      error: "Tags must contain at least one non-numerical character."
    };
  }

  // No need to check for spaces since the validCharRegex already excludes them,
  // but we'll add a specific check for better error messaging
  if (tag.includes(' ')) {
    return {
      isValid: false,
      error: "Tags cannot contain spaces. Consider using camelCase, PascalCase, snake_case, or kebab-case."
    };
  }

  return { isValid: true };
}

/**
 * Short description of tag validation rules for tool documentation
 */
export const TAG_VALIDATION_DESCRIPTION = `Tags must follow these rules:
- Can contain letters, numbers, underscore (_), hyphen (-), and forward slash (/)
- Must contain at least one non-numerical character
- Cannot contain spaces (use camelCase, PascalCase, snake_case, or kebab-case)
- Are case-insensitive (stored as lowercase)`;
