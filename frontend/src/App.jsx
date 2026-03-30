import { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./index.css";

const API_BASE = "https://docsy-pdf-buddy-agent.onrender.com";

export default function App() {
  const [chatId, setChatId] = useState(`chat-${Date.now()}`);
  const [history, setHistory] = useState({});
  const [pdfUrls, setPdfUrls] = useState({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Mobile UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "pdf"

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const currentPdfUrl = pdfUrls[chatId] || null;
  const currentMessages = history[chatId] || [];

  useEffect(() => { fetchChats(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, chatId, loading]);

  const fetchChats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/chats`);
      const messages = {};
      const urls = {};
      Object.entries(res.data).forEach(([id, val]) => {
        messages[id] = val.messages;
        urls[id] = val.pdf_url;
      });
      setHistory(messages);
      setPdfUrls(urls);
    } catch (err) {
      console.error("Failed to fetch chats", err);
    }
  };

  const createNewChat = () => {
    const newId = `chat-${Date.now()}`;
    setChatId(newId);
    setHistory(prev => ({ ...prev, [newId]: [] }));
    setSidebarOpen(false);
    setActiveTab("chat");
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("chat_id", chatId);

    try {
      const res = await axios.post(`${API_BASE}/upload`, formData);
      setPdfUrls(prev => ({ ...prev, [chatId]: res.data.url }));
      setActiveTab("pdf"); // auto-switch to PDF view after upload
    } catch (err) {
      alert("Error uploading PDF");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const sendMessage = async () => {
    if (!query.trim() || loading) return;

    const userMessage = { role: "user", content: query };
    setHistory(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), userMessage]
    }));

    const currentQuery = query;
    setQuery("");
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/chat`, {
        query: currentQuery,
        chat_id: chatId
      });
      const botMessage = { role: "assistant", content: res.data.answer };
      setHistory(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), botMessage]
      }));
    } catch (err) {
      console.error("Chat error", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">

      {/* ── Sidebar Overlay (mobile) ── */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">Docsy</div>
        </div>
        <div className="sidebar-label">Recent Sessions</div>
        <div className="chat-list">
          {Object.keys(history).map((id) => (
            <div
              key={id}
              onClick={() => { setChatId(id); setSidebarOpen(false); setActiveTab("chat"); }}
              className={`chat-item ${chatId === id ? "active" : ""}`}
            >
              Session {id.split("-")[1]?.slice(-4) || id}
            </div>
          ))}
        </div>
        <button className="new-chat-btn" onClick={createNewChat}>
          + New Chat
        </button>
      </div>

      {/* ── PDF Panel ── */}
      <div className={`pdf-panel ${activeTab === "pdf" ? "tab-active" : ""}`}>
        <div className="panel-header">
          {/* Hamburger only visible on mobile */}
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          <span className="panel-header-title">Document Viewer</span>
          {currentPdfUrl && (
            <button className="change-pdf-btn" onClick={() => fileInputRef.current.click()}>
              Change PDF
            </button>
          )}
        </div>

        {!currentPdfUrl ? (
          <div className="upload-zone">
            <div className="upload-card" onClick={() => fileInputRef.current.click()}>
              <div className="upload-card-icon">📄</div>
              <div className="upload-card-title">
                {isUploading ? "Uploading..." : "Upload PDF"}
              </div>
              <div className="upload-card-sub">
                Your document will be indexed for RAG
              </div>
            </div>
          </div>
        ) : (
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(currentPdfUrl)}&embedded=true`}
            className="pdf-frame"
            title="PDF Viewer"
          />
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          hidden
          accept="application/pdf"
        />
      </div>

      {/* ── Chat Panel ── */}
      <div className={`chat-panel ${activeTab === "chat" ? "tab-active" : ""}`}>
        <div className="panel-header">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          <span className="panel-header-title">AI Assistant</span>
        </div>

        <div className="messages">
          {currentMessages.length === 0 && (
            <div className="messages-empty">
              <div className="messages-empty-icon">✦</div>
              <p className="messages-empty-text">Ask a question about the PDF</p>
            </div>
          )}
          {currentMessages.map((m, i) => (
            <div key={i} className={`msg-row ${m.role}`}>
              <div className={`msg-bubble ${m.role}`}>{m.content}</div>
            </div>
          ))}
          {loading && <div className="loader">AI is thinking...</div>}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <div className="input-container">
            <input
              className="input-field"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask anything..."
            />
            <button className="send-btn" onClick={sendMessage} disabled={loading || !query.trim()}>
              ↑
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Tab Bar ── */}
      <nav className="mobile-tab-bar">
        <div className="mobile-tab-bar-inner">
          <button
            className={`tab-btn ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            <span className="tab-btn-icon">💬</span>
            Chat
          </button>
          <button
            className={`tab-btn ${activeTab === "pdf" ? "active" : ""}`}
            onClick={() => setActiveTab("pdf")}
          >
            <span className="tab-btn-icon">📄</span>
            Document
          </button>
        </div>
      </nav>

    </div>
  );
}