import { useState, useCallback } from 'react';
import { CrepeEngine } from '../audio/CrepeEngine';
import { DetailedPitchData, DiagnosisSession } from '../types';

export const usePitchEngine = () => {
  const [engine] = useState(() => new CrepeEngine());
  
  // VocaScanTunerが求めているプロパティ名でステートを管理
  const [isRunning, setIsRunning] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [currentData, setCurrentData] = useState<DetailedPitchData | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 3, 2, 1... のカウントダウン付き開始関数
  const start = useCallback(async (audioCtx: AudioContext) => {
    if (isCountingDown || isRunning) return;

    setError(null);
    setDiagnosis(null);
    setIsCountingDown(true);
    setCountdown(3);

    // 1秒ごとにカウントダウン
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 3秒後に録音開始
    setTimeout(async () => {
      try {
        await engine.start(audioCtx, (data) => {
          setCurrentData(data);
        });
        setIsCountingDown(false);
        setIsRunning(true);
      } catch (err) {
        console.error(err);
        setError("マイクの起動に失敗しました");
        setIsCountingDown(false);
      }
    }, 3000);
  }, [engine, isCountingDown, isRunning]);

  const stop = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const sessionData = await engine.stop();
      setIsRunning(false);
      setCurrentData(null);
      setDiagnosis(sessionData);
      setIsAnalyzing(false);
      return sessionData;
    } catch (err) {
      setError("解析中にエラーが発生しました");
      setIsRunning(false);
      setIsAnalyzing(false);
      return null;
    }
  }, [engine]);

  return {
    isRunning,
    isCountingDown,
    countdown,
    isAnalyzing,
    error,
    diagnosis,
    currentData,
    // 互換性のための簡易アクセス用
    pitch: currentData?.f0 || 0,
    note: currentData?.noteName || "",
    confidence: currentData?.conf || 0,
    start,
    stop
  };
};