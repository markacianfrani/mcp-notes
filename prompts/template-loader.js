import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Cache mechanism for templates
const templateCache = new Map();
const FILE_CACHE_TTL = 60 * 1000; // 1 minute cache TTL

/**
 * Load a template file with caching
 * @param {string} templatePath - Path to the template file
 * @returns {Promise<string>} - The template content
 */
export async function loadTemplate(templatePath) {
  const now = Date.now();
  
  // Check if we have a cached version that's still valid
  if (templateCache.has(templatePath)) {
    const { content, timestamp } = templateCache.get(templatePath);
    
    // If the cached version is still fresh, return it
    if (now - timestamp < FILE_CACHE_TTL) {
      return content;
    }
  }
  
  try {
    // Load the template from disk
    const content = await fs.readFile(templatePath, 'utf8');
    
    // Cache the template with current timestamp
    templateCache.set(templatePath, {
      content,
      timestamp: now
    });
    
    return content;
  } catch (error) {
    console.error(`Error loading template ${templatePath}:`, error);
    throw error;
  }
}

/**
 * Replace placeholders in a template with values
 * @param {string} template - The template string
 * @param {Object} values - Key-value pairs for replacement
 * @returns {string} - The processed template
 */
export function processTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match;
  });
}

/**
 * Get base directory for templates
 * @returns {string} - Base directory path
 */
function getBaseDir() {
  // First, check if we have an environment variable specifying the app directory
  if (process.env.MCP_NOTES_DIR) {
    return process.env.MCP_NOTES_DIR;
  }
  
  try {
    // Try using import.meta.url (ESM)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return path.resolve(__dirname, '..');  // Go up one level from prompts/ to app root
  } catch (err) {
    // Fallback to CWD (where the process was started)
    return process.cwd();
  }
}

/**
 * Load and process a template file
 * @param {string} templateName - Name of the template file (without path)
 * @param {Object} values - Key-value pairs for replacement
 * @returns {Promise<string>} - The processed template
 */
export async function loadAndProcessTemplate(templateName, values = {}) {
  const baseDir = getBaseDir();
  
  // Try multiple possible locations for the template
  const possiblePaths = [
    // Relative to prompts/templates directory
    path.join(baseDir, 'prompts', 'templates', templateName),
    
    // Direct from templates directory (if we're already in prompts/)
    path.join(baseDir, 'templates', templateName),
  ];
  
  // Try each path in order
  let lastError;
  for (const templatePath of possiblePaths) {
    try {
      const template = await loadTemplate(templatePath);
      return processTemplate(template, values);
    } catch (err) {
      lastError = err;
    }
  }
  
  // If we've tried all paths and none worked, throw the error
  throw lastError || new Error(`Failed to load template: ${templateName}`);
}

/**
 * Load the system prompt
 * @returns {Promise<string>} - The system prompt content
 */
export async function loadSystemPrompt() {
  const baseDir = getBaseDir();
  
  // Try multiple possible locations for the system prompt
  const possiblePaths = [
    // Relative to application root
    path.join(baseDir, 'prompts', 'system-prompt.md'),
    
    // Direct from prompts directory (if we're already in prompts/)
    path.join(baseDir, 'system-prompt.md'),
  ];
  
  // Try each path in order
  let lastError;
  for (const promptPath of possiblePaths) {
    try {
      const content = await loadTemplate(promptPath);
      return content;
    } catch (err) {
      lastError = err;
    }
  }
  
  // If we've tried all paths and none worked, throw the error
  throw lastError || new Error('Failed to load system prompt');
}