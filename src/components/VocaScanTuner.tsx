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
    pitch, note, confidence, diagnosis, displayScore, 
    error, start, stop, currentData
  } = usePitchEngine();

  // 針の回転計算（現在のデータを反映）
  const needleRotation = useMemo(() => {
    return ((currentData?.cents ?? 0) / 50) * 90;
  }, [currentData?.cents]);

  // JSONダウンロード機能
  const downloadJsonResult = () => {
    if (!diagnosis) return;
    const dataStr = JSON.stringify(diagnosis, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `VocaScan_V8_Log_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hubUrl = import.meta.env.DEV ? "http://localhost:5173" : "https://app.voca-nical.com";

  return (
    <div className="min-h-screen bg-voca-bg p-6 flex flex-col items-center justify-center font-sans text-voca-text">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-sm p-8 relative overflow-hidden border border-gray-100">

        <header className="text-center mb-8 mt-4">
          <h1 className="voca-logo text-3xl">VocaScan Tuner V8</h1>
          <p className="text-[10px] text-voca-primary font-bold uppercase tracking-[0.2em] mt-2">
            Unwind. Recharge. Sing.
          </p>
        </header>

        {/* ディスプレイエリア：以前の min-h-[260px] とトランジションを復元 */}
        <div className={`relative rounded-[2rem] p-10 text-center mb-8 transition-all duration-500 min-h-[260px] flex flex-col justify-center overflow-hidden
          ${isRunning ? "bg-voca-bg ring-8 ring-voca-bg/50 scale-105" :
            isCountingDown ? "bg-voca-text shadow-[0_0_40px_rgba(217,119,87,0.2)]" : "bg-voca-bg/30"}`}>

{/* 背景パルス：will-change-transform を追加してGPU負荷を軽減 */}
<AnimatePresence>
  {isRunning && currentData && (
    <motion.div
      key="volume-pulse"
      className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center will-change-transform"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-voca-primary rounded-full blur-[40px]" // 60pxから40pxへ少し下げて負荷軽減
        animate={{ 
          width: 100 + (currentData.rms * 450),
          height: 100 + (currentData.rms * 450),
          opacity: 0.6 + (currentData.rms * 0.4) 
        }}
        // transitionを少し緩やかにして計算負荷を下げる
        transition={{ type: "spring", stiffness: 200, damping: 30, mass: 1 }}
      />
    </motion.div>
  )}
</AnimatePresence>

          {/* コンテンツレイヤー：animate-ping を復活 */}
          <div className="relative z-10 flex flex-col items-center justify-center">
{/* カウントダウン表示：0を表示しないように修正 */}
<div className="text-8xl font-mono font-black tracking-tighter">
  {isCountingDown && countdown > 0 ? (
    <span key={countdown} className="text-voca-primary inline-block animate-[ping_0.5s_ease-in-out_1]">
      {countdown}
    </span>
  ) : (
    <span className={isRunning ? "text-voca-text" : "text-voca-text/20"}>
      {isRunning ? (note || "---") : "---"}
    </span>
  )}
</div>

            <div className="text-xl font-bold mt-4 font-mono">
              {isCountingDown ? "READY..." : (isRunning && pitch ? `${pitch.toFixed(1)} Hz` : "WAITING")}
            </div>

            {/* メーター表示 */}
            {isRunning && (
              <div className="mt-6 space-y-5 w-full animate-in fade-in duration-700">
                <div className="flex flex-col items-center">
                  <div className="relative w-36 h-10 overflow-hidden">
                    <svg viewBox="0 0 100 50" className="w-full">
                      <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="1" className="text-voca-text/10" />
                      <motion.line
                        x1="50" y1="50" x2="50" y2="12"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                        className="text-voca-primary"
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

                <div className="w-full max-w-[180px] mx-auto">
                  <div className="h-1.5 bg-gray-200/40 rounded-full overflow-hidden backdrop-blur-sm">
                    <div 
                      className="h-full bg-voca-secondary transition-all duration-300"
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
              onClick={() => start(new AudioContext())}
              disabled={isCountingDown}
              className={`w-full py-5 rounded-full font-bold text-xl transition-all shadow-md active:scale-95
                ${isCountingDown ? "bg-voca-text/80 text-voca-primary" : "bg-voca-primary text-white hover:opacity-90"}`}
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

        {/* 診断結果 ＆ JSON保存 */}
        <div className="mt-8 pt-4">
          {error && <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-center text-sm font-bold">{error}</div>}

          {diagnosis && !error && !isAnalyzing && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 text-center">
              <div className="p-6 bg-gradient-to-br from-voca-secondary to-voca-secondary/80 rounded-[2rem] text-white shadow-sm">
                <p className="text-[10px] font-bold opacity-70 tracking-widest uppercase">Total Score</p>
                <div className="text-6xl font-black tracking-tighter">{displayScore}</div>
              </div>
              
              <button
                onClick={downloadJsonResult}
                className="w-full py-4 rounded-2xl bg-voca-bg text-voca-text/60 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-voca-bg/80 transition-all border border-gray-100 flex items-center justify-center gap-2"
              >
                <span>📥</span> 診断ログをJSONで保存
              </button>
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