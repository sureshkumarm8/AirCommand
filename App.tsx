import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type, Modality, LiveServerMessage } from '@google/genai';
import { IOSDevice, LogEntry, ScriptCommand, CommandDescriptions } from './types';
import { Terminal } from './components/Terminal';
import { DeviceCard } from './components/DeviceCard';
import { Mic, MicOff, Command, Wifi, Settings, Terminal as TerminalIcon, Sparkles, Activity } from 'lucide-react';
import { createBlob, decodeAudioData, base64ToUint8Array } from './services/audioUtils';

// --- Tool Definitions ---
const executeScriptTool: FunctionDeclaration = {
  name: 'execute_ios_script',
  description: 'Execute a command using the connect_ios_wireless.sh script on one or multiple iOS devices.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        enum: Object.values(ScriptCommand),
        description: 'The specific script action to perform.'
      },
      argument: {
        type: Type.STRING,
        description: 'The argument for the command (e.g., URL for "url", Bundle ID for "launch" or "kill", Text for "text").'
      },
      targetDevices: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Array of Device IDs to target. Returns "all" if the user implies all connected devices.'
      }
    },
    required: ['action', 'targetDevices']
  }
};

const TOOLS = [executeScriptTool];

// --- Initial Mock Data ---
const INITIAL_DEVICES: IOSDevice[] = [
  { id: 'dev_1', name: 'iPhone 15 Pro', model: 'iPhone16,1', osVersion: 'iOS 17.4', ip: '192.168.1.101', status: 'connected', batteryLevel: 82, currentApp: 'SpringBoard' },
  { id: 'dev_2', name: 'iPad Air 5', model: 'iPad13,16', osVersion: 'iPadOS 17.3', ip: '192.168.1.105', status: 'connected', batteryLevel: 45, currentApp: 'com.apple.safari' },
  { id: 'dev_3', name: 'iPhone 12 Mini', model: 'iPhone13,1', osVersion: 'iOS 16.6', ip: '192.168.1.112', status: 'offline', batteryLevel: 0, currentApp: 'Unknown' },
];

