import React, { useState, useEffect } from 'react';
import { Folder, File, Plus, FolderPlus, Check, X } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface FileExplorerProps {
  files: FileNode[];
  onFileSelect: (path: string) => void;
  onCreateFile: (path: string, type: 'file' | 'directory') => void;
  currentFile: string;
  socket: Socket | null;
  roomId: string;
  setFiles: (files: FileNode[]) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  onFileSelect,
  onCreateFile,
  currentFile,
  socket,
  roomId,
  setFiles,
}) => {
  const [newFileName, setNewFileName] = useState('');
  const [creating, setCreating] = useState<{ type: 'file' | 'directory'; parentPath: string } | null>(null);

  // Listen for file structure updates from the server
  useEffect(() => {
    if (!socket) return;
    const handleFileUpdate = (updatedFiles: FileNode[]) => {
      setFiles(updatedFiles);
    };

    socket.on('file-updated', handleFileUpdate);

    return () => {
      socket.off('file-updated', handleFileUpdate);
    };
  }, [socket, setFiles]);
  useEffect(() => {
    if (!socket) return;
    
    const handleFileStructure = (structure: FileNode[]) => {
      setFiles(structure);
    };
  
    socket.on('file-structure', handleFileStructure);
    socket.on('file-updated', handleFileStructure); // Reuse the same handler
  
    return () => {
      socket.off('file-structure', handleFileStructure);
      socket.off('file-updated', handleFileStructure);
    };
  }, [socket, setFiles]);
  
  const handleCreate = () => {
    if (!newFileName.trim()) {
      alert('Name cannot be empty');
      return;
    }
    if (!socket || !creating) return;
    // Build the path based on the parent folder
    const filePath = creating.parentPath ? `${creating.parentPath}/${newFileName}` : newFileName;
    onCreateFile(filePath, creating.type);
    setCreating(null);
    setNewFileName('');
  };

  // Recursive tree renderer
  const renderTree = (nodes: FileNode[], parentPath: string = '') => {
    return nodes.map((node) => {
      const path = parentPath ? `${parentPath}/${node.name}` : node.name;
      if (node.type === 'directory') {
        return (
          <div key={path} className="ml-4">
            <div className="flex items-center group">
              <Folder className="w-4 h-4 text-yellow-500 mr-2" />
              <span className="text-gray-700">{node.name}</span>
              <div className="hidden group-hover:flex ml-2 space-x-1">
                <button
                  onClick={() => setCreating({ type: 'file', parentPath: path })}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Plus className="w-3 h-3 text-gray-500" />
                </button>
                <button
                  onClick={() => setCreating({ type: 'directory', parentPath: path })}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <FolderPlus className="w-3 h-3 text-gray-500" />
                </button>
              </div>
            </div>
            {node.children && renderTree(node.children, path)}
          </div>
        );
      }
      return (
        <div
          key={path}
          className={`ml-4 flex items-center cursor-pointer ${
            currentFile === path ? 'bg-blue-100' : 'hover:bg-gray-100'
          } rounded px-2 py-1`}
          onClick={() => onFileSelect(path)}
        >
          <File className="w-4 h-4 text-gray-500 mr-2" />
          <span className="text-gray-700">{node.name}</span>
        </div>
      );
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 h-full overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Files</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setCreating({ type: 'file', parentPath: '' })}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <Plus className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => setCreating({ type: 'directory', parentPath: '' })}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <FolderPlus className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {creating && (
        <div className="flex items-center space-x-2 mb-4">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder={`Enter ${creating.type === 'file' ? 'file' : 'folder'} name`}
            className="border p-2 rounded"
          />
          <button onClick={handleCreate} className="bg-blue-500 text-white p-2 rounded">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => setCreating(null)} className="bg-red-500 text-white p-2 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {renderTree(files)}
    </div>
  );
};

export default FileExplorer;
