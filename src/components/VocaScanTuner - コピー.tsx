import React, { useState } from "react";
import { usePitchEngine } from "../hooks/usePitchEngine";
import { FastVisualizer } from './FastVisualizer';
import { motion } from "framer-motion";

const VocaScanTuner: React.FC = () => {
  // アプリ全体のリセット用Key
  const [sessionInfo] = useState(() => {
    const query = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    return {
      userId: query.get("userId") || "guest_user",
      sessionId: query.get("sessionId") || "direct_access",
    };
  });

  const {
    isRunning,
    isAnalyzing,
    isCountingDown,
    countdown,
    diagnosis,
    error,
    start,
    stop
  } = usePitchEngine();

  const hubUrl = import.meta.env.DEV ? "http://localhost:5173" : "https://app.voca-nical.com";

  return (
    <div className="min-h-screen bg-voca-bg p-6 flex flex-col items-center justify-center font-sans text-voca-text">
      {/* メインカード */}
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-sm p-8 relative overflow-hidden border border-gray-100">

        <header className="text-center mb-8 mt-4">
          <h1 className="voca-logo text-3xl">VocaScan Tuner V8.2</h1>
          <p className="text-[10px] text-voca-primary font-bold uppercase tracking-[0.2em] mt-2">
            Unwind. Recharge. Sing.
          </p>
        </header>

        {/* ディスプレイエリア */}
        <div className={`relative w-full aspect-square max-w-[400px] mx-auto 
          rounded-[3rem] p-10 text-center mb-8 shadow-inner transition-all duration-500
          ${(isCountingDown || isAnalyzing) ? 'bg-black' : 'bg-voca-surface'}`} 
        >
          {/* 背景兼メイン描画レイヤー */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[3rem]">
            {/* 解析中もカウントダウン扱いにしてメーターを隠す */}
            <FastVisualizer isRunning={isRunning} isCountingDown={isCountingDown || isAnalyzing} />
          </div>

          {/* コンテンツレイヤー */}
          <div className="relative z-10 h-full flex items-center justify-center pointer-events-none">
            
            {/* 解析中の表示 */}
            {isAnalyzing && (
              <div className="flex flex-col items-center animate-in fade-in duration-500">
                <div className="w-12 h-12 border-4 border-voca-primary/30 border-t-voca-primary rounded-full animate-spin mb-4" />
                <p className="text-voca-primary text-xs font-bold tracking-[0.3em] animate-pulse">
                  ANALYZING...
                </p>
              </div>
            )}

            {/* カウントダウン表示 */}
            {!isRunning && isCountingDown && !isAnalyzing && (
              <div className="flex items-center justify-center">
                <motion.span
                  key={countdown} 
                  initial={{ scale: 0.2, opacity: 0 }} 
                  animate={{ scale: 1.2, opacity: 1 }} 
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="text-9xl font-mono font-black text-voca-primary"
                >
                  {countdown === 0 ? "GO!" : countdown}
                </motion.span>
              </div>
            )}
          </div>
        </div>

        {/* 操作ボタン */}
        <div className="space-y-4 relative z-20">
          {!isRunning ? (
            <button
              onClick={start}
              disabled={isCountingDown || isAnalyzing}
              className={`w-full py-5 rounded-full font-bold text-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-3
                ${(isCountingDown || isAnalyzing)
                  ? "bg-voca-text/10 cursor-not-allowed text-voca-text/30"
                  : "bg-voca-primary text-white hover:opacity-90"}`}
            >
              {isCountingDown ? `READY...` : isAnalyzing ? "解析中..." : "測定スタート"}
            </button>
          ) : (
            <button
              onClick={stop}
              disabled={isAnalyzing}
              className={`w-full py-5 rounded-full font-bold text-xl text-white transition-all shadow-md
                ${isAnalyzing ? "bg-gray-300" : "bg-voca-text hover:bg-black active:scale-95"}`}
            >
              {isAnalyzing ? "解析中…" : "測定を終了して解析"}
            </button>
          )}
        </div>

        {/* 診断結果表示 */}
        <div className="mt-8 pt-4">
          {error && <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center text-red-500 font-bold text-sm">{error}</div>}

          {diagnosis && !error && !isAnalyzing && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 text-center">
              <div className="p-6 bg-gradient-to-br from-voca-secondary to-voca-secondary/80 rounded-[2rem] text-white shadow-sm">
                <p className="text-[10px] font-bold opacity-70 tracking-widest uppercase">Score (V8.2)</p>
                <div className="text-6xl font-black tracking-tighter">
                  {/* スコア計算ロジック例 */}
                  {Math.min(100, Math.floor(diagnosis.frames.length / 10))}
                </div>
              </div>
              
              {/* デバッグ用JSON出力（チャッピーへの自慢用！） */}
              <button 
                onClick={() => {
                  const blob = new Blob([JSON.stringify(diagnosis, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `vocascan_result.json`;
                  a.click();
                }}
                className="text-[10px] text-voca-text/30 underline uppercase tracking-widest mt-2 block w-full"
              >
                Download Analysis JSON
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