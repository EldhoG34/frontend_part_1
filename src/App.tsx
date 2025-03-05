import React, { useState, useEffect, useRef } from 'react';
import { Socket, io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { Toaster, toast } from 'sonner';
import { Code2, Users, Play } from 'lucide-react';
import FileExplorer from './components/FileExplorer';
import ChatBox from './components/chatbox';
import { v4 as uuidv4 } from 'uuid';
import AwarenessList from './components/AwarenessList';
interface FileNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

const SERVER_URL = 'https://test-backnd-1.onrender.com';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [output, setOutput] = useState('');
  const [files, setFiles] = useState<FileNode[]>([]);
  const [currentFile, setCurrentFile] = useState('main.py');
  const [fileContents, setFileContents] = useState<{ [key: string]: string }>({});
  const [editorContent, setEditorContent] = useState('');
  const editorRef = useRef<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const isSwitchingFile = useRef(false);
  const currentFileRef = useRef(currentFile);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on('error', (msg: string) => {
      toast.error(msg);
    });

    newSocket.on('file-content', ({ filePath, content }) => {
      if (filePath === currentFile) {
        setFileContents((prev) => ({ ...prev, [filePath]: content }));
        setEditorContent(content);
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Listen for room events
  useEffect(() => {
    if (!socket) return;
    socket.on('room-created', (id) => {
      toast.success(`Room created: ${id}`);
      setIsJoined(true);
    });
    socket.on('room-joined', (id) => {
      toast.success(`Joined room: ${id}`);
      setIsJoined(true);
    });
    return () => {
      socket.off('room-created');
      socket.off('room-joined');
    };
  }, [socket]);

  // Reinitialize the Yjs provider on file or room changes
  useEffect(() => {
    if (!editorRef.current || !roomId) return;
    if (provider) {
      provider.destroy();
      console.log(`Destroyed old provider for file ${currentFile}`);
    }
    const doc = new Y.Doc();
    const newProvider = new WebsocketProvider(
      `wss://test-backnd-1.onrender.com`,
      `${roomId}?file=${currentFile}`,
      doc
    );
    const type = doc.getText('monaco');
    new MonacoBinding(
      type,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
      newProvider.awareness
    );
    // After creating newProvider:
newProvider.awareness.setLocalStateField("user", {
  name: username,         // Use the username from your state
  color: "#ff00ff"        // You can choose or generate a color for this user
});
newProvider.awareness.on("change", () => {
  // Log or process awareness states:
  const states = Array.from(newProvider.awareness.getStates().values());
  console.log("Current awareness states:", states);
  // Optionally, update your local state to display active users
});

    newProvider.on('status', ({ status }: { status: string }) => {
      if (status === 'connected') {
        toast.success(`Collaboration connected for ${currentFile}`);
      } else if (status === 'disconnected') {
        toast.error(`Collaboration disconnected for ${currentFile}`);
      }
    });
    setProvider(newProvider);
    return () => {
      newProvider.destroy();
      console.log(`Cleaned up provider for ${currentFile}`);
    };
  }, [currentFile, roomId]);

  const generateRoomId = () => {
    const id = uuidv4();
    setRoomId(id);
  };

  const handleJoinRoom = () => {
    if (!socket?.connected) {
      toast.error('Server connection failed.');
      return;
    }
    if (!roomId || !username) {
      toast.error('Please enter both Room ID and Username');
      return;
    }
    socket.emit('join-room', roomId);
  };

  const handleCreateRoom = () => {
    if (!socket?.connected) {
      toast.error('Server connection failed.');
      return;
    }
    if (!roomId || !username) {
      toast.error('Please enter both Room ID and Username');
      return;
    }
    socket.emit('create-room', roomId);
  };

  useEffect(() => {
    currentFileRef.current = currentFile;
  }, [currentFile]);

  useEffect(() => {
    if (!socket) return;
    const handleExecutionResult = ({ filePath, output }: { filePath: string; output: string }) => {
      if (filePath === currentFile) {
        setOutput(output);
        toast.success('Code executed successfully');
      }
    };
    socket.on('execution-result', handleExecutionResult);
    return () => {
      socket.off('execution-result', handleExecutionResult);
    };
  }, [socket, currentFile]);

  useEffect(() => {
    if (isJoined && socket && roomId) {
      socket.emit('fetch-files', roomId);
    }
  }, [isJoined, socket, roomId]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    editor.onDidChangeModelContent(() => {
      const updatedContent = editor.getValue();
      if (isSwitchingFile.current) return;
      setFileContents((prev) => ({ ...prev, [currentFileRef.current]: updatedContent }));
      socket?.emit('update-file', { roomId, filePath: currentFileRef.current, content: updatedContent });
    });
  };

  const handleFileSelect = (path: string) => {
    if (path === currentFile) return;
    isSwitchingFile.current = true;
    setCurrentFile(path);
    setEditorContent('');
    setTimeout(() => {
      if (fileContents[path] !== undefined) {
        setEditorContent(fileContents[path]);
      } else {
        socket?.emit('fetch-file-content', { roomId, filePath: path });
      }
      isSwitchingFile.current = false;
    }, 300);
  };

  const handleCreateFile = (path: string, type: 'file' | 'directory') => {
    socket?.emit('create-file', { roomId, path, type });
  };

  const executeCode = () => {
    if (!socket) {
      toast.error('Socket not connected');
      return;
    }
    socket.emit('execute-code', { roomId, filePath: currentFile, code: editorContent });
    toast.info('Executing code...');
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex items-center justify-center mb-8">
            <Code2 className="w-12 h-12 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-6">Collaborative Python Editor</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter room ID"
                />
                <button
                  onClick={generateRoomId}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Generate
                </button>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleCreateRoom}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Create Room
              </button>
              <button
                onClick={handleJoinRoom}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Join Room
              </button>
            </div>
          </div>
        </div>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Code2 className="w-8 h-8 text-indigo-600" />
              <h1 className="text-xl font-semibold text-gray-900">Python Collaborative Editor</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Users className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">{username} • Room: {roomId}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 max-w-7xl mx-auto w-full">
  {/* Left: File Explorer */}
  <div className="w-64">
    <FileExplorer
      files={files}
      onFileSelect={handleFileSelect}
      onCreateFile={handleCreateFile}
      currentFile={currentFile}
      socket={socket}
      roomId={roomId}
      setFiles={setFiles}
    />
  </div>

  {/* Center: Editor */}
  <div className="flex-1">
    <div className="bg-white rounded-lg shadow-sm h-full">
      <Editor
        height="70vh"
        defaultLanguage="python"
        value={editorContent}
        onChange={(value) => setEditorContent(value || '')}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
        }}
      />
    </div>
  </div>

  {/* Right: Execution Panel (top) + ChatBox (bottom) */}
  <div className="w-full md:w-96 flex flex-col gap-4">
    {/* Execution Panel */}
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Output</h2>
        <button
          onClick={executeCode}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <Play className="w-4 h-4" />
          <span>Run</span>
        </button>
      </div>
      <pre className="bg-gray-50 p-4 rounded-md h-[calc(35vh-2rem)] overflow-auto">
        {output || 'Code output will appear here...'}
      </pre>
    </div>

    {/* Chat Box */}
    <div className="bg-white rounded-lg shadow-sm p-4 flex-1">
      <ChatBox socket={socket} roomId={roomId} username={username} />
    </div>
  </div>
  {provider && <AwarenessList awareness={provider.awareness} />}
</div>

      <Toaster />
    </div>
  );
}

export default App;
