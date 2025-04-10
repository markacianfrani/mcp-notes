import path from 'path';
import { format } from 'date-fns';
import { Note } from './Note.js';

interface LogNoteOptions {
  date?: Date;
  tags?: string[];
}

export class LogNote extends Note {
  template: string;

  constructor(notesBasePath: string, options: LogNoteOptions = {}) {
    const date = options.date || new Date();
    const dateInfo = {
      dayOfWeek: format(date, 'EEEE'),
      fullDate: format(date, 'MMMM d, yyyy'),
      isoDate: format(date, 'yyyy-MM-dd'),
      time: format(date, 'h:mm a')
    };
    
    // Log notes always go in the Log directory with date-based filename
    const relativePath = path.join('Log', `${dateInfo.isoDate}.md`);
    
    super(notesBasePath, relativePath, { 
      ...options, 
      date 
    });
    
    this.template = `# ${this.dateInfo.dayOfWeek}, ${this.dateInfo.fullDate}\n\n`;
  }
  
  addEntry(entry: string): LogNote {
    // If note doesn't exist yet, initialize with template
    if (!this.exists && !this.content && this.template) {
      this.content = this.template;
    }
    
    // Add entry with timestamp
    this.content += `\n### [${this.dateInfo.time}]\n${entry}`;
    return this;
  }
  
  async appendEntry(entry: string) {
    // Load existing content if available
    if (!this.exists) {
      await this.load();
      
      // If still no content, load template
      if (!this.template) {
        await this.loadTemplate();
      }
      
      if (!this.content && this.template) {
        this.content = this.template;
      }
    }
    
    // Add the entry
    this.addEntry(entry);
    
    // Save the updated note
    return await this.save();
  }

  // This method is referenced but not implemented in the original JS file
  // Adding it here for completeness
  async loadTemplate(): Promise<void> {
    try {
      // Implementation would depend on how templates are loaded
      // For now, we'll just use the default template
      this.template = `# ${this.dateInfo.dayOfWeek}, ${this.dateInfo.fullDate}\n\n`;
    } catch (error) {
      console.error("Error loading template:", error);
    }
  }
}
