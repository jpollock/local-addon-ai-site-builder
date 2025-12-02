/**
 * Project Manager - Handles persistent storage of projects and conversations
 *
 * Stores each project as a separate JSON file in the projects/ directory.
 * Projects include conversation history, site structure, and build status.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Project, Conversation } from '../common/types';
import { validatePath } from './utils/validators';

export class ProjectManager {
  private projectsDir: string;
  private conversationsDir: string;

  constructor(userDataPath: string) {
    const addonDataDir = path.join(userDataPath, 'ai-site-builder');

    // Create directories for projects and conversations
    this.projectsDir = path.join(addonDataDir, 'projects');
    this.conversationsDir = path.join(addonDataDir, 'conversations');

    if (!fs.existsSync(this.projectsDir)) {
      fs.mkdirSync(this.projectsDir, { recursive: true });
    }

    if (!fs.existsSync(this.conversationsDir)) {
      fs.mkdirSync(this.conversationsDir, { recursive: true });
    }
  }

  /**
   * Validate an ID to prevent path traversal attacks
   * Throws if the ID contains dangerous patterns
   */
  private validateId(id: string, type: 'project' | 'conversation'): void {
    if (!id || typeof id !== 'string') {
      throw new Error(`Invalid ${type} ID: must be a non-empty string`);
    }

    // Check for path traversal patterns
    if (!validatePath(id)) {
      throw new Error(`Invalid ${type} ID: contains path traversal patterns`);
    }

    // Ensure ID only contains safe characters (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error(`Invalid ${type} ID: contains disallowed characters`);
    }

    // Limit ID length to prevent excessively long filenames
    if (id.length > 255) {
      throw new Error(`Invalid ${type} ID: exceeds maximum length`);
    }
  }

  /**
   * Get a safe file path for a project or conversation
   * Validates the ID and ensures the resulting path is within the expected directory
   */
  private getSafePath(id: string, dir: string, type: 'project' | 'conversation'): string {
    this.validateId(id, type);

    const filePath = path.join(dir, `${id}.json`);

    // Resolve to absolute path and verify it's within the expected directory
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(dir);

    if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
      throw new Error(`Invalid ${type} ID: path escape detected`);
    }

    return filePath;
  }

  // ========================================
  // Project Management
  // ========================================

  /**
   * Get all projects
   */
  getAllProjects(): Project[] {
    try {
      const files = fs.readdirSync(this.projectsDir);
      const projects: Project[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const projectPath = path.join(this.projectsDir, file);
          const data = fs.readFileSync(projectPath, 'utf-8');
          projects.push(JSON.parse(data));
        }
      }

      // Sort by most recent first
      return projects.sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });
    } catch (error) {
      console.error('[Project Manager] Error loading projects:', error);
      return [];
    }
  }

  /**
   * Get a specific project by ID
   */
  getProject(projectId: string): Project | null {
    try {
      // Validate ID and get safe path to prevent path traversal
      const projectPath = this.getSafePath(projectId, this.projectsDir, 'project');

      if (fs.existsSync(projectPath)) {
        const data = fs.readFileSync(projectPath, 'utf-8');
        return JSON.parse(data);
      }

      return null;
    } catch (error) {
      console.error(`[Project Manager] Error loading project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Create a new project
   */
  createProject(project: Project): void {
    try {
      // Validate ID and get safe path to prevent path traversal
      const projectPath = this.getSafePath(project.id, this.projectsDir, 'project');
      const data = JSON.stringify(project, null, 2);
      fs.writeFileSync(projectPath, data, 'utf-8');
    } catch (error) {
      console.error('[Project Manager] Error creating project:', error);
      throw new Error('Failed to create project');
    }
  }

  /**
   * Update an existing project
   */
  updateProject(projectId: string, updates: Partial<Project>): void {
    try {
      // Validate ID and get safe path to prevent path traversal
      const projectPath = this.getSafePath(projectId, this.projectsDir, 'project');
      const project = this.getProject(projectId);

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const updated = { ...project, ...updates, updatedAt: new Date().toISOString() };
      const data = JSON.stringify(updated, null, 2);
      fs.writeFileSync(projectPath, data, 'utf-8');
    } catch (error) {
      console.error(`[Project Manager] Error updating project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a project
   */
  deleteProject(projectId: string): void {
    try {
      // Get project first (includes validation)
      const project = this.getProject(projectId);

      // Validate ID and get safe path to prevent path traversal
      const projectPath = this.getSafePath(projectId, this.projectsDir, 'project');

      if (fs.existsSync(projectPath)) {
        fs.unlinkSync(projectPath);
      }

      // Also delete associated conversation if it exists
      if (project?.conversationId) {
        this.deleteConversation(project.conversationId);
      }
    } catch (error) {
      console.error(`[Project Manager] Error deleting project ${projectId}:`, error);
      throw error;
    }
  }

  // ========================================
  // Conversation Management
  // ========================================

  /**
   * Get a conversation by ID
   */
  getConversation(conversationId: string): Conversation | null {
    try {
      // Validate ID and get safe path to prevent path traversal
      const conversationPath = this.getSafePath(
        conversationId,
        this.conversationsDir,
        'conversation'
      );

      if (fs.existsSync(conversationPath)) {
        const data = fs.readFileSync(conversationPath, 'utf-8');
        return JSON.parse(data);
      }

      return null;
    } catch (error) {
      console.error(`[Project Manager] Error loading conversation ${conversationId}:`, error);
      return null;
    }
  }

  /**
   * Create a new conversation
   */
  createConversation(conversation: Conversation): void {
    try {
      // Validate ID and get safe path to prevent path traversal
      const conversationPath = this.getSafePath(
        conversation.id,
        this.conversationsDir,
        'conversation'
      );
      const data = JSON.stringify(conversation, null, 2);
      fs.writeFileSync(conversationPath, data, 'utf-8');
    } catch (error) {
      console.error('[Project Manager] Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  /**
   * Update an existing conversation
   */
  updateConversation(conversationId: string, updates: Partial<Conversation>): void {
    try {
      // Validate ID and get safe path to prevent path traversal
      const conversationPath = this.getSafePath(
        conversationId,
        this.conversationsDir,
        'conversation'
      );
      const conversation = this.getConversation(conversationId);

      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      const updated = { ...conversation, ...updates, updatedAt: new Date().toISOString() };
      const data = JSON.stringify(updated, null, 2);
      fs.writeFileSync(conversationPath, data, 'utf-8');
    } catch (error) {
      console.error(`[Project Manager] Error updating conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a conversation
   */
  deleteConversation(conversationId: string): void {
    try {
      // Validate ID and get safe path to prevent path traversal
      const conversationPath = this.getSafePath(
        conversationId,
        this.conversationsDir,
        'conversation'
      );

      if (fs.existsSync(conversationPath)) {
        fs.unlinkSync(conversationPath);
      }
    } catch (error) {
      console.error(`[Project Manager] Error deleting conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Get conversation history (messages only)
   */
  getConversationHistory(conversationId: string) {
    const conversation = this.getConversation(conversationId);
    return conversation?.messages || [];
  }
}
