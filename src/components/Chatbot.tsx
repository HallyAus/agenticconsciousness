'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { CONTACT_EMAIL } from '@/lib/constants';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function getInitialMessage(storedName: string | null): string {
  if (storedName) {
    return `Welcome back, ${storedName}. What can I help you with today?`;
  }
  return "I'm the Agentic Consciousness AI. What's your name? (Or just ask me anything about AI consulting.)";
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [visitorName, setVisitorName] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(() => {
    const storedName = typeof window !== 'undefined' ? localStorage.getItem('ac-visitor-name') : null;
    return [{ role: 'assistant', content: getInitialMessage(storedName) }];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedName = localStorage.getItem('ac-visitor-name');
    if (storedName) {
      setVisitorName(storedName);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    document.addEventListener('toggle-chatbot', handler);
    return () => document.removeEventListener('toggle-chatbot', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Build API messages, prepending visitor name context if we have it
    const currentName = visitorName || localStorage.getItem('ac-visitor-name');
    const apiMessages = newMessages.map((m, i) => {
      if (i === 1 && m.role === 'user' && currentName) {
        return { role: m.role, content: `[Visitor name: ${currentName}] ${m.content}` };
      }
      return { role: m.role, content: m.content };
    });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (res.status === 429) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: "You're sending messages too fast. Take a breath and try again in a moment." },
        ]);
        return;
      }

      if (!res.ok) throw new Error('API error');

      const data = await res.json();
      const botReply: Message = { role: 'assistant', content: data.reply };
      setMessages((prev) => {
        const updated = [...prev, botReply];

        // After first exchange, try to extract name if we don't have one
        if (!currentName && updated.length === 3) {
          const firstUserMsg = updated[1].content.trim();
          if (firstUserMsg.length < 30 && !firstUserMsg.includes('?')) {
            const name = firstUserMsg
              .replace(/^(i'm|my name is|it's|call me|hey i'm|hi i'm)\s*/i, '')
              .trim();
            if (name.length > 0 && name.length < 25 && /^[a-zA-Z\s'-]+$/.test(name)) {
              setVisitorName(name);
              localStorage.setItem('ac-visitor-name', name);
            }
          }
        }

        return updated;
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Connection error. Try again or reach us at ${CONTACT_EMAIL}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 border-none text-[1.2rem] font-black cursor-pointer transition-all duration-200 flex items-center justify-center focus:ring-2 focus:ring-ac-red focus:outline-none ${
          isOpen
            ? 'bg-white text-ac-black'
            : 'bg-ac-red text-white hover:bg-white hover:text-ac-black'
        }`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chat' : 'Open AI chat assistant'}
        aria-expanded={isOpen}
      >
        {isOpen ? '✕' : 'AC'}
      </button>

      {isOpen && (
        <div role="dialog" aria-label="Chat with AI assistant" className="fixed bottom-[5.5rem] right-6 z-[9999] w-[400px] max-w-[calc(100vw-1.5rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-ac-black border-2 border-ac-red flex flex-col overflow-hidden animate-chat-in max-sm:right-0 max-sm:bottom-[4.5rem] max-sm:w-full max-sm:max-w-full max-sm:h-[calc(100vh-6rem)] max-sm:border-l-0 max-sm:border-r-0">
          <div className="py-3 px-4 border-b-2 border-ac-red flex items-center gap-3 bg-ac-card">
            <div className="w-[7px] h-[7px] bg-[var(--status-green)] animate-blink" />
            <div>
              <div className="text-[0.8rem] max-sm:text-xs font-black tracking-[2px] uppercase text-text-primary">
                AC Neural Agent
              </div>
              <div className="font-mono text-[0.7rem] max-sm:text-xs text-text-dim">
                Powered by Claude — ask anything
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-[0.6rem] [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-thumb]:bg-ac-red" aria-live="polite" role="log" aria-label="Chat messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[85%] py-[0.7rem] px-[0.9rem] text-[0.8rem] leading-[1.5] animate-msg-in ${
                  msg.role === 'assistant'
                    ? 'self-start bg-ac-block border-l-2 border-ac-red text-text-primary'
                    : 'self-end bg-ac-red text-white'
                }`}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="self-start bg-ac-block border-l-2 border-ac-red py-[0.7rem] px-[0.9rem] animate-msg-in">
                <div className="inline-flex gap-1" aria-label="AI is typing">
                  <span className="w-[5px] h-[5px] bg-ac-red animate-dot-pulse" />
                  <span className="w-[5px] h-[5px] bg-ac-red animate-dot-pulse [animation-delay:0.15s]" />
                  <span className="w-[5px] h-[5px] bg-ac-red animate-dot-pulse [animation-delay:0.3s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-[0.6rem] border-t-2 border-ac-red flex bg-ac-card"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              maxLength={2000}
              className="flex-1 bg-ac-black border border-border-subtle py-3 px-[0.8rem] text-text-primary font-display text-[0.8rem] outline-none transition-colors duration-200 focus:border-ac-red placeholder:text-text-dim"
              aria-label="Chat message"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-ac-red border-none text-white px-4 py-3 font-display text-[0.8rem] max-sm:text-xs font-black tracking-[2px] cursor-pointer transition-all duration-200 hover:bg-white hover:text-ac-black disabled:opacity-40 disabled:cursor-not-allowed focus:ring-2 focus:ring-ac-red focus:outline-none"
            >
              SEND
            </button>
          </form>
        </div>
      )}
    </>
  );
}
