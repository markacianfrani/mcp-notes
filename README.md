# 📚 MCP Notes

A personal knowledge management system built on the Model Context Protocol (MCP) that transforms daily notes into organized, searchable knowledge.

## 🚀 Usage

### 🛠️ Manual Setup

1. **Clone the repository**

   ```bash
   git clone git@github.com:markacianfrani/mcp-notes.git
   cd mcp-notes
   npm i
   ```

2. **Setup MCP**

### 🖥️ Claude Desktop

Add to your claude-desktop-config.json:

```json
"notes": {
    "command": "node",
    "args": [
        "path/to/this/repo/mcp-notes/index.js",
        "path/to/your/notes"
    ],
},
```

## 🌟 Project Vision

MCP Notes aims to solve the problem of knowledge fragmentation by creating a system where daily thoughts, accomplishments, and insights can be:

1. 📥 Captured quickly with minimal friction
2. 🗂️ Organized automatically into meaningful structures
3. 🧠 Synthesized into higher-level knowledge
4. 🔍 Retrieved easily when needed

The goal is to build an external rubber duck that can dump your working memory in real-time from any tool and sort through the garbage.

## 🧩 Core Concepts

### 1. 📅 Daily Logs

Daily logs are the atomic unit of capture in MCP Notes. Each day gets its own markdown file where you can record observations throughout the day. Think of daily logs like a running ledger.

> 💡 TIP: Make use of Claude Desktop's Quick Entry Keyboard Shortcut

MCP is tool-agnostic so you can /log across conversations but also tools as well--ask Copilot or Cursor to log a summary of lessons-learned after fixing a bug or make Claude Desktop save a new approach to an old problem.

### 2. 📊 Rollups

Rollups are automatically generated summaries that condense daily logs into higher-level insights and patterns. They help connect isolated pieces of information into a coherent narrative of your work and thinking.

### 3. 📚 Knowledge Categories

All notes in the system fall into one of four categories:

- **🏆 Accomplishment**: Solving problems, completing features, fixing bugs
- **💡 Insight**: Patterns, architectural decisions, better ways of working
- **📝 TODO**: Tasks connected to larger goals, meaningful improvements
- **📖 Knowledge**: Technical details, context, rationales, techniques

## 🎨 Design Principles

MCP Notes is built on several core design principles:

### 1. 📄 Plain Text First

All notes are stored as plain text Markdown files, ensuring:

- Future-proof storage that won't be locked into proprietary formats
- Version control compatibility
- Easy editing with any text editor
- Transparent data structure

### 2. ✍️ Low Friction Capture

The primary interface is designed to minimize the friction of recording thoughts:

- Simple text input
- Automatic categorization assistance
- No complex organization required at capture time

### 3. 🔄 Progressive Organization

Rather than requiring rigid organization upfront, MCP Notes employs a progressive approach:

- Capture raw thoughts and activities
- Automatically categorize content
- Generate periodic summaries
- Connect related items over time

### 4. 🤖 AI Augmentation

The system leverages AI to enhance human thinking, not replace it:

- Help categorize information
- Generate summaries and connections
- Surface relevant past notes
- Identify patterns across time


## 🧰 Available Tools

MCP Notes provides a set of tools that can be invoked through Claude Desktop or other MCP-compatible clients. These tools allow you to capture, organize, and retrieve your notes.

### 📝 Core Note Tools

#### `/log`

Creates or updates today's daily log file with your notes.

Invoke with: "log this to my daily log: ...", "add a summary of that to my log: ...."

#### `/rollup`

Synthesizes daily notes into an organized summary with categories, connections, and action items.

Invoke with: "rollup my notes for today"

#### `write_note`

Creates a new note or overwrites an existing note with content.

#### `sticky`

Evaluates the "stickiness" of a thought based on actionability, longevity, findability, and future reference value.

Invoke with: "Is this idea sticky?"

### 📂 File System Tools

#### `search_files`

Recursively searches for files and directories matching a pattern in your notes directory.

#### `read_note`

Reads the complete contents of a note file from your notes directory.

#### `read_multiple_notes`

Reads the contents of multiple note files simultaneously.

#### `list_directory`

Lists the contents of a directory in your notes.

#### `create_directory`

Creates a new directory in your notes.

See the [CHANGELOG.md](CHANGELOG.md) file for version history and changes.

## 💡 Available Prompts

### Is this atomic?

Breaks down ideas into their simplest standalone parts. Use this prompt to turn large ideas into smaller concepts. Smaller notes can be linked to other notes much more easily.