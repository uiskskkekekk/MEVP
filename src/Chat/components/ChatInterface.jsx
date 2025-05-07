// src/Chat/components/ChatInterface.jsx
import { useEffect, useRef, useState } from "react";
import { sendLLMQuery } from "../../../server/src/services/llmService";
import "../styles/chat.css";

function ChatInterface({ messages, setMessages, onExecuteCommand }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input };
    setMessages([...messages, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await sendLLMQuery(input);

      const aiMessage = {
        role: "assistant",
        content: response.rawResponse || "No response received",
        command: response.command,
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (response.command && onExecuteCommand) {
        onExecuteCommand(response.command);
      }
    } catch (error) {
      console.error("Error fetching LLM response:", error);
      const errorMessage = {
        role: "assistant",
        content:
          "Sorry, an error occurred while processing your request. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="floating-chat-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="welcome-message">
            <p>
              Hello! I am your Evolution Analysis Assistant. You can describe
              operations you want to perform using natural language, for
              example:
            </p>
            <ul>
              <li>Swap the positions of the first and third species</li>
              <li>Change all sequences labeled 'A' to red</li>
              <li>Hide all connections with a value more than 0.5</li>
            </ul>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant">
            <div className="message-content loading-indicator">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="How can I help you?"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatInterface;
