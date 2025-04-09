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

// Format date
function formatDate(date = new Date()) {
  return {
    dayOfWeek: format(date, 'EEEE'),
    fullDate: format(date, 'MMMM d, yyyy'),
    isoDate: format(date, 'yyyy-MM-dd')
  };
}

// Tool definitions
export function getToolDefinitions() {
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
          content: {
            type: "array",
            description: "A list of entries categories by Accomplishments and Insights and TODOS",
            accomplishments: {
              type: "array",
              items: { type: "string" },
              description: "A list of accomplishments. Each accomplishment should be a short description of the work done in the day so that it can answer the question 'what did you do all day?'",
              required: true
            },
            insights: {
              type: "array",  
              items: { type: "string" },
              description: "A list of insights. Each insight should be a long-term storage. Things like new knowledge gained. Do not force insights - only add ones that naturally emerge from the content and would help build meaningful connections between notes.",
              required: true
            },
            todos: {
              type: "array",
              items: { type: "string" },
              description: "A list of todos. Each todo should be a short description of the task to be done. A todo should be actionable.",
              required: false
            }
          }
        }
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
export async function handleToolCall(notesPath, name, args) {
  try {
    switch (name) {
      case "sticky": {
        const result = args.actionability + args.longevity + args.findability + args.futureReferenceValue;  
        const isSticky = result > 18;
        if (isSticky) {
          return {
              content: [{ type: "text", text: JSON.stringify({result: `Your thought is sticky`, ...args, isSticky}, null, 2) }],
          };
        } else {
          return {
            content: [{ type: "text", text: JSON.stringify({result: `Your thought is not sticky`, ...args, isSticky}, null, 2) }],
          };
        }
      }
      case "log": {
        try {
          const logNote = new LogNote(notesPath, { tags: args.tags || [] });
          
          await logNote.load();
          
          const result = await logNote.appendEntry(args.notes);
          
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
          return {
            content: [{ type: "text", text: `Error in log command: ${error.message}` }],
            isError: true,
          };
        }
      }
      
      case "rollup": {
        try {
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
          const targetDate = args.date ? new Date(args.date) : new Date();
          const dateInfo = formatDate(targetDate);
          
          // Try to read the daily log for this date
          const logPath = path.join(notesPath, 'Log', `${dateInfo.isoDate}.md`);
          let logContent = "";

          // Create rollup template with content inputs
          const rollupPath = path.join(rollupsDir, `${dateInfo.isoDate}-rollup.md`);
          
          // Format achievements if provided
          let achievements = "";
          if (args.content && args.content.accomplishments) {
            achievements = args.content.accomplishments.map(item => `- ${item}`).join('\n');
          }
          
          // Format insights if provided
          let insights = "";
          if (args.content && args.content.insights) {
            insights = args.content.insights.map(item => `- ${item}`).join('\n');
          }

          // Format todos if provided
          let todos = "";
          if (args.content && args.content.todos) {
            todos = args.content.todos.map(item => `- ${item}`).join('\n');
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
          console.error("Error in rollup command:", error);
          return {
            content: [{ type: "text", text: `Error creating rollup: ${error.message}` }],
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
          // Validate parameters
          if (!args.path) {
            throw new Error("'path' parameter is required");
          }
          
          if (args.content === undefined) {
            throw new Error("'content' parameter is required");
          }
          
          // Create a Note instance
          const note = new Note(notesPath, args.path, {
            content: args.content,
            tags: args.tags || []
          });
          
          // Save the note
          const result = await note.save();
          
          if (!result.success) {
            return {
              content: [{ type: "text", text: `Error writing note: ${result.error}` }],
              isError: true
            };
          }
          
          return {
            content: [{ 
              type: "text", 
              text: `Successfully wrote note to: ${args.path}` 
            }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error writing note: ${error.message}` }],
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
