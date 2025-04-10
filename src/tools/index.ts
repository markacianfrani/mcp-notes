import path from 'path';
import fs from 'fs/promises';
import { format } from 'date-fns';
import { loadAndProcessTemplate } from '../../prompts/template-loader.js';
import { Note } from '../notes/Note.js';
import { LogNote } from '../notes/LogNote.js';
import {
  ensureDirectory,
  initializeNotesDirectory,
  handleSearchFiles,
  handleReadNote,
  handleReadMultipleNotes,
  handleListDirectory,
  handleCreateDirectory,
  getFilesystemToolDefinitions
} from './filesystem.js';

// Types
interface DateInfo {
  dayOfWeek: string;
  fullDate: string;
  isoDate: string;
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

interface ToolCallResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

interface StickyArgs {
  thought: string;
  evaluationStep: number;
  totalSteps: number;
  nextStepNeeded: boolean;
  actionability: number;
  longevity: number;
  findability: number;
  futureReferenceValue: number;
}

interface LogArgs {
  notes: string;
  tags?: string[];
}

interface RollupArgs {
  date?: string;
  accomplishments?: string[];
  insights?: string[];
  todos?: string[];
}

interface WriteNoteArgs {
  path: string;
  content: string;
  tags?: string[];
}

// Format date
function formatDate(date = new Date()): DateInfo {
  // Clone the date to avoid modifying the original
  const localDate = new Date(date);
  // Set time to noon to avoid timezone issues affecting the date
  localDate.setHours(12, 0, 0, 0);
  
  return {
    dayOfWeek: format(localDate, 'EEEE'),
    fullDate: format(localDate, 'MMMM d, yyyy'),
    isoDate: format(localDate, 'yyyy-MM-dd')
  };
}

// Tool definitions
export function getToolDefinitions(): ToolDefinition[] {
  const filesystemTools = getFilesystemToolDefinitions();
  
  return [
    {
      name: "log",
      description: "Create or update today's daily log file. Optionally add notes to the log.",
      inputSchema: {
        type: "object",
        properties: {
          notes: { 
            type: "string"
          },
          tags: { 
            type: "array",
            items: { type: "string" },
            description: `Analyze the note's content and identify key themes, concepts, and categories that connect it to other notes.
              Consider:
              - Core topics and themes present in the note
              - Broader domains or areas of knowledge
              - Types of information (decisions, ideas, research, etc.)
              - Projects or contexts that might want to reference this later
              Do not force tags - only add ones that naturally emerge from the content and would help build meaningful connections between notes.`
          }
        },
        required: ["notes", "tags"]
      }
    },
    {
      name: "sticky",
      description: `
      Evaluate the stickiness of a thought. Based on the following criteria: 
      1. Actionability (1-10): Can this be applied to future work? Is there any information that can be used to apply this thought to future work in different contexts? Is the problem it solves clear?
      2. Longevity (1-10): Will this be relevant months or years from now?
      3. Findability (1-10): Would this be hard to rediscover if forgotten?
      4. Future Reference Value (1-10): How likely are you to need this again?
      Thoughts to ignore: 
      1. Trivial syntax details
      2. Redundant information
      `,
      inputSchema: {
        type: "object",
        properties: {
          thought: { type: "string" },
          evaluationStep: { type: "number" },
          totalSteps: { type: "number" },
          nextStepNeeded: { type: "boolean" },
          actionability: { type: "number" },
          longevity: { type: "number" },
          findability: { type: "number" },
          futureReferenceValue: { type: "number" }
        },
        required: ["thought", "evaluationStep", "totalSteps", "nextStepNeeded", "actionability", "longevity", "findability", "futureReferenceValue"]
      },
    },
    {
      name: "rollup",
      description: `
       Synthesize my daily note to create an organized rollup of the most important notes with clear categories, connections, and action items. Optionally specify a date (YYYY-MM-DD).
       Only include notes that actually add long-term value. If you are unsure, call the /sticky tool to evaluate the stickiness of the thought.
       If you do not have enough information, stop and ask the user for more information.
       It is better to not log anything than log something that is not useful.
      `,
      inputSchema: {
        type: "object",
        properties: {
          date: { type: "string" },
          accomplishments: {
            type: "array",
            items: { type: "string" },
            description: "A list of accomplishments. Each accomplishment should be a short description of the work done in the day so that it can answer the question 'what did you do all day?'",
          },
          insights: {
            type: "array",  
            items: { type: "string" },
            description: "A list of insights. Each insight should be a long-term storage. Things like new knowledge gained. Do not force insights - only add ones that naturally emerge from the content and would help build meaningful connections between notes.",
          },
          todos: {
            type: "array",
            items: { type: "string" },
            description: "A list of todos. Each todo should be a short description of the task to be done. A todo should be actionable.",
          },
        },
        required: ["accomplishments", "insights"]
      },
    },
    {
      name: "write_note",
      description: "Create a new note or overwrite an existing note with content. " +
        "Path should be relative to your notes directory. " +
        "Optionally include tags that will be merged with any existing tags in the note.",
      inputSchema: {
        type: "object",
        properties: {
          path: { 
            type: "string",
            description: "Path where the note should be saved, relative to notes directory" 
          },
          content: {
            type: "string",
            description: "Content to write to the note"
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Tags to add to the note's frontmatter. Will be merged with existing tags if present."
          }
        },
        required: ["path", "content"]
      },
    },
    ...filesystemTools
  ];
}

// Tool handlers
export async function handleToolCall(notesPath: string, name: string, args: any): Promise<ToolCallResult> {
  try {
    switch (name) {
      case "sticky": {
        const stickyArgs = args as StickyArgs;
        const result = stickyArgs.actionability + stickyArgs.longevity + stickyArgs.findability + stickyArgs.futureReferenceValue;  
        const isSticky = result > 18;
        if (isSticky) {
          return {
              content: [{ type: "text", text: JSON.stringify({result: `Your thought is sticky`, ...stickyArgs, isSticky}, null, 2) }],
          };
        } else {
          return {
            content: [{ type: "text", text: JSON.stringify({result: `Your thought is not sticky`, ...stickyArgs, isSticky}, null, 2) }],
          };
        }
      }
      case "log": {
        try {
          const logArgs = args as LogArgs;
          const logNote = new LogNote(notesPath, { tags: logArgs.tags || [] });
          
          await logNote.load();
          
          const result = await logNote.appendEntry(logArgs.notes);
          
          if (!result.success) {
            return {
              content: [{ type: "text", text: `Error creating log: ${result.error}` }],
              isError: true,
            };
          }
          
          return {
            content: [{ 
              type: "text", 
              text: `I've added your note to today's log at ${result.path}.`
            }],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: `Error in log command: ${errorMessage}` }],
            isError: true,
          };
        }
      }
      
      case "rollup": {
        try {
          console.error("Doing Rollup:", args);
          const rollupArgs = args as RollupArgs;
          
          // Ensure Rollups directory exists
          const rollupsDir = path.join(notesPath, 'Rollups');
          const success = await ensureDirectory(rollupsDir);
          if (!success) {
            return { 
              content: [{ type: "text", text: `Error preparing rollup: Failed to create Rollups directory` }],
              isError: true
            };
          }
          
          // Get date info - use provided date or today
          const targetDate = rollupArgs.date ? new Date(rollupArgs.date) : new Date();
          const dateInfo = formatDate(targetDate);
          
          // Try to read the daily log for this date
          const logPath = path.join(notesPath, 'Log', `${dateInfo.isoDate}.md`);
          let logContent = "";

          // Create rollup template with content inputs
          const rollupPath = path.join(rollupsDir, `${dateInfo.isoDate}-rollup.md`);
          
          // Format achievements if provided
          let achievements = "";
          if (rollupArgs.accomplishments) {
            achievements = rollupArgs.accomplishments.map(item => `- ${item}`).join('\n');
          }
          
          // Format insights if provided
          let insights = "";
          if (rollupArgs.insights) {
            insights = rollupArgs.insights.map(item => `- ${item}`).join('\n');
          }

          // Format todos if provided
          let todos = "";
          if (rollupArgs.todos) {
            todos = rollupArgs.todos.map(item => `- ${item}`).join('\n');
          }
          
          // Load the template and process it
          let rollupTemplate;
          try {
            rollupTemplate = await loadAndProcessTemplate('rollup.md', {
              fullDate: dateInfo.fullDate,
              achievements,
              insights,
              todos
            });
          } catch (error) {
            console.error("Error loading rollup template:", error);
            // Fallback template
            rollupTemplate = `# Daily Rollup: ${dateInfo.fullDate}\n\n## 🏆 Achievements\n${achievements}\n\n## 💡 Insights\n${insights}\n\n## Daily Log Summary\n\n${logContent}\n\n## Key Takeaways\n\n## Action Items\n`;
          }
          
          // Write the rollup file
          await fs.writeFile(rollupPath, rollupTemplate, 'utf8');
          
          return {
            content: [{ type: "text", text: `Rollup saved to ${rollupPath}` }]
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("Error in rollup command:", error);
          return {
            content: [{ type: "text", text: `Error creating rollup: ${errorMessage}` }],
            isError: true,
          };
        }
      }
      
      case "search_files":
        return await handleSearchFiles(notesPath, args);
      
      case "read_note":
        return await handleReadNote(notesPath, args);
      
      case "read_multiple_notes":
        return await handleReadMultipleNotes(notesPath, args);
      
      case "list_directory":
        return await handleListDirectory(notesPath, args);
      
      case "create_directory":
        return await handleCreateDirectory(notesPath, args);
      
      case "write_note": {
        try {
          const writeNoteArgs = args as WriteNoteArgs;
          
          // Validate parameters
          if (!writeNoteArgs.path) {
            throw new Error("'path' parameter is required");
          }
          
          if (writeNoteArgs.content === undefined) {
            throw new Error("'content' parameter is required");
          }
          
          // Create a Note instance
          const note = new Note(notesPath, writeNoteArgs.path, {
            content: writeNoteArgs.content,
            tags: writeNoteArgs.tags || []
          });
          
          // Save the note
          const result = await note.save();
          
          if (!result.success) {
            return {
              content: [{ type: "text", text: `Error writing note: ${result.error}` }],
              isError: true
            };
          }
          
          // After successfully saving the note, append an entry to the daily log
          try {
            // Create a LogNote instance for today
            const logNote = new LogNote(notesPath);
            
            // Load existing content if available
            await logNote.load();
            
            // Format the note path for wikilink
            // Remove file extension if present and get the base name
            const notePath = writeNoteArgs.path;
            const noteBaseName = path.basename(notePath, path.extname(notePath));
            
            // Create wikilink using Obsidian convention
            const wikilink = `[[${noteBaseName}]]`;
            
            // Create log entry with the wikilink
            const logEntry = `Created note: ${wikilink}`;
            
            // Append the entry to the log
            await logNote.appendEntry(logEntry);
            
            return {
              content: [{ 
                type: "text", 
                text: `Successfully wrote note to: ${writeNoteArgs.path} and updated daily log with link` 
              }]
            };
          } catch (logError) {
            const errorMessage = logError instanceof Error ? logError.message : String(logError);
            console.error("Error updating log with note link:", logError);
            
            // Still return success for the note creation even if log update fails
            return {
              content: [{ 
                type: "text", 
                text: `Successfully wrote note to: ${writeNoteArgs.path} (but failed to update daily log: ${errorMessage})` 
              }]
            };
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: `Error writing note: ${errorMessage}` }],
            isError: true
          };
        }
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true
    };
  }
}

export { initializeNotesDirectory };
