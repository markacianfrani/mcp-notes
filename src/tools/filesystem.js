import path from 'path';
import fs from 'fs/promises';
import { searchFiles } from '../../search-utils.js';
import { loadSystemPrompt } from '../../prompts/template-loader.js';

// Tool definitions
export function getFilesystemToolDefinitions() {
  return [
    {
      name: "search_files",
      description: "Recursively search for files and directories matching a pattern in your notes directory. " +
        "The search is case-insensitive and matches partial names. Returns full paths to all " +
        "matching items. Great for finding notes when you don't know their exact location.",
      inputSchema: {
        type: "object",
        properties: {
          pattern: { 
            type: "string",
            description: "The pattern to search for in file and directory names" 
          },
          excludePatterns: { 
            type: "array", 
            items: { type: "string" },
            description: "Glob patterns to exclude from search results",
            default: []
          }
        },
        required: ["pattern"]
      },
    },
    {
      name: "read_note",
      description: "Read the complete contents of a note file from your notes directory. " +
        "Specify the path relative to your notes directory (e.g., 'Log/2023-01-01.md'). " +
        "Returns the full text content of the note file.",
      inputSchema: {
        type: "object",
        properties: {
          path: { 
            type: "string",
            description: "The path to the note file, relative to your notes directory" 
          }
        },
        required: ["path"]
      },
    },
    {
      name: "read_multiple_notes",
      description: "Read the contents of multiple note files simultaneously. " +
        "Specify paths relative to your notes directory (e.g., ['Log/2023-01-01.md', 'Rollups/2023-01-01-rollup.md']). " +
        "Returns each file's content with its path as a reference.",
      inputSchema: {
        type: "object",
        properties: {
          paths: { 
            type: "array",
            items: { type: "string" },
            description: "Array of paths to note files, relative to your notes directory" 
          }
        },
        required: ["paths"]
      },
    },
    {
      name: "list_directory",
      description: "List the contents of a directory in your notes. " +
        "Shows all files and directories with clear labels. " +
        "Specify path relative to your notes directory (e.g., 'Log' or 'Rollups').",
      inputSchema: {
        type: "object",
        properties: {
          path: { 
            type: "string",
            description: "Directory path relative to notes directory (defaults to root notes directory if not provided)",
            default: ""
          }
        }
      },
    },
    {
      name: "create_directory",
      description: "Create a new directory in your notes. " +
        "Can create nested directories in one operation. " +
        "Path should be relative to your notes directory.",
      inputSchema: {
        type: "object",
        properties: {
          path: { 
            type: "string",
            description: "Directory path to create, relative to notes directory" 
          }
        },
        required: ["path"]
      },
    }
  ];
}

// Helper functions
export async function ensureDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return true;
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error(`Error creating directory ${dirPath}:`, err);
      return false;
    }
    return true;
  }
}

export async function initializeNotesDirectory(notesPath) {
  // Create base directories
  await ensureDirectory(notesPath);
  await ensureDirectory(path.join(notesPath, 'Log'));
  await ensureDirectory(path.join(notesPath, 'Rollups'));
  
  // // Create a system prompt file if it doesn't exist
  // const promptPath = path.join(notesPath, 'claude-system-prompt.md');
  // try {
  //   await fs.access(promptPath);
  // } catch (err) {
  //   // File doesn't exist, create it
  //   try {
  //     const systemPrompt = await loadSystemPrompt();
  //     await fs.writeFile(promptPath, systemPrompt, 'utf8');
  //   } catch (error) {
  //     console.error("Error loading system prompt template:", error);
  //   }
  // }
}

// Tool handlers
export async function handleSearchFiles(notesPath, args) {
  try {
    // Validate pattern is provided
    if (!args.pattern) {
      throw new Error("'pattern' parameter is required");
    }
    
    // Always search in the notes directory
    const results = await searchFiles(
      notesPath, 
      args.pattern, 
      args.excludePatterns || []
    );
    
    if (results.length === 0) {
      return {
        content: [{ type: "text", text: "No files found matching the pattern." }]
      };
    }
    
    // Format results as relative paths
    const formattedResults = results.map(filePath => 
      path.relative(notesPath, filePath)
    );
    
    return {
      content: [{ 
        type: "text", 
        text: `Found ${results.length} files matching "${args.pattern}":\n\n${formattedResults.join('\n')}` 
      }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error searching files: ${error.message}` }],
      isError: true
    };
  }
}

export async function handleReadNote(notesPath, args) {
  try {
    // Validate path is provided
    if (!args.path) {
      throw new Error("'path' parameter is required");
    }
    
    const filePath = path.join(notesPath, args.path);
    
    // Ensure the path is within allowed directory
    if (!filePath.startsWith(notesPath)) {
      throw new Error("Access denied - path outside notes directory");
    }
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error) {
      throw new Error(`Error reading file: ${error.message}`);
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error reading note: ${error.message}` }],
      isError: true
    };
  }
}

export async function handleReadMultipleNotes(notesPath, args) {
  try {
    // Validate paths is provided and is an array
    if (!args.paths || !Array.isArray(args.paths)) {
      throw new Error("'paths' parameter is required and must be an array");
    }
    
    // Process each file path
    const results = await Promise.all(
      args.paths.map(async (notePath) => {
        try {
          const filePath = path.join(notesPath, notePath);
          
          // Ensure the path is within allowed directory
          if (!filePath.startsWith(notesPath)) {
            return `${notePath}: Error - Access denied - path outside notes directory`;
          }
          
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            return `${notePath}:\n${content}\n`;
          } catch (error) {
            return `${notePath}: Error - ${error.message}`;
          }
        } catch (error) {
          return `${notePath}: Error - ${error.message}`;
        }
      })
    );
    
    return {
      content: [{ type: "text", text: results.join("\n---\n") }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error reading notes: ${error.message}` }],
      isError: true
    };
  }
}

export async function handleListDirectory(notesPath, args) {
  try {
    // Use provided path or default to NOTES_PATH root
    const dirPath = args.path ? path.join(notesPath, args.path) : notesPath;
    
    // Ensure the path is within allowed directory
    if (!dirPath.startsWith(notesPath)) {
      throw new Error("Access denied - path outside notes directory");
    }
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const formatted = entries
        .map((entry) => `${entry.isDirectory() ? "[DIR]" : "[FILE]"} ${entry.name}`)
        .join("\n");
        
      const relativePath = path.relative(notesPath, dirPath) || '.';
      
      return {
        content: [{ 
          type: "text", 
          text: `Contents of ${relativePath}:\n\n${formatted || "No files or directories found."}` 
        }]
      };
    } catch (error) {
      throw new Error(`Error reading directory: ${error.message}`);
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error listing directory: ${error.message}` }],
      isError: true
    };
  }
}

export async function handleCreateDirectory(notesPath, args) {
  try {
    // Validate path parameter
    if (!args.path) {
      throw new Error("'path' parameter is required");
    }
    
    const dirPath = path.join(notesPath, args.path);
    
    // Ensure the path is within allowed directory
    if (!dirPath.startsWith(notesPath)) {
      throw new Error("Access denied - path outside notes directory");
    }
    
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return {
        content: [{ 
          type: "text", 
          text: `Successfully created directory: ${args.path}` 
        }]
      };
    } catch (error) {
      throw new Error(`Error creating directory: ${error.message}`);
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error creating directory: ${error.message}` }],
      isError: true
    };
  }
} 