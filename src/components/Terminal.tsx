import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal as TerminalIcon, Send, Shield, Zap, Globe, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

interface LogEntry {
  id: string;
  type: 'info' | 'error' | 'success' | 'command' | 'ai';
  text: string;
  timestamp: string;
}

interface TerminalProps {
  onCommand: (command: string) => void;
  logs: LogEntry[];
}

export const Terminal: React.FC<TerminalProps> = ({ onCommand, logs }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onCommand(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-black/80 border border-green-500/30 rounded-lg overflow-hidden font-mono text-green-500 shadow-[0_0_20px_rgba(0,255,0,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-green-500/10 border-bottom border-green-500/20">
        <div className="flex items-center gap-2">
          <TerminalIcon size={16} />
          <span className="text-xs font-bold tracking-widest uppercase">GhostNet OS v4.0.1</span>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/50" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
          <div className="w-2 h-2 rounded-full bg-green-500/50" />
        </div>
      </div>

      {/* Logs */}
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-green-500/20"
      >
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "text-sm break-words",
                log.type === 'error' && "text-red-400",
                log.type === 'success' && "text-blue-400",
                log.type === 'command' && "text-white/80",
                log.type === 'ai' && "text-cyan-400 italic"
              )}
            >
              <span className="opacity-30 mr-2">[{log.timestamp}]</span>
              {log.type === 'command' && <span className="mr-2 opacity-50">$</span>}
              {log.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-green-500/5 border-t border-green-500/20 flex gap-2 items-center">
        <span className="opacity-50 text-sm">{'>'}</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm text-green-400 placeholder:text-green-900"
          placeholder="Execute GhostNet protocol..."
          autoFocus
        />
        <button type="submit" className="hover:text-white transition-colors cursor-pointer">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
