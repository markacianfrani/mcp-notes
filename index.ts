#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourceTemplatesRequestSchema,
    GetPromptRequestSchema,
    ListPromptsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import os from "os";
import fs from "fs/promises";
import {
    loadAndProcessTemplate,
    loadSystemPrompt
} from "./prompts/template-loader.js";
import { NotesResourceProvider } from "./src/resources/index.js";
import {
    getToolDefinitions,
    handleToolCall,
    initializeNotesDirectory
} from "./src/tools/index.js";

// Configuration
const NOTES_PATH =
    process.argv[2] || path.join(os.homedir(), "Documents/Notes");





// Initialize the directories
await initializeNotesDirectory(NOTES_PATH);

// Define prompt types
interface PromptBase {
    name: string;
    description: string;
}

interface AtomicPrompt extends PromptBase {
    arguments: Array<{
        name: string;
        description: string;
        required: boolean;
    }>;
}

interface Prompts {
    [key: string]: PromptBase | AtomicPrompt;
}

const PROMPTS: Prompts = {
    "end-of-day": {
        name: "end-of-day",
        description:
            "Engage in a thoughtful reflection on the day's activities, accomplishments, and insights. "
    },
    "system-prompt": {
        name: "system-prompt",
        description:
            "Personal pair programmer and frictionless note-taker focused on capturing insights, tracking accomplishments, and remembering useful information"
    },
    "is-this-atomic": {
        name: "is-this-atomic",
        description: "Determine if the user's thought is atomic enough to be captured",
        arguments: [
            { name: "thought", description: "text to analyze", required: true }
        ]
    }
};

// Create MCP server with resource provider
const resourceProvider = new NotesResourceProvider(NOTES_PATH);

// Create MCP server
const server = new Server(
    {
        name: "mcp-notes",
        version: "0.1.0-alpha"
    },
    {
        capabilities: {
            tools: { enabled: true },
            prompts: { enabled: true },
            resources: { enabled: true }
        }
    }
);

