import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp, ArrowDown, Settings, Lock, Unlock, Droplet, Activity, Maximize, Database } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [started, setStarted] = useState(false);
  
  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 font-sans p-6 selection:bg-blue-500/30">
        <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-white/10 flex flex-col items-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full"></div>
            <Activity className="w-16 h-16 text-blue-400 relative z-10" />
          </div>
          <h1 className="text-3xl font-display font-medium tracking-tight mb-3 text-center text-white">NetSpeed Widget</h1>
          <p className="text-slate-400 text-center mb-10 leading-relaxed">
            Real-time floating network tracking for Windows. Ready for native Electron compilation.
          </p>
          <button 
            onClick={() => setStarted(true)}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3.5 px-6 rounded-xl transition-all focus:ring-4 focus:ring-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] active:scale-95"
          >
            Start Widget
          </button>
        </div>
      </div>
    );
  }

  return <WidgetHost />;
}

function WidgetHost() {
  // Widget State
  const [speed, setSpeed] = useState({ uploadMs: 0, downloadMs: 0 });
  const [locked, setLocked] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [widgetScale, setWidgetScale] = useState(1);
  const [showMenu, setShowMenu] = useState(false);

  // Daily Usage State
  const [dailyUsage, setDailyUsage] = useState(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const savedDate = localStorage.getItem('usageDate');
    return savedDate === todayStr ? Number(localStorage.getItem('dailyUsage')) || 0 : 0;
  });

  // Network polling
  useEffect(() => {
    // Poll over API in web mode, or IPC in Electron
    const fetchSpeed = async () => {
      try {
        let data = { uploadMs: 0, downloadMs: 0 };
        // @ts-ignore
        if (window.require) {
           // @ts-ignore
           const { ipcRenderer } = window.require('electron');
           data = await ipcRenderer.invoke('get-network-speed');
        } else {
           const res = await fetch('/api/speed');
           data = await res.json();
        }
        
        setSpeed(data);
        
        // Accumulate bytes per second for daily total
        setDailyUsage(prev => {
          const addedBytes = data.downloadMs + data.uploadMs;
          const todayStr = new Date().toISOString().split('T')[0];
          
          if (localStorage.getItem('usageDate') !== todayStr) {
             localStorage.setItem('usageDate', todayStr);
             localStorage.setItem('dailyUsage', addedBytes.toString());
             return addedBytes;
          }
          
          const newVal = prev + addedBytes;
          localStorage.setItem('dailyUsage', newVal.toString());
          return newVal;
        });
      } catch (err) {
        // Fallback
      }
    };
    
    // We poll rapidly to give real-time feel
    const interval = setInterval(fetchSpeed, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec > 1024 * 1024) {
      return { val: (bytesPerSec / (1024 * 1024)).toFixed(1), unit: 'MB/s' };
    }
    return { val: (bytesPerSec / 1024).toFixed(1), unit: 'KB/s' };
  };

  const formatData = (bytes: number) => {
    if (bytes > 1024 * 1024 * 1024) {
      return { val: (bytes / (1024 ** 3)).toFixed(2), unit: 'GB' };
    }
    if (bytes > 1024 * 1024) {
      return { val: (bytes / (1024 ** 2)).toFixed(1), unit: 'MB' };
    }
    return { val: (bytes / 1024).toFixed(1), unit: 'KB' };
  };

  // The image shows a single large number, we can use the max of upload/download for the display number like task manager,
  // or simply the total throughput. We will use total throughput.
  const totalSpeedBytes = speed.downloadMs + speed.uploadMs;
  const { val, unit } = formatSpeed(totalSpeedBytes);

  // Use a small threshold (e.g. 5KB/s) to show activity colors
  const isUploading = speed.uploadMs > 1024 * 5;
  const isDownloading = speed.downloadMs > 1024 * 5;

  return (
    <div className="min-h-screen w-full bg-[#0b101e] overflow-hidden relative font-sans selection:bg-blue-500/30 text-slate-100">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
        <div className="text-center">
          <p className="text-slate-400 text-xl font-medium mb-2">Desktop Environment</p>
          <p className="text-slate-600 text-sm max-w-sm">
            Drag the widget around. Click it to open settings.
          </p>
        </div>
      </div>

      <motion.div
        drag={!locked}
        dragMomentum={false}
        className={cn(
          "absolute p-1 rounded-full",
           locked ? "cursor-default" : "cursor-move"
        )}
        style={{ opacity }}
        initial={{ scale: 0.8, opacity: 0, x: window.innerWidth / 2 - 140, y: 100 }}
        animate={{ scale: widgetScale, opacity: opacity }}
      >
        <div 
          onClick={() => setShowMenu(!showMenu)}
          className={cn(
            "relative flex items-center justify-between gap-6 bg-[#161b2c] rounded-full px-7 py-3 border",
            "border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all duration-300",
            "hover:border-white/20 select-none min-w-[240px]"
          )}
        >
          {/* Speed Text Component */}
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display font-medium text-white tracking-tight">{val}</span>
            <span className="text-lg font-medium text-slate-400">{unit}</span>
          </div>

          {/* Arrows */}
          <div className="flex items-center gap-2">
            <motion.div
              animate={{
                color: isUploading ? '#60a5fa' : '#334155',
                filter: isUploading ? 'drop-shadow(0 0 10px rgba(96,165,250,0.9))' : 'none',
                scale: isUploading ? 1.05 : 1
              }}
              transition={{ duration: 0.2 }}
            >
              <ArrowUp strokeWidth={3} className="w-8 h-8" />
            </motion.div>
            
            <motion.div
              animate={{
                color: isDownloading ? '#4ade80' : '#334155',
                filter: isDownloading ? 'drop-shadow(0 0 10px rgba(74,222,128,0.9))' : 'none',
                scale: isDownloading ? 1.05 : 1
              }}
              transition={{ duration: 0.2 }}
            >
              <ArrowDown strokeWidth={3} className="w-8 h-8" />
            </motion.div>
          </div>
        </div>

        {/* Options Menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full mt-4 left-0 w-64 bg-[#161b2c]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-50"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <span className="text-sm font-medium text-slate-300">Widget Options</span>
                  <Settings className="w-4 h-4 text-slate-400" />
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocked(!locked);
                  }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-200 transition-colors"
                >
                  <span className="text-sm font-medium">Lock Position</span>
                  {locked ? <Lock className="w-4 h-4 text-blue-400" /> : <Unlock className="w-4 h-4 text-slate-400" />}
                </button>

                <div className="px-3 py-2 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-slate-200">
                    <span className="text-sm font-medium">Transparency</span>
                    <Droplet className="w-4 h-4 text-slate-400" />
                  </div>
                  <input 
                    type="range" 
                    min="20" 
                    max="100" 
                    value={opacity * 100} 
                    onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                    className="w-full accent-blue-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="px-3 py-2 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-slate-200">
                    <span className="text-sm font-medium">Widget Size</span>
                    <Maximize className="w-4 h-4 text-slate-400" />
                  </div>
                  <input 
                    type="range" 
                    min="50" 
                    max="150" 
                    value={widgetScale * 100} 
                    onChange={(e) => setWidgetScale(Number(e.target.value) / 100)}
                    className="w-full accent-blue-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-800/50 flex flex-col gap-2 border border-white/5 mt-2">
                  <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase flex items-center justify-between">
                    Current Session Rate
                  </span>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-1.5">
                      <ArrowUp className="w-3 h-3 text-blue-400" />
                      <span className="text-slate-300 font-mono">
                        {formatSpeed(speed.uploadMs).val} {formatSpeed(speed.uploadMs).unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ArrowDown className="w-3 h-3 text-green-400" />
                      <span className="text-slate-300 font-mono">
                         {formatSpeed(speed.downloadMs).val} {formatSpeed(speed.downloadMs).unit}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-500/10 flex flex-col gap-2 border border-blue-500/20">
                  <span className="text-xs font-semibold tracking-wider text-blue-400 uppercase flex items-center justify-between">
                    Daily Usage
                    <Database className="w-3 h-3" />
                  </span>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-100 font-mono text-lg font-medium">
                      {formatData(dailyUsage).val} <span className="text-sm text-blue-300">{formatData(dailyUsage).unit}</span>
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
