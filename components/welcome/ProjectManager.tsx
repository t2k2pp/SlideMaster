import React, { useState, useEffect } from 'react';
import { Presentation } from '../../types';
import { 
  Clock, 
  FileText, 
  Copy, 
  Trash2, 
  Download, 
  Upload, 
  HardDrive,
  MoreVertical,
  Archive,
  Search
} from 'lucide-react';
import * as storageService from '../../services/unifiedStorageService';
import { exportProject } from '../../services/export/projectExporter';
import { toast } from 'react-hot-toast';

// =================================================================
// Project Manager Component - 完全なプロジェクト管理システム
// =================================================================

interface ProjectManagerProps {
  onLoadPresentation: (id: string) => void;
  onImportProject: (file: File) => void;
  isProcessing: boolean;
}

interface StorageInfo {
  indexedDB: any;
  localStorage: any;
  total: {
    size: number;
    presentationCount: number;
  };
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  onLoadPresentation,
  onImportProject,
  isProcessing
}) => {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Load presentations and storage info
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [loadedPresentations, usage] = await Promise.all([
        storageService.listPresentations(),
        storageService.getStorageUsage()
      ]);
      setPresentations(loadedPresentations);
      setStorageInfo(usage);
    } catch (error) {
      console.error('Error loading project data:', error);
      toast.error('Failed to load project data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter presentations based on search query
  const filteredPresentations = presentations.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Format date for display
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Handle project actions
  const handleDuplicate = async (id: string, title: string) => {
    const duplicateId = `duplicate-${id}`;
    try {
      toast.loading('Duplicating project...', { id: duplicateId });
      const newId = await storageService.duplicatePresentation(id);
      toast.success(`Duplicated "${title}"`, { id: duplicateId });
      await loadData(); // Refresh list
    } catch (error) {
      console.error('Error duplicating project:', error);
      toast.error('Failed to duplicate project', { id: duplicateId });
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    const deleteId = `delete-${id}`;
    try {
      toast.loading('Deleting project...', { id: deleteId });
      
      // Detailed logging for debugging
      console.log(`🗑️ Attempting to delete project:`, { id, title });
      
      // Attempt deletion
      await storageService.deletePresentation(id);
      
      // Verify deletion
      const remaining = await storageService.loadPresentation(id);
      if (remaining) {
        throw new Error('Deletion verification failed - project still exists');
      }
      
      toast.success(`Successfully deleted "${title}"`, { id: deleteId });
      console.log(`✅ Successfully deleted project: ${title}`);
      
      // Refresh list after successful deletion
      await loadData();
      
    } catch (error) {
      console.error('🚨 Detailed deletion error:', {
        projectId: id,
        projectTitle: title,
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        fullError: error
      });
      
      // Show user-friendly error message
      const errorMsg = error?.message?.includes('verification failed') 
        ? 'Project deletion incomplete. Please try again or clear browser cache.'
        : 'Failed to delete project. Please try again.';
        
      toast.error(errorMsg, { id: deleteId, duration: 5000 });
      
      // Try to refresh data anyway in case of partial deletion
      try {
        await loadData();
      } catch (refreshError) {
        console.error('Failed to refresh data after deletion error:', refreshError);
      }
    }
  };

  const handleExport = async (presentation: Presentation) => {
    const exportId = `export-${presentation.id}`;
    try {
      toast.loading('Exporting project file...', { id: exportId });
      
      console.log(`📦 Exporting project: ${presentation.title}`);
      
      // Use the existing project export service
      const exportResult = await exportProject(presentation);
      
      if (exportResult.success) {
        toast.success(`Project exported: "${presentation.title}"`, { id: exportId });
        console.log(`✅ Successfully exported: ${presentation.title}`);
      } else {
        throw new Error(exportResult.error || 'Export failed');
      }
      
    } catch (error) {
      console.error('Error exporting project:', error);
      const errorMsg = error?.message || 'Failed to export project';
      toast.error(`Export failed: ${errorMsg}`, { id: exportId, duration: 5000 });
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.slidemaster';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onImportProject(file);
        // Refresh after import (delay to allow import to complete)
        setTimeout(loadData, 1000);
      }
    };
    input.click();
  };

  const performMigration = async () => {
    const migrationId = 'migration-' + Date.now();
    try {
      toast.loading('Migrating projects to IndexedDB...', { id: migrationId });
      const result = await storageService.performCleanupAndMigration();
      
      if (result.errors.length > 0) {
        toast.error(`Migration completed with ${result.errors.length} errors`, { 
          id: migrationId, 
          duration: 6000 
        });
        console.error('Migration errors:', result.errors);
      } else {
        toast.success(`Successfully migrated ${result.migrated} projects`, { id: migrationId });
      }
      
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Migration failed:', error);
      toast.error('Migration failed', { id: migrationId });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Project Manager
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Manage your presentations and storage
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleImport}
            disabled={isProcessing}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-400 transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={performMigration}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
          >
            <Archive className="w-4 h-4" />
            Migrate
          </button>
        </div>
      </div>

      {/* Storage Usage */}
      {storageInfo && (
        <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-200">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Storage Usage</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <div className="text-slate-600">Total Projects</div>
              <div className="font-semibold text-slate-900">{storageInfo.total.presentationCount}</div>
            </div>
            <div>
              <div className="text-slate-600">Total Size</div>
              <div className="font-semibold text-slate-900">{formatSize(storageInfo.total.size)}</div>
            </div>
            <div>
              <div className="text-slate-600">IndexedDB</div>
              <div className="font-semibold text-green-600">{formatSize(storageInfo.indexedDB.totalSize)}</div>
            </div>
            <div>
              <div className="text-slate-600">Images</div>
              <div className="font-semibold text-blue-600">{storageInfo.indexedDB.imageCount} files</div>
            </div>
          </div>
          
          {/* Top Storage Consumers */}
          {storageInfo.indexedDB.projectBreakdown && storageInfo.indexedDB.projectBreakdown.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-slate-600 mb-2 uppercase tracking-wide">
                Largest Projects ({storageInfo.indexedDB.projectBreakdown.slice(0, 5).length} of {storageInfo.indexedDB.projectBreakdown.length})
              </h5>
              <div className="space-y-2">
                {storageInfo.indexedDB.projectBreakdown.slice(0, 5).map((project: any) => (
                  <div key={project.id} className="flex items-center justify-between bg-white p-2 rounded border">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 text-sm truncate">{project.title}</div>
                      <div className="text-xs text-slate-500">
                        {project.imageCount} images • Modified {formatDate(new Date(project.lastModified))}
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="font-semibold text-slate-900 text-sm">
                        {formatSize(project.totalSize)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {Math.round((project.totalSize / storageInfo.total.size) * 100)}% of total
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {storageInfo.indexedDB.projectBreakdown.length > 5 && (
                <div className="text-xs text-slate-500 mt-2 text-center">
                  ...and {storageInfo.indexedDB.projectBreakdown.length - 5} more projects
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Projects List */}
      <div className="space-y-2">
        {filteredPresentations.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">
              {searchQuery ? 'No projects found matching your search' : 'No presentations found'}
            </p>
            {!searchQuery && (
              <p className="text-sm text-slate-500">
                Create your first presentation to get started
              </p>
            )}
          </div>
        ) : (
          filteredPresentations.map((presentation) => (
            <div
              key={presentation.id}
              className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-md border border-transparent hover:border-slate-200 transition-all group"
            >
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => onLoadPresentation(presentation.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                    {presentation.title.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {presentation.title}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(presentation.updatedAt || presentation.createdAt)}
                      </div>
                      <div>{presentation.slides?.length || 0} slides</div>
                      {/* プロジェクト個別のサイズ表示 */}
                      {storageInfo?.indexedDB?.projectBreakdown && (() => {
                        const projectInfo = storageInfo.indexedDB.projectBreakdown.find(
                          (p: any) => p.id === presentation.id
                        );
                        if (projectInfo) {
                          return (
                            <div className="flex items-center gap-1 text-xs">
                              <HardDrive className="w-3 h-3" />
                              <span className="font-medium text-blue-600">
                                {formatSize(projectInfo.totalSize)}
                              </span>
                              {projectInfo.imageCount > 0 && (
                                <span className="text-slate-500">
                                  ({projectInfo.imageCount} images)
                                </span>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === presentation.id ? null : presentation.id);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                
                {activeDropdown === presentation.id && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(presentation.id, presentation.title);
                        setActiveDropdown(null);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Duplicate
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(presentation);
                        setActiveDropdown(null);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      title="Export as .slidemaster project file"
                    >
                      <Download className="w-4 h-4" />
                      Export Project
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(presentation.id, presentation.title);
                        setActiveDropdown(null);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Click outside to close dropdown */}
      {activeDropdown && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setActiveDropdown(null)}
        />
      )}
    </div>
  );
};