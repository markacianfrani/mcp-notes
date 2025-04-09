import fs from "fs/promises";
import path from "path";

/**
 * Provides access to notes as MCP resources, handling discovery and content retrieval
 */
export class NotesResourceProvider {
    constructor(notesPath) {
        this.notesPath = notesPath;
    }

    /**
     * Lists all available resources in the notes directory
     */
    async listResources() {
        try {
            const resources = await this.#getAllFiles(this.notesPath);
            return { resources };
        } catch (error) {
            console.error("Error listing resources:", error);
            throw error;
        }
    }

    /**
     * Lists available resource templates
     */
    async listResourceTemplates() {
        try {
            const templates = [
                {
                    uriTemplate: "file://{notes_path}/Log/{date}.md",
                    name: "Daily Log",
                    description:
                        "Access a specific daily log by date (YYYY-MM-DD format)",
                    mimeType: "text/markdown"
                },
                {
                    uriTemplate: "file://{notes_path}/Rollups/{date}-rollup.md",
                    name: "Daily Rollup",
                    description:
                        "Access a specific daily rollup by date (YYYY-MM-DD format)",
                    mimeType: "text/markdown"
                }
            ];

            return {
                resourceTemplates: templates.map((template) => ({
                    ...template,
                    uriTemplate: template.uriTemplate.replace(
                        "{notes_path}",
                        this.notesPath
                    )
                }))
            };
        } catch (error) {
            console.error("Error listing resource templates:", error);
            throw error;
        }
    }

    /**
     * Reads the contents of a resource
     */
    async readResource(uri) {
        try {
            if (!uri.startsWith("file://")) {
                throw new Error("Invalid URI scheme");
            }

            const filePath = uri.slice(7); // Remove 'file://' prefix

            // Verify the file is within NOTES_PATH
            const relativePath = path.relative(this.notesPath, filePath);
            if (
                relativePath.startsWith("..") ||
                path.isAbsolute(relativePath)
            ) {
                throw new Error(
                    "Access denied: File is outside of notes directory"
                );
            }

            // Read the file contents
            const contents = await fs.readFile(filePath, "utf8");

            return {
                contents: [
                    {
                        uri,
                        mimeType: filePath.endsWith(".md")
                            ? "text/markdown"
                            : "text/plain",
                        text: contents
                    }
                ]
            };
        } catch (error) {
            console.error("Error reading resource:", error);
            throw error;
        }
    }

    /**
     * Recursively gets all files in a directory
     * @private
     */
    async #getAllFiles(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files = await Promise.all(
            entries.map(async (entry) => {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    return this.#getAllFiles(fullPath);
                } else {
                    // Only include markdown and text files
                    if (
                        entry.name.endsWith(".md") ||
                        entry.name.endsWith(".txt")
                    ) {
                        const relativePath = path.relative(
                            this.notesPath,
                            fullPath
                        );
                        return [
                            {
                                uri: `file://${fullPath}`,
                                name: relativePath,
                                description: entry.name.includes("rollup")
                                    ? "Daily activity rollup"
                                    : "Daily log entry",
                                mimeType: entry.name.endsWith(".md")
                                    ? "text/markdown"
                                    : "text/plain"
                            }
                        ];
                    }
                    return [];
                }
            })
        );
        return files.flat();
    }
}
