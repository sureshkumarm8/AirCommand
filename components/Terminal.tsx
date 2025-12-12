import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal as TerminalIcon, ShieldCheck, AlertCircle, Cpu } from 'lucide-react';

interface TerminalProps {
  logs: LogEntry[];
}

export const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-[#0d1117] rounded-xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-sm">
      {/* Terminal Header */}
      <div className="bg-[#161b22] px-4 py-2.5 border-b border-white/5 flex justify-between items-center select-none">
        <div className="flex items-center gap-3">
           <div className="flex gap-1.5">
             <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80 hover:bg-rose-500 transition-colors"></div>
             <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 hover:bg-amber-500 transition-colors"></div>
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors"></div>
           </div>
           <div className="h-4 w-px bg-white/10 mx-1"></div>
           <span className="text-xs font-medium text-slate-400 flex items-center gap-2">
             <TerminalIcon size={12} className="text-cyan-500" />
             air_command_protocol.sh
           </span>
        </div>
        <div className="text-[10px] text-slate-600 font-mono">
            v2.4.0-stable
        </div>
      </div>

      {/* Terminal Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[13px] leading-relaxed relative">
         <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none h-32 opacity-20"></div>
         
        {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                <Cpu size={48} strokeWidth={1} />
                <p className="mt-4 text-sm">System Ready. Waiting for input...</p>
            </div>
        )}

        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 group">
            <span className="text-slate-600 shrink-0 select-none w-16 text-right opacity-50 group-hover:opacity-100 transition-opacity">
              {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
            </span>
            <div className="flex-1 break-words">
               {log.source === 'User' && (
                  <span className="text-purple-400 font-bold mr-2">➜ User:</span>
               )}
               {log.source === 'AI' && (
                  <span className="text-cyan-400 font-bold mr-2">✦ AI:</span>
               )}
               {log.source === 'System' && (
                  <span className="text-slate-500 font-bold mr-2"># System:</span>
               )}

               <span className={`
                 ${log.type === 'error' ? 'text-rose-400' : ''}
                 ${log.type === 'success' ? 'text-emerald-400' : ''}
                 ${log.type === 'command' ? 'text-amber-300 font-semibold' : ''}
                 ${log.type === 'info' ? 'text-slate-300' : ''}
               `}>
                 {log.message}
               </span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};