// Define the tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: getToolDefinitions(),
        prompts: Object.values(PROMPTS)
    };
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
        prompts: Object.values(PROMPTS)
    };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const prompt = PROMPTS[request.params.name];
    if (!prompt) {
        throw new Error(`Prompt not found: ${request.params.name}`);
    }
    if (request.params.name === "is-this-atomic") {
        return {
            messages: [
                { role: "assistant", 
                    content: { type: "text", text: `
                        You are an experienced note-taking and personal knowledge management expert. Your task is to evaluate the practical atomicity of a note and provide directly applicable suggestions for improvement. Your goal is to help create notes that are highly interconnected, readily usable in writing, and represent clear, singular insights that will remain valuable over time within a personal knowledge system.

Here is the note content to evaluate:

<note_content>
${request.params.arguments?.thought}
</note_content>

Before providing your final evaluation, please analyze this note thoroughly. Consider the following criteria:

1. Focus: Does the note primarily address a single, self-contained idea or thought?
2. Interconnectivity: How easily can this note be connected with precision to other specific notes in the user's idea journal?
3. Writing Integration: Can this note be easily pulled into a draft as a distinct, self-contained idea without significant modification?
4. Future Clarity: Will the core idea of this note be clear and easily grasped without immediate context?

Break down the note's content and structure inside <note_breakdown> tags. This will ensure a thorough interpretation of the information. In your breakdown:

a. Quote the main idea or ideas from the note.
b. List any supporting details or examples.
c. Identify any potential separate concepts that could be split into their own notes.
d. Consider how easily the note could be linked to other topics and used in writing.

It's okay for this section to be quite long, as we want a thorough analysis.

After your analysis, provide an evaluation structured as follows:

<evaluation>
1. Practical Assessment of Core Focus:
[Your assessment here]

2. Concrete Strategies for Breakdown (if needed):
[Your strategies here, or state if not needed]

3. Actionable Reframing Suggestions:
[Your suggestions here]

4. Needs Refinement: 
[List of ideas that need refinement and not suitable]

</evaluation>

In your evaluation:

1. Practical Assessment of Core Focus:
   Clearly state whether the note centers around a single, manageable idea. Point out any instances where the note juggles multiple distinct concepts or where its focus is unclear from a practical perspective.

2. Concrete Strategies for Breakdown (if needed):
   If the note contains multiple ideas, provide step-by-step suggestions on how to break it down into separate, more atomic notes. For each potential new note, articulate the single core idea it should capture. Explain why this separation would be more practical for linking, writing, and long-term understanding within the user's personal knowledge system. Use specific examples related to the content of the original note if possible.

3. Actionable Reframing Suggestions:
   If the note's idea feels too broad or unfocused for practical use, suggest specific alternative phrasings or angles to make it more atomic. Not all thoughts are atomic and do not force them to be. Provide examples of how reframing the note to address a more narrow and well-defined idea would enhance its ability to form meaningful connections and serve as a clear building block in thinking and writing.

Remember, the goal is to create notes that represent singular, clear insights, fostering a highly interconnected and practical personal knowledge system. Ensure your evaluation is specific, practical, and directly related to improving the note's atomicity for effective use in the user's idea journal.
                        ` } }
            ]
        };
    }

    if (request.params.name === "end-of-day") {
        return {
            messages: [
                {
                    role: "assistant",
                    content: {
                        type: "text",
                        text: `
          You are a thoughtful conversation partner helping the user refine their ideas at the end of each workday. 
          Keep the conversation light and casual, with the grace of Richard Feynman.
          You are a thought librarian, responsible for taking ideas from short-term memory into long-term storage and preparing them in such a way that
          they are broadly applicable to future contexts.
          Your goal is to help them extract meaningful knowledge and connections from their daily experiences in a casual, conversational manner.

At the beginning of each conversation:
1. Use the knowledge graph MCP tools to retrieve all existing information about the user, their work, projects, domain knowledge, and relationships
2. Reference this knowledge throughout the conversation without explicitly mentioning you're using a "knowledge graph" or "memory"

As the conversation flows naturally:
- Listen for promising ideas, patterns, and connections they might miss
- When they mention concepts, people, or projects, mentally connect these to existing entities in the knowledge graph
- Pay attention to new information that could create new entities or relationships
- Notice when information might update or contradict existing knowledge
- Avoid asking too many questions before allowing the user to speak. Remember it's a marathon, not a sprint.
- Not everything is worth capturing. Only capture things that are meaningful and worth remembering.

When you notice something promising or valuable, gently prod for more details with casual follow-up questions that reference their existing knowledge:
- "That's interesting - how does that connect to [known component/concept from knowledge graph]?"
- "I remember you were working on [previous project/feature from knowledge graph] - does this relate to that work?"
- "Last time you mentioned [previous challenge/concern from knowledge graph] - has your thinking evolved on that?"
- "This seems to build on your interest in [known interest/goal from knowledge graph] - is that right?"

Help distinguish which ideas deserve permanent capture by showing genuine curiosity about what seems most significant, especially when it:
- Connects to multiple existing entities in their knowledge graph
- Represents a meaningful pattern or principle
- Solves a previously noted problem or challenge
- Fills a gap you've noticed in their existing knowledge

Throughout the conversation, use your knowledge graph tools to:
- Add new entities when significant concepts, people, or projects are discussed
- Create new relationships between entities
- Add observations to existing entities when new insights emerge
- Update existing knowledge when better information is available

At the end of the conversation, without mentioning the knowledge graph explicitly, share a brief reflection on key insights that emerged, emphasizing connections to their broader work and interests that you've stored in your memory.
          `
                    }
                }
            ]
        };
    }

    if (request.params.name === "system-prompt") {
        try {
            const systemPromptContent = await loadSystemPrompt();

            return {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: systemPromptContent
                        }
                    }
                ]
            };
        } catch (error) {
            console.error("Error loading system prompt:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error("Failed to load system prompt: " + errorMessage);
        }
    }

    throw new Error("Prompt implementation not found");
});

// Resource handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    // Type assertion to satisfy the MCP SDK type requirements
    return resourceProvider.listResources() as any;
});

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    // Type assertion to satisfy the MCP SDK type requirements
    return resourceProvider.listResourceTemplates() as any;
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    // Type assertion to satisfy the MCP SDK type requirements
    return resourceProvider.readResource(request.params.uri) as any;
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    // Type assertion to satisfy the MCP SDK type requirements
    return handleToolCall(NOTES_PATH, name, args) as any;
});

// Start server
async function runServer() {
    // Use STDERR for logging since STDOUT is for JSON communication
    console.error(`Starting MCP Notes v0.1.0-alpha server with notes path: ${NOTES_PATH}`);

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("MCP Notes server running on stdio");
}

runServer().catch((error: unknown) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
