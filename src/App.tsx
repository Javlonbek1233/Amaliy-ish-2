import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Terminal } from './components/Terminal';
import { MatrixBackground } from './components/MatrixBackground';
import { generateMission, getAiResponse } from './services/aiService';
import { auth, db, loginWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { Shield, Zap, Globe, Lock, Cpu, Activity, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Socket setup
const socket = io();

interface LogEntry {
  id: string;
  type: 'info' | 'error' | 'success' | 'command' | 'ai';
  text: string;
  timestamp: string;
}

interface Mission {
  title: string;
  target: string;
  description: string;
  steps: string[];
  handlerMessage: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentMission, setCurrentMission] = useState<Mission | null>(null);
  const [missionProgress, setMissionProgress] = useState(0);
  const [activeScreen, setActiveScreen] = useState<'terminal' | 'missions' | 'leaderboard'>('terminal');

  const addLog = useCallback((text: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-100), {
      id: Math.random().toString(36).substr(2, 9),
      type,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour12: false })
    }]);
  }, []);

  // Sync Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        addLog(`User authenticated: ${user.displayName}`, 'success');
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const newData = {
            uid: user.uid,
            username: user.displayName || 'Unnamed Оперативник',
            xp: 0,
            level: 1,
            reputation: 100,
            stats: { missionsCompleted: 0, serversHacked: 0, defensesBreached: 0 },
            createdAt: new Date().toISOString()
          };
          await setDoc(userRef, newData);
          setUserData(newData);
        } else {
          setUserData(userSnap.data());
        }
      } else {
        addLog("Awaiting terminal authentication... Use 'login' command.");
      }
    });

    // Terminal Welcome
    addLog("GHOSTNET OS v4.0.1 INITIALIZED", "info");
    addLog("System encrypted via Quantum-Lock protocols.", "info");
    addLog("Type 'help' to see available commands.", "info");

    return () => unsubscribe();
  }, [addLog]);

  // Socket listener
  useEffect(() => {
    socket.on('mission-update', (data) => {
      if (data.type === 'PROGRESS') {
        addLog(`External operative ${data.user.slice(0,4)} progress: ${data.progress}%`, 'success');
      }
    });
    return () => {
      socket.off('mission-update');
    };
  }, [addLog]);

  const [isListening, setIsListening] = useState(false);
  const [enemyAlert, setEnemyAlert] = useState(false);

  // AI Enemy Simulation
  useEffect(() => {
    const triggerEnemy = () => {
      if (currentMission && Math.random() > 0.7) {
        setEnemyAlert(true);
        addLog("CRITICAL: Counter-hack detected by AI Sentry!", "error");
        setTimeout(() => setEnemyAlert(false), 5000);
      }
    };
    const interval = setInterval(triggerEnemy, 15000);
    return () => clearInterval(interval);
  }, [currentMission, addLog]);

  // Voice Recognition setup
  const startVoiceControl = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addLog("Voice protocols not supported in this link.", "error");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => {
      setIsListening(true);
      addLog("Voice uplink established. State command.", "info");
    };
    recognition.onresult = (event: any) => {
      const command = event.results[0][0].transcript;
      handleCommand(command);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleCommand = async (command: string) => {
    const cmd = command.toLowerCase().trim();
    addLog(command, 'command');

    if (cmd === 'voice start') {
      startVoiceControl();
      return;
    }

    if (cmd === 'help') {
      addLog("AVAILABLE PROTOCOLS:");
      addLog("- login: Authenticate with GhostNet HQ");
      addLog("- mission start: Request high-yield objective from AI Command");
      addLog("- mission status: Review current data-heist parameters");
      addLog("- hack: Execute payload on current target");
      addLog("- stats: View operative profile and reputation");
      addLog("- clear: Flush terminal buffer");
      return;
    }

    if (cmd === 'login') {
      if (user) {
        addLog("Operative already identified.", "error");
      } else {
        try {
          await loginWithGoogle();
        } catch (err) {
          addLog("Authentication failed. Connection unstable.", "error");
        }
      }
      return;
    }

    if (cmd === 'clear') {
      setLogs([]);
      return;
    }

    if (cmd === 'stats') {
      if (!userData) {
        addLog("Authentication required to access profile.", "error");
      } else {
        addLog(`ID: ${userData.username}`);
        addLog(`XP: ${userData.xp} | LEVEL: ${userData.level}`);
        addLog(`COMMITS: ${userData.stats.missionsCompleted} | NODES: ${userData.stats.serversHacked}`);
      }
      return;
    }

    if (cmd === 'mission start') {
      addLog("Accessing AI Command...", "info");
      try {
        const mission = await generateMission();
        setCurrentMission(mission);
        setMissionProgress(0);
        addLog(`NEW MISSION LOADED: ${mission.title}`, "success");
        addLog(`TARGET: ${mission.target}`);
        addLog(`BRIEFING: ${mission.handlerMessage}`, "ai");
        addLog(`STEPS: ${mission.steps.join(' -> ')}`);
        socket.emit('join-mission', mission.title);
      } catch (err) {
        addLog("Failed to reach AI Command. Neural link severance detected.", "error");
      }
      return;
    }

    if (cmd === 'hack') {
      if (!currentMission) {
        addLog("No active mission targets found. Request 'mission start'.", "error");
        return;
      }

      const step = Math.min(Math.floor(missionProgress / (100 / currentMission.steps.length)), currentMission.steps.length - 1);
      addLog(`Executing: ${currentMission.steps[step]}...`, "info");
      
      // Simulate hack with AI flavor
      const aiResponse = await getAiResponse("hack", { mission: currentMission, progress: missionProgress });
      addLog(aiResponse, "ai");

      const newProgress = Math.min(missionProgress + 25, 100);
      setMissionProgress(newProgress);
      socket.emit('hack-progress', { missionId: currentMission.title, progress: newProgress });

      if (newProgress === 100) {
        addLog(`MISSION ACCOMPLISHED: ${currentMission.title} SEVERED.`, "success");
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            xp: increment(500),
            'stats.missionsCompleted': increment(1),
            'stats.serversHacked': increment(1)
          });
          const snap = await getDoc(userRef);
          setUserData(snap.data());
        }
        setCurrentMission(null);
      }
      return;
    }

    // Generic AI interaction if unexpected command
    const aiResp = await getAiResponse(cmd, { mission: currentMission });
    addLog(aiResp, 'ai');
  };

  return (
    <div className="relative min-h-screen bg-black text-green-500 selection:bg-green-500 selection:text-black overflow-hidden flex flex-col md:flex-row">
      <MatrixBackground />
      
      {/* Sidebar - Operative Stats */}
      <aside className="w-full md:w-80 bg-black/60 border-b md:border-b-0 md:border-r border-green-500/20 p-6 z-10 flex flex-col gap-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Cpu className="text-green-400 animate-pulse" size={32} />
            <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter text-white">GhostNet</h1>
            <p className="text-[10px] text-green-500/50 uppercase tracking-[0.2em]">Quantum Security Simulator</p>
          </div>
        </div>

        {/* operative Status */}
        <div className="space-y-4">
          <div className="p-4 rounded border border-green-500/10 bg-green-500/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] uppercase font-bold text-green-500/60 flex items-center gap-1">
                <Shield size={10} /> Reputation
              </span>
              <span className="text-xs text-white">Lvl {userData?.level || 1}</span>
            </div>
            <div className="h-1.5 w-full bg-green-900/30 rounded-full overflow-hidden">
               <motion.div 
                className="h-full bg-green-400"
                initial={{ width: 0 }}
                animate={{ width: `${(userData?.xp % 1000) / 10}%` || '10%' }}
               />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 border border-green-500/10 rounded flex flex-col items-center">
              <Activity size={14} className="mb-1 text-blue-400" />
              <span className="text-[9px] uppercase opacity-50">Missions</span>
              <span className="text-lg font-bold text-white">{userData?.stats?.missionsCompleted || 0}</span>
            </div>
            <div className="p-3 border border-green-500/10 rounded flex flex-col items-center">
              <Trophy size={14} className="mb-1 text-yellow-400" />
              <span className="text-[9px] uppercase opacity-50">Score</span>
              <span className="text-lg font-bold text-white">{userData?.xp || 0}</span>
            </div>
          </div>
        </div>

        {/* active Mission */}
        <div className="flex-1">
          <h2 className="text-[10px] uppercase font-bold text-green-500/60 mb-4 tracking-widest flex items-center gap-2">
            <Zap size={10} /> Active Target
          </h2>
          <AnimatePresence mode="wait">
            {enemyAlert && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="mb-4 p-2 bg-red-500/20 border border-red-500 text-red-500 text-[10px] uppercase font-bold flex items-center gap-2 animate-pulse"
              >
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                Intrusion Detected - AI Sentry Active
              </motion.div>
            )}
            {currentMission ? (
              <motion.div 
                key="mission"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 border border-green-400/30 bg-green-400/5 rounded relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <Lock size={48} />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{currentMission.title}</h3>
                <p className="text-[10px] opacity-60 mb-3">{currentMission.target}</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-[8px] uppercase">
                    <span>Injection Progress</span>
                    <span>{missionProgress}%</span>
                  </div>
                  <div className="h-1 bg-green-900/50 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-green-400 shadow-[0_0_8px_#4ade80]"
                      animate={{ width: `${missionProgress}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 opacity-20 italic text-xs">
                <Globe size={32} className="mb-2" />
                No active signals.
              </div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="mt-auto pt-4 border-t border-green-500/10">
          <div className="flex items-center gap-2 text-[8px] uppercase opacity-40">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Encryption Status: Secure
          </div>
        </div>
      </aside>

      {/* Main Terminal Area */}
      <main className="flex-1 p-4 md:p-8 flex flex-col z-10 overflow-hidden relative">
        {/* Top Bar for Mobile */}
        <div className="md:hidden flex items-center justify-between mb-4 px-2">
           <h1 className="text-lg font-bold text-white">GhostNet</h1>
           <div className="flex gap-2">
            <div className="px-2 py-1 border border-green-500/20 rounded text-[10px] text-white">XP: {userData?.xp || 0}</div>
           </div>
        </div>

        <div className="flex-1 min-h-0">
          <Terminal onCommand={handleCommand} logs={logs} />
        </div>

        {/* footer overlay glitch effect */}
        <div className="absolute bottom-10 right-10 pointer-events-none opacity-20">
          <div className="text-[120px] font-black tracking-tighter select-none leading-none">ROOT</div>
        </div>
      </main>
    </div>
  );
}
