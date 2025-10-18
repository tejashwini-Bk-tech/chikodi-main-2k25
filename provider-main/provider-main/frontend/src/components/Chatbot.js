import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';

const Chatbot = () => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const backendHttp = process.env.REACT_APP_BACKEND_URL || '';
  const wsUrl = (() => {
    if (!backendHttp) return '';
    try {
      const url = new URL(backendHttp);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.pathname = '/ws/chat';
      url.search = '';
      return url.toString();
    } catch {
      return '';
    }
  })();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        setMessages([{ id: 1, text: t('chatbotGreeting'), sender: 'bot', timestamp: new Date() }]);
      }, 400);
    }
  }, [isOpen, t, messages.length]);

  // WebSocket lifecycle
  useEffect(() => {
    if (!isOpen) {
      if (wsRef.current) { try { wsRef.current.close(); } catch {} }
      setConnected(false);
      return;
    }
    if (!wsUrl) return;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (typeof data?.text === 'string') {
            setMessages(prev => [...prev, { id: prev.length + 1, text: data.text, sender: data.sender || 'bot', timestamp: new Date() }]);
            setIsTyping(false);
          }
        } catch {}
      };
      ws.onclose = () => {
        setConnected(false);
        if (isOpen) {
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = setTimeout(connect, 1500);
        }
      };
      ws.onerror = () => { try { ws.close(); } catch {} };
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      try { wsRef.current?.close(); } catch {}
    };
  }, [isOpen, wsUrl]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = { id: messages.length + 1, text: inputMessage, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    if (wsRef.current && connected && wsRef.current.readyState === WebSocket.OPEN) {
      setIsTyping(true);
      try {
        wsRef.current.send(JSON.stringify({ text: userMessage.text, lang: language }));
      } catch {
        setIsTyping(false);
      }
    }
  };

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-2xl z-50 transition-all duration-300 hover:scale-110"
        >
          <MessageCircle className="w-7 h-7" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[500px] z-50 shadow-2xl border-0 flex flex-col">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-white">
                <AvatarFallback className="bg-white text-emerald-600 font-bold">AI</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold">Fixora Assistant</h3>
                <p className="text-xs opacity-90">{connected ? 'Online' : 'Connecting...'}</p>
              </div>
            </div>
            <Button onClick={() => setIsOpen(false)} variant="ghost" size="icon" className="hover:bg-white/20 text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${m.sender === 'user' ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white' : 'bg-white text-slate-900'}`}>
                  <p className="text-sm">{m.text}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200">
            <div className="flex gap-2">
              <Input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={t('chatbotPlaceholder')}
                className="flex-1"
              />
              <Button type="submit" size="icon" className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
};

export default Chatbot;
