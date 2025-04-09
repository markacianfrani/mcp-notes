# MCP Notes Technical Context

## Technologies Used

### Core Technologies

1. **Node.js**: The runtime environment for the MCP server.
2. **JavaScript (ES Modules)**: The programming language used for implementation.
3. **Model Context Protocol (MCP)**: The protocol for communication between the server and clients.
4. **Markdown**: The format used for storing notes and templates.

### Key Libraries and Dependencies

1. **@modelcontextprotocol/sdk**: The SDK for implementing MCP servers.
2. **date-fns**: Library for date formatting and manipulation.
3. **fs/promises**: Node.js file system module with Promise-based API.
4. **path**: Node.js path module for file path operations.
5. **minimatch**: Library for glob pattern matching in file searches.

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- Claude Desktop or other MCP-compatible client

### Project Structure

```
/
├── index.js              # Main entry point
├── package.json          # Project dependencies
├── prompts/              # Prompt templates
│   ├── template-loader.js # Template loading utilities
│   └── templates/        # Template files
│       ├── daily-log.md  # Daily log template
│       └── rollup.md     # Rollup template
├── search-utils.js       # Search utilities
└── src/                  # Source code
    ├── resources/        # MCP resources
    │   └── index.js      # Resource definitions
    └── tools/            # MCP tools
        └── index.js      # Tool definitions and handlers
```

### Configuration

The MCP Notes server can be configured through:

1. **Command-line arguments**: The first argument specifies the notes directory.
2. **Environment variables**: `MCP_NOTES_DIR` can be set to specify the notes directory.
3. **Claude Desktop configuration**: The server is configured in the Claude Desktop config file.

Example Claude Desktop configuration:

```json
{
  "mcpServers": {
    "notes": {
      "command": "node",
      "args": [
        "/path/to/mcp-notes/index.js",
        "/path/to/notes/directory"
      ],
      "cwd": "/path/to/mcp-notes"
    }
  }
}
```

## Technical Constraints

### MCP Protocol Limitations

1. **One-way Communication**: The MCP protocol is primarily designed for one-way communication, with clients making requests and servers responding. This limits the ability to implement true conversational features.

2. **No Persistent State**: The MCP server does not maintain session state between requests. Each request is handled independently.

3. **Limited UI Capabilities**: The MCP protocol does not provide direct UI capabilities. All interaction must be text-based through the client.

### File System Constraints

1. **File Access Restrictions**: The server can only access files within the configured notes directory for security reasons.

2. **Concurrent Access**: The server does not implement file locking, so concurrent access to the same files could potentially cause conflicts.

3. **File Size Limitations**: Very large files may cause performance issues when reading or writing.

### Client Compatibility

1. **Claude Desktop**: The primary client for MCP Notes, with full support for all features.

2. **Other MCP Clients**: May have varying levels of support for MCP features.

## Dependencies

### Runtime Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.3.0",
    "date-fns": "^2.30.0",
    "minimatch": "^5.1.0"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    "eslint": "^8.40.0",
    "prettier": "^2.8.8"
  }
}
```

## Deployment Considerations

1. **Local Installation**: The MCP Notes server is designed to be installed and run locally on the user's machine.

2. **Claude Desktop Integration**: The server must be configured in the Claude Desktop config file to be accessible.

3. **Notes Directory**: The notes directory should be in a location that is:
   - Accessible to the server
   - Backed up regularly
   - Not in a temporary location

4. **Permissions**: The server needs read/write permissions for the notes directory.

## Performance Considerations

1. **Template Caching**: Templates are cached to improve performance when generating notes and rollups.

2. **File System Operations**: File system operations are the main performance bottleneck, especially for search operations on large note collections.

3. **Memory Usage**: The server has a small memory footprint, primarily used for caching templates and handling requests.

## Security Considerations

1. **Path Traversal Prevention**: The server validates file paths to prevent access to files outside the notes directory.

2. **Local-only Access**: The server only listens on stdio, not on network interfaces, limiting access to local processes.

3. **No Authentication**: The server does not implement authentication, relying on the security of the local system.
