import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePitchEngine } from "../hooks/usePitchEngine";

const VocaScanTuner: React.FC = () => {
  const [sessionInfo] = useState(() => {
    const query = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    return {
      userId: query.get("userId") || "guest_user",
      sessionId: query.get("sessionId") || "direct_access",
    };
  });

  const {
    isRunning, isAnalyzing, isCountingDown, countdown,
    pitch, note, confidence, diagnosis, error, start, stop,
    currentData
  } = usePitchEngine();

  // 針の回転角度計算 (-50~+50 cent を -90~+90度へ)
  const needleRotation = useMemo(() => {
    return ((currentData?.cents ?? 0) / 50) * 90;
  }, [currentData?.cents]);

  const hubUrl = import.meta.env.DEV ? "http://localhost:5173" : "https://app.voca-nical.com";

  return (
    <div className="min-h-screen bg-voca-bg p-6 flex flex-col items-center justify-center font-sans text-voca-text">
      {/* メインカード */}
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-sm p-8 relative overflow-hidden border border-gray-100">

        <header className="text-center mb-8 mt-4">
          <h1 className="voca-logo text-3xl">VocaScan Tuner V7</h1>
          <p className="text-[10px] text-voca-primary font-bold uppercase tracking-[0.2em] mt-2">
            Unwind. Recharge. Sing.
          </p>
        </header>

        {/* ディスプレイエリア */}
        <div className={`relative rounded-[2rem] p-10 text-center mb-8 transition-all duration-500 min-h-[320px] flex flex-col justify-center overflow-hidden
          ${isRunning ? "bg-voca-bg ring-8 ring-voca-bg/50 scale-105" :
            isCountingDown ? "bg-voca-text shadow-[0_0_40px_rgba(217,119,87,0.2)]" : "bg-voca-bg/30"}`}>

{/* 1. 背景レイヤー：高濃度・単一コアパルス (z-0) */}
<AnimatePresence>
  {isRunning && currentData && (
    <motion.div
      key="volume-pulse"
      className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* リングを廃止し、中心の玉のみに集中。
          不透明度を 0.6 〜 1.0 で動かすことで、常に「濃い」状態を維持します。
      */}
      <motion.div
        className="bg-voca-primary rounded-full blur-[60px]"
        animate={{ 
          // サイズの変動幅をさらに大きくし、画面全体を侵食するような動きに
          width: 100 + (currentData.rms * 500),
          height: 100 + (currentData.rms * 500),
          // 0.6(かなり濃い) から 1.0(完全に不透明) の間で明滅
          opacity: 0.6 + (currentData.rms * 0.4) 
        }}
        transition={{ 
          type: "spring", 
          stiffness: 400, // より鋭い反応
          damping: 25, 
          mass: 0.3 
        }}
      />
    </motion.div>
  )}
</AnimatePresence>

          {/* 2. コンテンツレイヤー (z-10) */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            {/* メイン音名表示 */}
            <div className="text-8xl font-mono font-black tracking-tighter">
              {isCountingDown ? (
                <span key={countdown} className="text-voca-primary animate-[ping_0.5s_ease-in-out_1]">
                  {countdown}
                </span>
              ) : (
                <span className={isRunning ? "text-voca-text" : "text-voca-text/20"}>
                  {isRunning ? (note || "---") : "---"}
                </span>
              )}
            </div>

            {/* 周波数表示 */}
            <div className="text-xl font-bold mt-2">
              {isCountingDown ? "READY..." : (isRunning && pitch ? `${pitch.toFixed(1)} Hz` : "WAITING")}
            </div>

            {/* 詳細メーターエリア（計測中のみ表示） */}
            {isRunning && (
              <div className="mt-6 space-y-5 w-full animate-in fade-in duration-700">

                {/* 針メーター (Cents) */}
                {/* 針メーター (Cents) */}
                <div className="flex flex-col items-center">
                  <div className="relative w-36 h-10 overflow-hidden">
                    <svg viewBox="0 0 100 50" className="w-full">
                      {/* メーターの弧 */}
                      <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="1" className="text-voca-text/10" />

                      {/* センターライン（目安） */}
                      <line x1="50" y1="50" x2="50" y2="45" stroke="currentColor" strokeWidth="1" className="text-voca-primary/20" />

                      {/* 修正された針 */}
                      <motion.line
                        x1="50" y1="50" // 根元の位置
                        x2="50" y2="12" // 先端の位置
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className="text-voca-primary"
                        // style で回転軸を明示的に指定します
                        style={{ transformOrigin: "50px 50px" }}
                        animate={{ rotate: needleRotation }}
                        transition={{ type: "spring", stiffness: 150, damping: 15 }}
                      />
                    </svg>
                  </div>
                  <p className="text-[10px] font-mono font-bold text-voca-primary tracking-[0.2em] mt-1">
                    {currentData?.cents ? (currentData.cents > 0 ? `+${currentData.cents}` : currentData.cents) : "0"} CENTS
                  </p>
                </div>

                {/* コンフィデンスバー */}
                <div className="w-full max-w-[180px] mx-auto">
                  <div className="h-1.5 bg-gray-200/40 rounded-full overflow-hidden backdrop-blur-sm">
                    <div
                      className="h-full bg-voca-secondary transition-all duration-300 shadow-[0_0_8px_rgba(var(--voca-secondary-rgb),0.5)]"
                      style={{ width: `${(confidence * 100).toFixed(0)}%` }}
                    />
                  </div>
                  <p className="text-[8px] text-voca-text/40 mt-2 font-bold uppercase tracking-[0.15em]">
                    Confidence: {(confidence * 100).toFixed(0)}%
                  </p>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* 操作ボタン */}
        <div className="space-y-4">
          {!isRunning ? (
            <button
              onClick={() => {
                const ctx = new AudioContext();
                start(ctx);
              }}
              disabled={isCountingDown}
              className={`w-full py-5 rounded-full font-bold text-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-3
                ${isCountingDown
                  ? "bg-voca-text/80 cursor-not-allowed text-voca-primary"
                  : "bg-voca-primary text-white hover:opacity-90"}`}
            >
              {isCountingDown ? `START IN ${countdown}...` : "診断スタート"}
            </button>
          ) : (
            <button
              onClick={stop}
              disabled={isAnalyzing}
              className={`w-full py-5 rounded-full font-bold text-xl text-white transition-all shadow-md
                ${isAnalyzing ? "bg-gray-300" : "bg-voca-text hover:bg-black active:scale-95"}`}
            >
              {isAnalyzing ? "解析中…" : "停止して解析"}
            </button>
          )}
        </div>

        {/* 診断結果表示 */}
        <div className="mt-8 pt-4">
          {error && <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center text-red-500 font-bold text-sm">{error}</div>}

          {diagnosis && !error && !isAnalyzing && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 text-center">
              <div className="p-6 bg-gradient-to-br from-voca-secondary to-voca-secondary/80 rounded-[2rem] text-white shadow-sm">
                <p className="text-[10px] font-bold opacity-70 tracking-widest uppercase">Score (V7 Demo)</p>
                <div className="text-6xl font-black tracking-tighter">
                  {Math.min(100, Math.floor(diagnosis.frames.length / 5))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center border-t border-gray-50 pt-6">
          <a href={hubUrl} className="text-[11px] font-bold text-voca-text/30 hover:text-voca-primary transition-all uppercase tracking-widest">
            ← APPS HUB に戻る
          </a>
        </div>
      </div>
      <p className="mt-8 text-[10px] text-voca-text/20 font-bold uppercase tracking-[0.3em]">© 2026 Voca-nical</p>
    </div>
  );
};

export default VocaScanTuner;