import fs from 'fs/promises';
import path from 'path';
import { minimatch } from 'minimatch';

/**
 * Search for files recursively that match a given pattern
 * @param {string} rootPath The root path to start searching from
 * @param {string} pattern The text pattern to search for in filenames
 * @param {string[]} excludePatterns Array of glob patterns to exclude
 * @returns {Promise<string[]>} Array of matching file paths
 */
export async function searchFiles(rootPath: string, pattern: string, excludePatterns: string[] = []): Promise<string[]> {
  const results: string[] = [];
  
  // Normalize the search pattern for better matching
  const normalizedPattern = pattern.toLowerCase();

  // Make sure the root path exists
  try {
    const rootStats = await fs.stat(rootPath);
    if (!rootStats.isDirectory()) {
      console.error(`Search root is not a directory: ${rootPath}`);
      return [];
    }
  } catch (error) {
    console.error(`Error accessing search root path ${rootPath}:`, error);
    return [];
  }

  async function search(currentPath: string): Promise<void> {
    try {
      // Read directory entries
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        try {
          // Check if path matches any exclude pattern
          const relativePath = path.relative(rootPath, fullPath);
          const shouldExclude = excludePatterns.some(pattern => {
            const globPattern = pattern.includes('*') ? pattern : `**/${pattern}/**`;
            return minimatch(relativePath, globPattern, { dot: true });
          });

          if (shouldExclude) {
            continue;
          }

          // Match the name (case-insensitive)
          if (entry.name.toLowerCase().includes(normalizedPattern)) {
            results.push(fullPath);
          }

          // Recursively search subdirectories
          if (entry.isDirectory()) {
            await search(fullPath);
          }
        } catch (error) {
          // Skip problematic entries
          console.error(`Error processing ${fullPath}:`, error);
          continue;
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${currentPath}:`, error);
    }
  }

  // Start the search
  await search(rootPath);
  
  // Log the number of results found
  console.error(`Search found ${results.length} results for pattern "${pattern}" in ${rootPath}`);
  
  return results;
}
