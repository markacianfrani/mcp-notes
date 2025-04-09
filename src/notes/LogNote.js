import path from 'path';
import { format } from 'date-fns';
import { Note } from './Note.js';
import { loadAndProcessTemplate } from '../../prompts/template-loader.js';

export class LogNote extends Note {
  constructor(notesBasePath, options = {}) {
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
    
    this.template = `# ${this.dateInfo.dayOfWeek}, ${this.dateInfo.fullDate}\n\n`
  }
  

  addEntry(entry) {
    // If note doesn't exist yet, initialize with template
    if (!this.exists && !this.content && this.template) {
      this.content = this.template;
    }
    
    // Add entry with timestamp
    this.content += `\n### [${this.dateInfo.time}]\n${entry}`;
    return this;
  }
  
  async appendEntry(entry) {
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
}