export default function App() {
  // --- State ---
  const [devices, setDevices] = useState<IOSDevice[]>(INITIAL_DEVICES);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [apiKey, setApiKey] = useState<string>("");
  
  // --- Audio Refs ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  
  // --- Gemini Refs ---
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  // --- Initialization ---
  useEffect(() => {
    const key = process.env.API_KEY || '';
    setApiKey(key);
    addLog('System', 'iOS AirCommand Dashboard Initialized.', 'info');
  }, []);

  // --- Helper Functions ---
  const addLog = useCallback((source: LogEntry['source'], message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      source,
      message,
      type
    }]);
  }, []);

  // --- Script Execution Logic (Simulation) ---
  const handleScriptExecution = async (action: ScriptCommand, argument: string | undefined, targetDevices: string[]): Promise<string> => {
    const isAll = targetDevices.includes('all');
    
    const targets = isAll 
      ? devices.filter(d => d.status !== 'offline') 
      : devices.filter(d => targetDevices.includes(d.id) && d.status !== 'offline');

    if (targets.length === 0) {
      addLog('System', `No valid targets found for action: ${action}`, 'error');
      return "Error: No online devices found for the command.";
    }

    const deviceNames = targets.map(d => d.name).join(', ');
    addLog('System', `Executing: ./connect_ios_wireless.sh ${action} ${argument || ''} on [${deviceNames}]`, 'command');

    setDevices(prev => prev.map(d => {
      if (targets.find(t => t.id === d.id)) {
        return { ...d, status: 'busy' }; 
      }
      return d;
    }));

    await new Promise(resolve => setTimeout(resolve, 1500));

    setDevices(prev => prev.map(d => {
      if (targets.find(t => t.id === d.id)) {
        let updates: Partial<IOSDevice> = { status: 'connected' };
        
        switch (action) {
          case ScriptCommand.URL: updates.currentApp = 'Safari'; break;
          case ScriptCommand.LAUNCH: updates.currentApp = argument || 'App'; break;
          case ScriptCommand.KILL: updates.currentApp = 'SpringBoard'; break;
          case ScriptCommand.HOME: updates.currentApp = 'SpringBoard'; break;
          case ScriptCommand.RESTART: updates.status = 'offline'; break;
          case ScriptCommand.SCREENSHOT: updates.lastScreenshot = `https://picsum.photos/seed/${Math.random()}/360/640`; break;
          case ScriptCommand.TEXT: addLog('System', `Typed "${argument}" on ${d.name}`, 'success'); break;
        }
        return { ...d, ...updates };
      }
      return d;
    }));

    addLog('System', `Successfully executed ${action} on ${targets.length} devices.`, 'success');
    return `Command ${action} executed successfully on ${deviceNames}.`;
  };

  // --- Live API Connection ---
  const toggleConnection = async () => {
    if (isConnected) {
      streamRef.current?.getTracks().forEach(track => track.stop());
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      audioContextRef.current?.close();
      outputAudioContextRef.current?.close();
      setIsConnected(false);
      addLog('System', 'Voice session ended.', 'info');
      return;
    }

    if (!apiKey) {
      try {
        if (window.aistudio && window.aistudio.openSelectKey) {
             await window.aistudio.openSelectKey();
        } else {
             alert("API Key missing.");
             return;
        }
      } catch (e) {
          alert("Error selecting API key.");
          return;
      }
    }
    
    const currentKey = process.env.API_KEY;
    if(!currentKey) {
         addLog('System', 'API Key not available. Please select one.', 'error');
         return;
    }

    try {
      setIsConnected(true);
      addLog('System', 'Initializing Gemini Live session...', 'info');

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: currentKey });

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: TOOLS }],
          systemInstruction: `You are an advanced iOS Device Management AI. You control devices using the 'execute_ios_script' tool. 
          Available devices are: ${devices.map(d => `${d.name} (ID: ${d.id})`).join(', ')}. 
          
          When a user asks to perform an action (like open url, launch app, restart, etc.), ALWAYS use the tool. 
          If the user says "all phones" or "all devices", pass "all" in the targetDevices array.
          Confirm actions verbally briefly. Be cool, cybernetic, and efficient.`
        },
        callbacks: {
          onopen: () => {
            addLog('AI', 'Connected. Listening for voice commands...', 'success');
            
            if (!audioContextRef.current || !streamRef.current) return;
            
            sourceRef.current = audioContextRef.current.createMediaStreamSource(streamRef.current);
            processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            sourceRef.current.connect(processorRef.current);
            processorRef.current.connect(audioContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
                setIsTalking(true);
                const ctx = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                const audioBuffer = await decodeAudioData(base64ToUint8Array(base64Audio), ctx);
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                
                source.onended = () => {
                    if (ctx.currentTime >= nextStartTimeRef.current) setIsTalking(false);
                };
            }

            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                addLog('AI', `Identified Intent: ${fc.name}`, 'info');
                let result = "Error executing command.";
                if (fc.name === 'execute_ios_script') {
                    const args = fc.args as any;
                    result = await handleScriptExecution(args.action, args.argument, args.targetDevices || ['all']);
                }
                sessionPromiseRef.current?.then(session => {
                  session.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { result: result } }
                  });
                });
              }
            }
          },
          onclose: () => {
             addLog('System', 'Connection closed.', 'info');
             setIsConnected(false);
          },
          onerror: (err) => {
             addLog('System', 'Connection error occurred.', 'error');
             console.error(err);
             setIsConnected(false);
          }
        }
      });

    } catch (error) {
      console.error(error);
      addLog('System', 'Failed to initialize AI session.', 'error');
      setIsConnected(false);
    }
  };

  return (
    <div className="flex h-screen w-screen text-slate-200">
      {/* Sidebar: Glassmorphism */}
      <div className="glass w-80 flex flex-col z-20 border-r-0 border-white/10 m-4 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-white/5 flex items-center gap-3 bg-gradient-to-r from-slate-900/50 to-transparent">
           <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-lg shadow-lg shadow-cyan-500/20">
              <Command className="text-white" size={20} />
           </div>
           <div>
              <h1 className="font-bold text-lg tracking-tight text-white leading-tight">AirCommand</h1>
              <span className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">Protocol v2.0</span>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex justify-between items-center text-[11px] text-slate-400 uppercase font-bold tracking-widest mb-2 px-1">
                <span>Active Targets</span>
                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                   {devices.filter(d => d.status !== 'offline').length} Online
                </span>
            </div>
            {devices.map(device => (
                <DeviceCard key={device.id} device={device} />
            ))}
        </div>

        <div className="p-4 bg-gradient-to-t from-slate-900/80 to-transparent border-t border-white/5">
             <button className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all border border-white/5 hover:border-white/20 text-slate-300">
                <Settings size={14} /> System Preferences
             </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col py-4 pr-4 gap-4 h-full relative">
        
        {/* Header Section with Glass Effect */}
        <div className="glass rounded-2xl p-6 flex justify-between items-center shadow-lg relative overflow-hidden">
            {/* Ambient Background Glow in Header */}
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10">
                <h2 className="text-3xl font-bold text-white mb-1 tracking-tight">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Command Center</span>
                </h2>
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                   <Activity size={14} className={isConnected ? "text-emerald-400" : "text-slate-600"} />
                   {isConnected ? 'Neural Link Active' : 'Systems Standby'}
                </div>
            </div>
            
            <div className="flex items-center gap-4 relative z-10">
                {isTalking && (
                    <div className="flex items-center gap-1 mr-4">
                        <span className="block w-1 h-3 bg-cyan-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite]"></span>
                        <span className="block w-1 h-5 bg-cyan-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.1s]"></span>
                        <span className="block w-1 h-3 bg-cyan-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.2s]"></span>
                    </div>
                )}

                <button 
                    onClick={toggleConnection}
                    className={`
                        relative group px-6 py-3 rounded-xl font-semibold flex items-center gap-3 transition-all duration-300
                        ${isConnected 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]' 
                            : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-[1.02]'
                        }
                    `}
                >
                    {isConnected && <span className="absolute inset-0 rounded-xl animate-pulse-ring border-rose-500"></span>}
                    {isConnected ? <MicOff size={20} /> : <Mic size={20} />}
                    {isConnected ? 'Terminate Link' : 'Initialize Voice'}
                </button>
            </div>
        </div>
        
        {/* Terminal Area */}
        <div className="flex-1 min-h-0 relative z-10">
             <Terminal logs={logs} />
        </div>

        {/* Action Bar / Quick Commands */}
        <div className="glass h-auto min-h-[120px] rounded-2xl p-5 flex flex-col justify-center gap-3">
            <div className="flex items-center gap-2 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                <Sparkles size={12} className="text-amber-400" />
                Available Actions
            </div>
            <div className="flex flex-wrap gap-2">
                {Object.values(ScriptCommand).map(cmd => (
                    <button key={cmd} className="px-3 py-1.5 bg-slate-800/50 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 rounded-lg text-xs border border-white/5 hover:border-cyan-500/30 transition-all font-mono">
                        ./script {cmd}
                    </button>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}