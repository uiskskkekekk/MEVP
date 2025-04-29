// src/Chat/FloatingChatManager.jsx
import { useState } from "react";
import ChatInterface from "./components/ChatInterface";
import DraggableWindow from "./components/DraggableWindow";
import "./styles/floating-chat-manager.css";

const calculateInitialPosition = () => {
  const workspaceContainer = document.getElementById("workspace-container");
  if (workspaceContainer) {
    const containerRect = workspaceContainer.getBoundingClientRect();

    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    const xPercent = 0.95;
    const yPercent = 0.05;

    const windowWidth = 500;

    return {
      x: containerRect.left + containerWidth * xPercent - windowWidth,
      y: containerRect.top + containerHeight * yPercent,
    };
  }

  return {
    x: window.innerWidth * 0.95,
    y: window.innerHeight * 0.05,
  };
};

function FloatingChatManager() {
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const apiEndpoint = "http://llm-api:8000/l27b"; // API端點

  const toggleChat = () => {
    setIsVisible(!isVisible);
  };

  const hideChat = () => {
    setIsVisible(false);
  };

  const closeChat = () => {
    // 關閉並清除聊天記錄
    setMessages([]);
    setIsVisible(false);
  };

  return (
    <>
      {!isVisible && (
        <button
          className="chat-toggle-button"
          onClick={toggleChat}
          title="open-ai-assistant"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      )}

      {isVisible && (
        <DraggableWindow
          title="AI Assistant"
          onClose={closeChat}
          onHide={hideChat}
          initialPosition={calculateInitialPosition()}
        >
          <ChatInterface
            apiEndpoint={apiEndpoint}
            messages={messages}
            setMessages={setMessages}
          />
        </DraggableWindow>
      )}
    </>
  );
}

export default FloatingChatManager;
