import { useState, useEffect, useCallback } from 'react';
import { engineInstance } from '../audio/CrepeEngine';
import { DiagnosisSession } from '../types';

export const usePitchEngine = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [diagnosis, setDiagnosis] = useState<DiagnosisSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ★ 自動復旧ロジック
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        await engineInstance.resumeContext();
      }
    };
    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setIsCountingDown(true);
    setCountdown(3);
    // カウントダウン中にサーバーを叩いて起こしておく (スリープ対策)
    fetch(`${import.meta.env.VITE_API_BASE}/health`).catch(() => { });

    setError(null);
    setIsCountingDown(true);
    
    // ★ カウントダウンが始まった瞬間に、裏でマイクとモデルを準備(Warm-up)
    // これにより GO! の時のラグが消える
    engineInstance.start();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsCountingDown(false);
          setIsRunning(true);
          engineInstance.start();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stop = useCallback(async () => {
    setIsRunning(false);
    setIsAnalyzing(true);
    try {
      const result = await engineInstance.stop();
      setDiagnosis(result);
    } catch (err) {
      setError("測定データの取得に失敗しました。");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    isRunning,
    isCountingDown,
    isAnalyzing,
    countdown,
    diagnosis,
    error,
    start,
    stop
  };
};