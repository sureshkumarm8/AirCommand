import React from 'react';
import { IOSDevice } from '../types';
import { Smartphone, Battery, Signal, Wifi, AppWindow, Hash } from 'lucide-react';

interface DeviceCardProps {
  device: IOSDevice;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device }) => {
  const isOnline = device.status !== 'offline';
  const isBusy = device.status === 'busy';
  
  return (
    <div className={`
      group relative overflow-hidden rounded-2xl border transition-all duration-500
      ${isOnline 
        ? 'bg-slate-900/40 border-white/5 hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]' 
        : 'bg-slate-900/20 border-white/5 opacity-50 grayscale'
      }
    `}>
      {/* Busy State Overlay */}
      {isBusy && (
        <div className="absolute inset-0 bg-cyan-500/5 animate-pulse z-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent -skew-x-12 translate-x-[-100%] animate-[shimmer_1.5s_infinite]"></div>
        </div>
      )}

      <div className="relative z-10 p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className={`
                p-2.5 rounded-xl shadow-inner flex items-center justify-center
                ${isOnline ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-cyan-400 ring-1 ring-white/10' : 'bg-slate-800 text-slate-600'}
            `}>
              <Smartphone size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-white tracking-wide leading-tight truncate w-32" title={device.name}>{device.name}</h3>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-1">
                <span>{device.model}</span>
              </div>
            </div>
          </div>
          
          {/* Status Dot */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isOnline && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                   device.status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}></span>
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  device.status === 'connected' ? 'bg-emerald-500' :
                  device.status === 'busy' ? 'bg-amber-500' : 'bg-rose-500'
              }`}></span>
            </span>
          </div>
        </div>

        {/* UDID Display (New) */}
        <div className="bg-black/40 rounded px-2 py-1 mb-3 border border-white/5 flex items-center gap-2">
            <Hash size={10} className="text-slate-500" />
            <span className="text-[10px] font-mono text-slate-400 truncate w-full" title={device.id}>
                {device.id}
            </span>
        </div>

        {/* Screen Preview */}
        <div className="relative aspect-video bg-black/80 rounded-lg overflow-hidden border border-white/10 mb-4 group-hover:border-white/20 transition-colors">
            {device.lastScreenshot ? (
                <img src={device.lastScreenshot} alt="Screen" className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                   <div className="text-slate-700 font-mono text-xs flex items-center gap-2">
                      <Signal size={12} className={isOnline ? "animate-pulse" : ""} />
                      {isOnline ? "AWAITING INPUT" : "NO SIGNAL"}
                   </div>
                </div>
            )}
            
            {/* IP Tag */}
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 border border-white/5 flex items-center gap-1.5">
                <Wifi size={10} />
                {device.ip}
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 rounded-lg p-2 flex items-center gap-2 border border-white/5">
                <Battery size={14} className={device.batteryLevel < 20 ? 'text-rose-400' : 'text-emerald-400'} />
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Battery</span>
                    <span className="text-xs font-mono">{device.batteryLevel}%</span>
                </div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 flex items-center gap-2 border border-white/5">
                <AppWindow size={14} className="text-indigo-400" />
                 <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Active App</span>
                    <span className="text-xs font-mono truncate w-24">{device.currentApp || 'SpringBoard'}</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};