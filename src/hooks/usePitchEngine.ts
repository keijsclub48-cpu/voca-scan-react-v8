import { useState, useCallback, useRef, useEffect } from 'react';
import { CrepeEngine } from '../audio/CrepeEngine';
import { DetailedPitchData, DiagnosisSession } from '../types';

export const engineInstance = new CrepeEngine();

export const usePitchEngine = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentData, setCurrentData] = useState<DetailedPitchData | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const setup = async () => {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        await engineInstance.init(audioCtxRef.current);
        setIsReady(true);
      } catch (err) {
        console.error("Engine Init Error:", err);
        setError("初期化失敗：マイクを許可して再読み込みしてください");
      }
    };
    setup();
  }, []);

  const start = useCallback(async () => {
    if (!isReady || isRunning) return;

    // ★重要: ボタンクリックのコンテキストで AudioContext を再開させる
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }

    setIsCountingDown(true);
    setCountdown(3);
    setError(null);
    setDiagnosis(null);

    const timer = setInterval(() => {
      setCountdown(p => (p <= 1 ? (clearInterval(timer), 0) : p - 1));
    }, 1000);

    setTimeout(async () => {
      try {
        await engineInstance.start(data => setCurrentData(data));
        setIsRunning(true);
        setIsCountingDown(false);
      } catch (e) { 
        console.error(e);
        setError("開始に失敗しました"); 
        setIsCountingDown(false); 
      }
    }, 3000);
  }, [isReady, isRunning]);

  const stop = useCallback(async () => {
    if (!isRunning) return null;
    setIsAnalyzing(true);
    setIsRunning(false);
    try {
      const res = await engineInstance.stop();
      setDiagnosis(res);
      return res;
    } catch (e) { 
      setError("停止失敗"); 
      return null; 
    } finally { 
      setIsAnalyzing(false); 
      setCurrentData(null); 
    }
  }, [isRunning]);

  return { 
    isReady, isRunning, isCountingDown, countdown, isAnalyzing, error, diagnosis, currentData, 
    pitch: currentData?.f0 || 0,
    note: currentData?.noteName || "",
    confidence: currentData?.conf || 0,
    start, stop 
  };
};