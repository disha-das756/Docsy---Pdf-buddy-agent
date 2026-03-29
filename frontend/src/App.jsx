import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8001";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap');

  :root {
    --bg: #0d0d0f;
    --surface: #141416;
    --surface-2: #1c1c1f;
    --surface-3: #242428;
    --border: rgba(255,255,255,0.07);
    --border-hover: rgba(255,255,255,0.14);
    --accent: #c8f542;
    --accent-dim: rgba(200,245,66,0.12);
    --accent-glow: rgba(200,245,66,0.25);
    --text: #f0f0ed;
    --text-2: #8a8a8a;
    --text-3: #555;
    --user-bubble: #1e2f0e;
    --user-bubble-border: rgba(200,245,66,0.2);
    --bot-bubble: #1c1c1f;
    --bot-bubble-border: rgba(255,255,255,0.06);
    --radius: 12px;
    --radius-lg: 18px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Mono', monospace; background: var(--bg); color: var(--text); overflow: hidden; }

  .app { display: flex; width: 100vw; height: 100vh; background: var(--bg); position: relative; }

  /* SIDEBAR */
  .sidebar { width: 240px; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; }
  .sidebar-header { padding: 24px 20px; border-bottom: 1px solid var(--border); }
  .sidebar-logo { font-family: 'Instrument Serif', serif; font-style: italic; font-size: 22px; color: var(--accent); display: flex; align-items: center; gap: 8px; }
  .sidebar-label { font-size: 9px; text-transform: uppercase; color: var(--text-3); padding: 16px 20px 8px; letter-spacing: 2px; }
  .chat-list { flex: 1; overflow-y: auto; padding: 10px; }
  .chat-item { padding: 10px; border-radius: var(--radius); cursor: pointer; font-size: 12px; color: var(--text-2); margin-bottom: 4px; transition: 0.2s; border: 1px solid transparent; }
  .chat-item:hover { background: var(--surface-2); color: var(--text); }
  .chat-item.active { background: var(--accent-dim); color: var(--accent); border-color: var(--user-bubble-border); }
  .new-chat-btn { margin: 12px; padding: 10px; background: transparent; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-2); cursor: pointer; font-family: inherit; }
  .new-chat-btn:hover { border-color: var(--accent); color: var(--accent); }

  /* PDF PANEL */
  .pdf-panel { flex: 1; display: flex; flex-direction: column; border-right: 1px solid var(--border); background: var(--bg); }
  .panel-header { padding: 16px 20px; border-bottom: 1px solid var(--border); background: var(--surface); display: flex; justify-content: space-between; align-items: center; }
  .upload-zone { flex: 1; display: flex; align-items: center; justify-content: center; }
  .upload-card { border: 1px dashed var(--border-hover); padding: 40px; border-radius: var(--radius-lg); text-align: center; cursor: pointer; transition: 0.2s; }
  .upload-card:hover { border-color: var(--accent); background: var(--accent-dim); }
  .pdf-frame { width: 100%; height: 100%; border: none; }

  /* CHAT PANEL */
  .chat-panel { width: 400px; display: flex; flex-direction: column; background: var(--surface); }
  .messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
  .msg-row { display: flex; gap: 10px; }
  .msg-row.user { justify-content: flex-end; }
  .msg-bubble { max-width: 85%; padding: 12px; border-radius: var(--radius); font-size: 13px; line-height: 1.5; }
  .msg-bubble.user { background: var(--user-bubble); color: #c8f542; border: 1px solid var(--user-bubble-border); }
  .msg-bubble.assistant { background: var(--bot-bubble); border: 1px solid var(--bot-bubble-border); }

  /* INPUT AREA */
  .input-area { padding: 20px; border-top: 1px solid var(--border); }
  .input-container { display: flex; background: var(--surface-2); border-radius: var(--radius); padding: 8px; border: 1px solid var(--border); }
  .input-field { flex: 1; background: transparent; border: none; color: white; padding: 8px; outline: none; font-family: inherit; }
  .send-btn { background: var(--accent); border: none; border-radius: 8px; width: 35px; cursor: pointer; font-weight: bold; }
  
  .loader { font-size: 10px; color: var(--text-3); margin-top: 5px; }
`;

export default function App() {
  const [chatId, setChatId] = useState(`chat-${Date.now()}`);
  const [history, setHistory] = useState({});
  const [pdfUrls, setPdfUrls] = useState({});       // per-chat PDF URLs
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Derived: current chat's PDF
  const currentPdfUrl = pdfUrls[chatId] || null;
  const currentMessages = history[chatId] || [];

  useEffect(() => {
    fetchChats();
  }, []);

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
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("chat_id", chatId);             // send chatId with upload

    try {
      const res = await axios.post(`${API_BASE}/upload`, formData);
      setPdfUrls(prev => ({ ...prev, [chatId]: res.data.url }));
    } catch (err) {
      alert("Error uploading PDF");
    } finally {
      setIsUploading(false);
      // Reset file input so same file can be re-uploaded if needed
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
    <>
      <style>{styles}</style>
      <div className="app">

        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">Docsy</div>
          </div>
          <div className="sidebar-label">Recent Sessions</div>
          <div className="chat-list">
            {Object.keys(history).map((id) => (
              <div
                key={id}
                onClick={() => setChatId(id)}
                className={`chat-item ${chatId === id ? "active" : ""}`}
              >
                Session {id.split('-')[1]?.slice(-4) || id}
              </div>
            ))}
          </div>
          <button className="new-chat-btn" onClick={createNewChat}>
            + New Chat
          </button>
        </div>

        {/* PDF VIEWER */}
        <div className="pdf-panel">
          <div className="panel-header">
            <div style={{ fontSize: '14px' }}>Document Viewer</div>
            {currentPdfUrl && (
              <button
                onClick={() => fileInputRef.current.click()}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer', fontSize: '10px', padding: '4px 8px' }}
              >
                Change PDF
              </button>
            )}
          </div>

          {!currentPdfUrl ? (
            <div className="upload-zone">
              <div className="upload-card" onClick={() => fileInputRef.current.click()}>
                <div style={{ fontSize: '30px', marginBottom: '10px' }}>📄</div>
                <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: '20px' }}>
                  {isUploading ? "Uploading to Cloud..." : "Upload PDF to Supabase"}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '8px' }}>
                  Your document will be indexed for RAG
                </div>
              </div>
            </div>
          ) : (
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(currentPdfUrl)}&embedded=true`}
              className="pdf-frame"
              title="PDF"
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

        {/* CHAT PANEL */}
        <div className="chat-panel">
          <div className="panel-header">
            <div style={{ fontSize: '14px' }}>AI Assistant</div>
          </div>
          <div className="messages">
            {currentMessages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-3)' }}>
                <div style={{ fontSize: '24px' }}>✦</div>
                <p style={{ fontSize: '12px', marginTop: '10px' }}>Ask a question about the PDF</p>
              </div>
            )}
            {currentMessages.map((m, i) => (
              <div key={i} className={`msg-row ${m.role}`}>
                <div className={`msg-bubble ${m.role}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="loader">AI is thinking...</div>
            )}
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
              <button className="send-btn" onClick={sendMessage}>↑</button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}