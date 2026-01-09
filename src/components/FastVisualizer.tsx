import React, { useEffect, useRef } from 'react';
import { engineInstance } from '../hooks/usePitchEngine';

export const FastVisualizer: React.FC<{ isRunning: boolean }> = ({ isRunning }) => {
  const pulseRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<SVGLineElement>(null);
  const centsTextRef = useRef<HTMLParagraphElement>(null);
  const freqTextRef = useRef<HTMLDivElement>(null);
  const noteTextRef = useRef<HTMLDivElement>(null);
  const confBarRef = useRef<HTMLDivElement>(null); // ★Confidence用
const confTextRef = useRef<HTMLParagraphElement>(null);

useEffect(() => {
  let animId: number;

  const updateUI = () => {
    // 実行中（isRunning === true）の時だけエンジンから値を読み出す
    if (isRunning) {
      const rms = engineInstance.currentRMS;
      const freq = engineInstance.currentFreq;
      const cents = engineInstance.currentCents;
      const note = engineInstance.currentNote;
      const conf = engineInstance.currentConf;

      if (pulseRef.current) {
        const size = 120 + (rms * 600);
        pulseRef.current.style.width = `${size}px`;
        pulseRef.current.style.height = `${size}px`;
        pulseRef.current.style.opacity = `${0.5 + (rms * 0.5)}`;
      }
      if (needleRef.current) {
        const rotation = (Math.max(-50, Math.min(50, cents)) / 50) * 80;
        needleRef.current.style.transform = `rotate(${rotation}deg)`;
      }
      if (noteTextRef.current) noteTextRef.current.textContent = note || "---";
      if (freqTextRef.current) freqTextRef.current.textContent = freq > 0 ? `${freq.toFixed(1)} Hz` : "WAITING";
      if (centsTextRef.current) centsTextRef.current.textContent = `${Math.round(cents)} CENTS`;
      // if (confBarRef.current) confBarRef.current.style.width = `${conf * 100}%`;
// バーを伸ばす
  if (confBarRef.current) {
    confBarRef.current.style.width = `${conf * 100}%`;
  }
  // 数値を書き換える (Confidence: 85% のように)
  if (confTextRef.current) {
    confTextRef.current.textContent = `Confidence: ${Math.round(conf * 100)}%`;
  }
    } else {
      // ★ カウントダウン中や待機中（isRunning === false）は表示をリセット
      if (pulseRef.current) {
        pulseRef.current.style.width = `0px`;
        pulseRef.current.style.opacity = `0`;
      }
      if (needleRef.current) {
        needleRef.current.style.transform = `rotate(0deg)`;
      }
      if (noteTextRef.current) noteTextRef.current.textContent = "---";
      if (freqTextRef.current) freqTextRef.current.textContent = "WAITING";
      if (centsTextRef.current) centsTextRef.current.textContent = "0 CENTS";
      if (confBarRef.current) confBarRef.current.style.width = `0%`;
    }
    
    animId = requestAnimationFrame(updateUI);
  };

  updateUI();
  return () => cancelAnimationFrame(animId);
}, [isRunning]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none overflow-hidden">
      {/* 背景パルス (z-0) */}
      <div ref={pulseRef} className="absolute bg-[#D97757] rounded-full blur-[70px] z-0" style={{ opacity: 0 }} />
      
      {/* 中央：音名 (z-10) */}
      <div className="relative z-10 flex flex-col items-center">
        <div ref={noteTextRef} className="text-8xl font-mono font-black tracking-tighter text-voca-text mb-2">---</div>
        <div ref={freqTextRef} className="text-xl font-bold text-voca-text opacity-80">WAITING</div>
      </div>

      {/* 下部：メーター類 (z-10) */}
      <div className="mt-8 z-10 flex flex-col items-center w-full max-w-[200px]">
        {/* 針メーター */}
        <div className="relative w-36 h-12 overflow-hidden mb-1">
          <svg viewBox="0 0 100 50" className="w-full">
            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="1" className="text-voca-text/10" />
            <line 
              ref={needleRef}
              x1="50" y1="45" x2="50" y2="10" 
              stroke="#D97757" strokeWidth="3" strokeLinecap="round"
              style={{ transformOrigin: "50px 45px", transition: 'transform 0.1s ease-out' }} 
            />
          </svg>
        </div>
        <p ref={centsTextRef} className="text-[10px] font-mono font-bold text-[#D97757] tracking-[0.2em] mb-4">0 CENTS</p>

{/* Confidence バー */}
        <div className="w-full h-1 bg-gray-200/40 rounded-full overflow-hidden backdrop-blur-sm">
          {/* transition-all を外して直結の反応速度を最大化します */}
          <div 
            ref={confBarRef} 
            className="h-full bg-[#1EA7B8] shadow-[0_0_8px_rgba(30,167,184,0.5)]" 
            style={{ width: '0%' }} 
          />
        </div>
        {/* ★ここを ref={confTextRef} に修正！ */}
        <p 
          ref={confTextRef} 
          className="text-[7px] text-voca-text/40 mt-1 font-bold uppercase tracking-[0.1em]"
        >
          Confidence: 0%
        </p>      </div>
    </div>
  );
};