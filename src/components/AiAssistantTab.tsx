import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, AlertCircle, RefreshCw, MessageSquare, Terminal } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export const AiAssistantTab: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello! I am your SHCA Sawla AI Assistant. I have live access to SAAKO HOLY CHILD ACADEMY's student enrollments, fee collections, expenditures, and salaries. Ask me to draft SMS reminder alerts, summarize financial statements, or provide class analysis!",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const starterPrompts = [
    {
      title: "Cash Flow",
      text: "Show me a cash flow summary of the school and current financial status."
    },
    {
      title: "Draft SMS Alert",
      text: "Draft a parent reminder SMS for outstanding tuition/daily check-in arrears."
    },
    {
      title: "Enrollment Metrics",
      text: "Summarize school enrollment across different classes."
    }
  ];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    setError(null);

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: textToSend,
          history: messages.map(m => ({ role: m.role, text: m.text }))
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate response from the AI assistant.');
      }

      const modelMsg: ChatMessage = {
        id: Math.random().toString(),
        role: 'model',
        text: data.text,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to reach the AI engine.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        text: "Chat cleared. I'm ready to assist you with new queries. Ask me anything about student registries, fee collection statistics, or expenditures!",
        timestamp: new Date()
      }
    ]);
    setError(null);
  };

  // Helper to format response lines (handling simple bullet points, bolding, etc.)
  const formatResponse = (text: string) => {
    return text.split('\n').map((line, i) => {
      let content = line;
      let isHeader = false;
      let isBullet = false;

      // Check bullet points
      if (content.startsWith('- ') || content.startsWith('* ')) {
        content = content.substring(2);
        isBullet = true;
      } else if (content.match(/^\d+\.\s/)) {
        const match = content.match(/^(\d+\.\s)(.*)/);
        if (match) {
          content = match[2];
          isBullet = true; // Use bullet rendering for lists
        }
      }

      // Render bold spans
      const parts = [];
      let lastIndex = 0;
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;

      while ((match = boldRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="text-amber-400 font-bold">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
      }

      const parsedContent = parts.length > 0 ? parts : content;

      if (isBullet) {
        return (
          <li key={i} className="ml-4 list-disc text-neutral-300 text-xs font-mono leading-relaxed mb-1">
            {parsedContent}
          </li>
        );
      }

      return (
        <p key={i} className="text-neutral-300 text-xs font-mono leading-relaxed mb-2 min-h-[1em]">
          {parsedContent}
        </p>
      );
    });
  };

  return (
    <div id="ai-assistant-panel" className="bg-neutral-900 border-4 border-neutral-800 p-6 space-y-6">
      
      {/* Panel Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b-2 border-neutral-850 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-400 text-neutral-950 p-2 border-2 border-neutral-950 shadow-[2px_2px_0px_0px_rgba(251,191,36,0.3)]">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest font-mono flex items-center gap-2">
              SHCA Sawla AI Assistant
              <span className="bg-amber-400/20 text-amber-400 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Live Data-Sync
              </span>
            </h2>
            <p className="text-[10px] text-neutral-400 uppercase font-mono font-bold tracking-wider mt-0.5">
              Powered by <span className="text-amber-400">Gemini 3.5 Flash</span> • Real-Time Administrative Agent
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="flex items-center gap-2 px-3 py-1.5 border border-neutral-700 hover:border-amber-400 text-neutral-400 hover:text-amber-400 text-[10px] uppercase font-mono font-bold transition-all bg-neutral-950"
          >
            <RefreshCw size={11} />
            Reset Chat
          </button>
        </div>
      </div>

      {/* Main Grid: Chat & Starter Prompts */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Chat Area */}
        <div className="lg:col-span-3 flex flex-col h-[500px] border-2 border-neutral-850 bg-neutral-950 p-4">
          
          {/* Scrollable Messages Container */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-7 h-7 flex items-center justify-center shrink-0 border ${
                    msg.role === 'user'
                      ? 'bg-neutral-800 border-neutral-700 text-white'
                      : 'bg-amber-400 border-amber-500 text-neutral-950'
                  }`}
                >
                  {msg.role === 'user' ? 'U' : <Sparkles size={14} />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-3 border-2 ${
                    msg.role === 'user'
                      ? 'bg-neutral-900 border-neutral-800 text-white rounded-l-lg rounded-tr-sm'
                      : 'bg-neutral-900/50 border-neutral-800 text-neutral-200 rounded-r-lg rounded-tl-sm shadow-[4px_4px_0px_0px_rgba(251,191,36,0.05)]'
                  }`}
                >
                  <div className="space-y-1">
                    {formatResponse(msg.text)}
                  </div>
                  <span className="text-[9px] text-neutral-500 font-mono mt-1 block text-right">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {/* Loading / Generating State */}
            {isLoading && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-7 h-7 flex items-center justify-center shrink-0 border bg-amber-400 border-amber-500 text-neutral-950 animate-pulse">
                  <Sparkles size={14} />
                </div>
                <div className="p-3 border-2 border-dashed border-neutral-800 bg-neutral-900/30 rounded-r-lg rounded-tl-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  <span className="text-[10px] text-neutral-400 uppercase font-mono font-bold ml-2">Agent is thinking...</span>
                </div>
              </div>
            )}

            {/* Error Message Box */}
            {error && (
              <div className="p-4 bg-red-950/40 border-2 border-red-900 text-red-200 rounded-md flex gap-3 items-start">
                <AlertCircle className="shrink-0 text-red-500 mt-0.5" size={16} />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase font-mono text-red-400">Gemini Connection Error</h4>
                  <p className="text-[11px] font-mono leading-relaxed text-red-300">{error}</p>
                  <p className="text-[10px] text-neutral-400 font-mono mt-2">
                    Tip: Verify your <strong className="text-amber-400 font-bold">GEMINI_API_KEY</strong> environment variable is active in Settings &gt; Secrets.
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputValue);
            }}
            className="mt-4 flex gap-2 border-t-2 border-neutral-850 pt-4"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              placeholder={isLoading ? "Agent is processing..." : "Ask me anything about SAAKO HOLY CHILD ACADEMY..."}
              className="flex-1 px-3 py-2 bg-neutral-900 border-2 border-neutral-800 text-white font-mono text-xs focus:outline-none focus:border-amber-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="px-4 py-2 bg-amber-400 text-neutral-950 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-amber-300 disabled:opacity-50 disabled:hover:bg-amber-400 transition-all border-2 border-neutral-950 shadow-[2px_2px_0px_0px_rgba(251,191,36,0.3)]"
            >
              <Send size={12} />
              Send
            </button>
          </form>
        </div>

        {/* Info & Prompts Sidebar */}
        <div className="space-y-4">
          
          {/* Quick Starter Prompts */}
          <div className="bg-neutral-950 border-2 border-neutral-850 p-4 space-y-3">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-400 font-mono flex items-center gap-2">
              <Terminal size={12} />
              Starter Prompts
            </h3>
            <p className="text-[10px] text-neutral-400 font-mono leading-relaxed">
              Click any quick command below to instantly query the active database.
            </p>
            
            <div className="space-y-2 pt-1">
              {starterPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt.text)}
                  disabled={isLoading}
                  className="w-full text-left p-2.5 bg-neutral-900 border border-neutral-800 hover:border-amber-400 transition-all text-neutral-300 hover:text-white group flex flex-col gap-1 disabled:opacity-50"
                >
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 font-mono group-hover:underline">
                    {prompt.title}
                  </span>
                  <span className="text-[10px] font-mono leading-relaxed line-clamp-2 text-neutral-400 group-hover:text-neutral-200">
                    "{prompt.text}"
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Capabilities Guidelines card */}
          <div className="bg-neutral-950 border-2 border-neutral-850 p-4 space-y-2">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-white font-mono flex items-center gap-2">
              <MessageSquare size={12} />
              Capabilities
            </h3>
            <ul className="space-y-1.5 pt-1">
              <li className="text-[10px] text-neutral-400 font-mono leading-relaxed flex items-start gap-1.5">
                <span className="text-amber-400">■</span>
                Draft high-fidelity, customized parent check-in alerts and arrears messages.
              </li>
              <li className="text-[10px] text-neutral-400 font-mono leading-relaxed flex items-start gap-1.5">
                <span className="text-amber-400">■</span>
                Provide cash-flow positions taking salary checks and expenses into account.
              </li>
              <li className="text-[10px] text-neutral-400 font-mono leading-relaxed flex items-start gap-1.5">
                <span className="text-amber-400">■</span>
                Compare term limits, check active categories, and evaluate student balances.
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
};
