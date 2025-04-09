# MCP Notes Project Brief

## Project Overview

MCP Notes is a personal, tool-agnostic notetaker that serves as a rubber duck for problem-solving and logs notes to the user's notes directory. It is implemented as an MCP (Model Context Protocol) server that can be accessed by MCP clients like Claude Desktop.

## Core Requirements

1. **Frictionless Note Capture**: Allow users to quickly capture thoughts, insights, and tasks with minimal friction.
2. **Rubber Duck Functionality**: Serve as a conversational partner for problem-solving and idea exploration.
3. **Daily Logs**: Maintain chronological daily logs of captured notes.
4. **Rollup Summaries**: Create organized summaries of daily notes, categorizing them into achievements, insights, and action items.
5. **Search Capability**: Provide tools to search and retrieve notes across the collection.
6. **Template-Based**: Use customizable templates for consistent formatting.

## Key Tools

1. **log**: Capture a thought or insight to the daily log.
2. **rollup**: Synthesize daily notes into an organized summary.
3. **search_files**: Find notes matching specific patterns.
4. **read_note**: Access specific note contents.
5. **list_directory**: Browse the notes directory structure.
6. **create_directory**: Create new organizational structures.
7. **write_note**: Create or update notes directly.

## Technical Constraints

1. Must be implemented as an MCP server using the MCP SDK.
2. Must work with Claude Desktop and other MCP-compatible clients.
3. Must store notes as markdown files in a configurable directory.
4. Must be robust against errors and provide clear error messages.

## Success Criteria

1. Users can capture notes quickly without disrupting their workflow.
2. Daily rollups provide valuable summaries of the day's activities.
3. Notes are easily searchable and retrievable.
4. The system is reliable and handles errors gracefully.
5. Documentation is clear and comprehensive.
