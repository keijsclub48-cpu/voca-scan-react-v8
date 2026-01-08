import { useState, useCallback, useRef } from 'react';
import { CrepeEngine } from '../audio/CrepeEngine';
import { DetailedPitchData, DiagnosisSession } from '../types';

export const usePitchEngine = () => {
  const [engine] = useState(() => new CrepeEngine());
  
  const [isRunning, setIsRunning] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [currentData, setCurrentData] = useState<DetailedPitchData | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 100点満点のスコア表示用ステート
  const [displayScore, setDisplayScore] = useState<number>(0);

  const framesRef = useRef<DetailedPitchData[]>([]);

  const start = useCallback(async (audioCtx: AudioContext) => {
    if (isCountingDown || isRunning) return;

    setError(null);
    setDiagnosis(null);
    setDisplayScore(0);
    framesRef.current = [];
    setIsCountingDown(true);
    setCountdown(3);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimeout(async () => {
      try {
        await engine.start(audioCtx, (data) => {
          setCurrentData(data);
          framesRef.current.push(data);
        });
        setIsCountingDown(false);
        setIsRunning(true);
      } catch (err) {
        setError("マイクの起動に失敗しました");
        setIsCountingDown(false);
      }
    }, 3000);
  }, [engine, isCountingDown, isRunning]);

  const stop = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      await engine.stop();
      
      // DiagnosisSession 型の全ての必須プロパティを満たすように作成
      const sessionData: DiagnosisSession = {
        session_id: crypto.randomUUID(),
        diagnosis_id: crypto.randomUUID(), // 必須プロパティ
        timestamp: new Date().toISOString(),
        version: "7.0.0",                 // 必須プロパティ
        frames: [...framesRef.current],
        audio_base64: "",                // 必須（現状空文字）
        api_response: null,               // 必須（現状null）
      };

      const score = Math.min(100, Math.floor(framesRef.current.length / 5));
      setDisplayScore(score);

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
    displayScore, // UI表示用のスコア
    currentData,
    pitch: currentData?.f0 || 0,
    note: currentData?.noteName || "",
    confidence: currentData?.conf || 0,
    start,
    stop
  };
};