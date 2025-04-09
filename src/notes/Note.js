import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';

export class Note {
  constructor(notesBasePath, relativePath, options = {}) {
    this.basePath = notesBasePath;
    this.relativePath = relativePath;
    this.tags = options.tags || [];
    this.content = options.content || '';
    this.dateInfo = this._formatDate(options.date || new Date());
    this.exists = false; // Will be set when loaded
  }
  
  get fullPath() {
    return path.join(this.basePath, this.relativePath);
  }
  
  _formatDate(date) {
    return {
      dayOfWeek: format(date, 'EEEE'),
      fullDate: format(date, 'MMMM d, yyyy'),
      isoDate: format(date, 'yyyy-MM-dd'),
      time: format(date, 'h:mm a')
    };
  }
  
  _createFrontmatter() {
    const tagString = this.tags.length > 0 
      ? `\ntags:\n${this.tags.map(tag => `  - ${tag}`).join('\n')}` 
      : '';
      
    return `---
created: ${this.dateInfo.isoDate}${tagString}
---

`;
  }
  
  async _ensureDirectoryExists() {
    const dirPath = path.dirname(this.fullPath);
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
  
  async load() {
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
      if (error.code === 'ENOENT') {
        this.exists = false;
        return false;
      }
      throw error;
    }
  }
  
  setContent(content) {
    this.content = content;
    return this;
  }
  
  addTags(newTags) {
    // Merge tags, removing duplicates
    this.tags = [...new Set([...this.tags, ...newTags])];
    return this;
  }
  
  async save() {
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
      return {
        success: false,
        error: error.message
      };
    }
  }
}
