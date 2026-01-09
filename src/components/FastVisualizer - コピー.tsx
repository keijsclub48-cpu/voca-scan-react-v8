import React, { useEffect, useRef } from 'react';
import { engineInstance } from '../audio/CrepeEngine'; // パスは環境に合わせて調整してください

interface FastVisualizerProps {
  isRunning: boolean;
  isCountingDown: boolean;
}

export const FastVisualizer: React.FC<FastVisualizerProps> = ({ isRunning, isCountingDown }) => {
  const pulseRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<SVGLineElement>(null);
  const centsTextRef = useRef<HTMLParagraphElement>(null);
  const freqTextRef = useRef<HTMLDivElement>(null);
  const noteTextRef = useRef<HTMLDivElement>(null);
  const confBarRef = useRef<HTMLDivElement>(null);
  const confTextRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let animId: number;

    const updateUI = () => {
      const needle = needleRef.current;
      const cents = centsTextRef.current;
      const confParent = confBarRef.current?.parentElement;
      const confBar = confBarRef.current;
      const confText = confTextRef.current;
      const note = noteTextRef.current;
      const freq = freqTextRef.current;
      const pulse = pulseRef.current;

      if (isRunning) {
        /** 【状態1：計測中】 リアルタイム駆動 **/
        // engineInstance から直接最新値を取得 (ReactのStateを介さないので爆速)
        const rms = engineInstance.currentRMS;
        const currentFreq = engineInstance.currentFreq;
        const currentCents = engineInstance.currentCents;
        const currentNote = engineInstance.currentNote;
        const conf = engineInstance.currentConf;

        if (pulse) {
          const size = 120 + (rms * 600);
          pulse.style.width = `${size}px`;
          pulse.style.height = `${size}px`;
          pulse.style.opacity = `${0.3 + (rms * 0.7)}`;
          pulse.style.display = "block";
        }
        if (needle) {
          needle.style.opacity = "1";
          const rotation = (Math.max(-50, Math.min(50, currentCents)) / 50) * 80;
          needle.style.transform = `rotate(${rotation}deg)`;
        }
        if (note) {
          note.style.opacity = "1";
          note.textContent = currentNote || "---";
        }
        if (freq) {
          freq.style.opacity = "0.8";
          freq.textContent = currentFreq > 0 ? `${currentFreq.toFixed(1)} Hz` : "WAITING";
        }
        if (cents) {
          cents.style.opacity = "1";
          cents.textContent = `${Math.round(currentCents)} CENTS`;
        }
        if (confBar) confBar.style.width = `${conf * 100}%`;
        if (confParent) confParent.style.opacity = "1";
        if (confText) {
          confText.style.opacity = "1";
          confText.textContent = `Confidence: ${Math.round(conf * 100)}%`;
        }

      } else if (isCountingDown) {
        /** 【状態2：カウントダウン/解析中】 全て隠す（漆黒） **/
        [pulse, needle, note, freq, cents, confParent, confText].forEach(el => {
          if (el) el.style.opacity = "0";
        });
        if (pulse) pulse.style.display = "none";

      } else {
        /** 【状態3：待機中】 メーターを表示（初期値） **/
        if (pulse) {
          pulse.style.opacity = "0";
          pulse.style.display = "none";
        }
        if (needle) {
          needle.style.opacity = "1";
          needle.style.transform = `rotate(0deg)`;
        }
        if (note) {
          note.style.opacity = "1";
          note.textContent = "---";
        }
        if (freq) {
          freq.style.opacity = "0.6";
          freq.textContent = "READY";
        }
        if (cents) {
          cents.style.opacity = "1";
          cents.textContent = "0 CENTS";
        }
        if (confBar) confBar.style.width = "0%";
        if (confParent) confParent.style.opacity = "1";
        if (confText) {
          confText.style.opacity = "1";
          confText.textContent = "Confidence: 0%";
        }
      }
      
      animId = requestAnimationFrame(updateUI);
    };

    updateUI();
    return () => cancelAnimationFrame(animId);
  }, [isRunning, isCountingDown]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none overflow-hidden">
      {/* 背景パルス (音量に連動) */}
      <div ref={pulseRef} className="absolute bg-[#D97757] rounded-full blur-[70px] z-0 transition-opacity duration-300" style={{ width: '0px', height: '0px', opacity: 0 }} />
      
      {/* 中央：音名と周波数 */}
      <div className="relative z-10 flex flex-col items-center transition-opacity duration-500">
        <div ref={noteTextRef} className="text-8xl font-mono font-black tracking-tighter text-voca-text mb-2 transition-opacity duration-300">---</div>
        <div ref={freqTextRef} className="text-xl font-bold text-voca-text opacity-80 transition-opacity duration-300">READY</div>
      </div>

      {/* 下部：メーター類 */}
      <div className="mt-8 z-10 flex flex-col items-center w-full max-w-[200px]">
        {/* 針メーター */}
        <div className="relative w-36 h-12 overflow-hidden mb-1 transition-opacity duration-300">
          <svg viewBox="0 0 100 50" className="w-full">
            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="1" className="text-voca-text/10" />
            <line 
              ref={needleRef}
              x1="50" y1="45" x2="50" y2="10" 
              stroke="#D97757" strokeWidth="3" strokeLinecap="round"
              style={{ transformOrigin: "50px 45px", transition: 'transform 0.1s ease-out', opacity: 1 }} 
            />
          </svg>
        </div>
        <p ref={centsTextRef} className="text-[10px] font-mono font-bold text-[#D97757] tracking-[0.2em] mb-4 transition-opacity duration-300">0 CENTS</p>

        {/* Confidence バー */}
        <div className="w-full h-1 bg-gray-200/40 rounded-full overflow-hidden backdrop-blur-sm transition-opacity duration-300">
          <div ref={confBarRef} className="h-full bg-[#1EA7B8] shadow-[0_0_8px_rgba(30,167,184,0.5)]" style={{ width: '0%' }} />
        </div>
        <p ref={confTextRef} className="text-[7px] text-voca-text/40 mt-1 font-bold uppercase tracking-[0.1em] transition-opacity duration-300">
          Confidence: 0%
        </p>
      </div>
    </div>
  );
};