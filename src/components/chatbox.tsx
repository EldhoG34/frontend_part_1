import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zfuocdlxngsbsmdhxmbw.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmdW9jZGx4bmdzYnNtZGh4bWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4OTQ2NjgsImV4cCI6MjA1MzQ3MDY2OH0.0yg1VaEGCkGZsR_GucLksebKxiz0OdUJGB8MGnJYulk";
const supabase = createClient(supabaseUrl, supabaseKey);

interface Message {
  id: string;
  username: string;
  message: string;
  created_at: string;
}

interface ChatBoxProps {
  socket: any; // or type it with Socket from socket.io-client
  roomId: string;
  username: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({ socket, roomId, username }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Fetch previous messages from Supabase when roomId changes
  useEffect(() => {
    const fetchMessages = async () => {
      console.log("Fetching messages for room:", roomId);
      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: true });
        console.log("Fetch messages result:", data, error);
        if (error) {
          console.error("Error fetching messages:", error);
        } else {
          setMessages(data || []);
          console.log("Messages fetched and set:", data);
        }
      } catch (err) {
        console.error("Fetch messages exception:", err);
      }
    };

    if (roomId) {
      fetchMessages();
    }
  }, [roomId]);

  // Subscribe to real-time chat messages via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (msg: Message) => {
      console.log("Received chat message via socket:", msg);
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("chat-message", handleChatMessage);
    return () => {
      socket.off("chat-message", handleChatMessage);
    };
  }, [socket]);

  const sendMessage = async () => {
    if (!newMessage.trim()) {
      console.log("Empty message, not sending.");
      return;
    }
    const messageData = {
      roomId,
      username,
      message: newMessage,
      timestamp: new Date().toISOString(),
    };
    console.log("Sending chat message:", messageData);
    socket.emit("chat-message", messageData, (ack: any) => {
      console.log("Socket emit acknowledgment:", ack);
    });
    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-2">Chat</h2>
      <div className="flex-1 overflow-auto p-2 border rounded mb-2 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-center">No messages yet.</div>
        ) : (
          messages.map((msg) => (
            <p key={msg.id}>
              <strong>{msg.username}:</strong> {msg.message}
            </p>
          ))
        )}
      </div>
      <div className="flex">
        <input
          type="text"
          className="flex-1 border p-2 rounded-l focus:outline-none"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage} className="bg-blue-500 text-white px-4 rounded-r">
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
