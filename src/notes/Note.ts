import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';

interface DateInfo {
  dayOfWeek: string;
  fullDate: string;
  isoDate: string;
  time: string;
}

interface NoteOptions {
  tags?: string[];
  content?: string;
  date?: Date;
}

interface SaveResult {
  success: boolean;
  path?: string;
  content?: string;
  error?: string;
}

export class Note {
  protected basePath: string;
  protected relativePath: string;
  protected tags: string[];
  protected content: string;
  protected dateInfo: DateInfo;
  protected exists: boolean;
  
  constructor(notesBasePath: string, relativePath: string, options: NoteOptions = {}) {
    this.basePath = notesBasePath;
    this.relativePath = relativePath;
    this.tags = options.tags || [];
    this.content = options.content || '';
    this.dateInfo = this._formatDate(options.date || new Date());
    this.exists = false; // Will be set when loaded
  }
  
  get fullPath(): string {
    return path.join(this.basePath, this.relativePath);
  }
  
  protected _formatDate(date: Date): DateInfo {
    return {
      dayOfWeek: format(date, 'EEEE'),
      fullDate: format(date, 'MMMM d, yyyy'),
      isoDate: format(date, 'yyyy-MM-dd'),
      time: format(date, 'h:mm a')
    };
  }
  
  protected _createFrontmatter(): string {
    const tagString = this.tags.length > 0 
      ? `\ntags:\n${this.tags.map(tag => `  - ${tag}`).join('\n')}` 
      : '';
      
    return `---
created: ${this.dateInfo.isoDate}${tagString}
---

`;
  }
  
  protected async _ensureDirectoryExists(): Promise<boolean> {
    const dirPath = path.dirname(this.fullPath);
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return true;
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code === 'EEXIST') {
        return true;
      }
      console.error(`Error creating directory ${dirPath}:`, err);
      return false;
    }
  }
  
  async load(): Promise<boolean> {
    try {
      const content = await fs.readFile(this.fullPath, 'utf8');
      this.exists = true;
      
      // Parse frontmatter if it exists
      if (content.startsWith('---')) {
        const frontmatterEnd = content.indexOf('---', 3);
        if (frontmatterEnd !== -1) {
          const frontmatter = content.substring(3, frontmatterEnd);
          
          // Extract created date
          const createdMatch = frontmatter.match(/created: (.*)/);
          if (createdMatch) {
            const createdDate = new Date(createdMatch[1]);
            this.dateInfo = this._formatDate(createdDate);
          }
          
          // Extract tags
          const tagMatch = frontmatter.match(/tags:\n(?:  - .*\n)*/);
          if (tagMatch) {
            this.tags = tagMatch[0].split('\n')
              .slice(1) // Skip the "tags:" line
              .map(line => line.replace('  - ', ''))
              .filter(tag => tag); // Remove empty strings
          }
          
          // Store content without frontmatter
          this.content = content.substring(frontmatterEnd + 4);
        } else {
          this.content = content;
        }
      } else {
        this.content = content;
      }
      
      return true;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        this.exists = false;
        return false;
      }
      throw error;
    }
  }
  
  setContent(content: string): Note {
    this.content = content;
    return this;
  }
  
  addTags(newTags: string[]): Note {
    // Merge tags, removing duplicates
    this.tags = [...new Set([...this.tags, ...newTags])];
    return this;
  }
  
  async save(): Promise<SaveResult> {
    try {
      // Ensure directory exists
      await this._ensureDirectoryExists();
      
      // Create content with frontmatter
      const frontmatter = this._createFrontmatter();
      const finalContent = frontmatter + this.content;
      
      // Write to file
      await fs.writeFile(this.fullPath, finalContent, 'utf8');
      
      return {
        success: true,
        path: this.relativePath,
        content: finalContent
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}
