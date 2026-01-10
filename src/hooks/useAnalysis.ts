import { useState, useCallback, useRef } from 'react';
import { requestAnalysis, fetchAnalysisStatus } from '../apiClient';
import { DiagnosisRequest, AnalysisResult, AnalysisStatus } from '../types/analysis';

const POLLING_INTERVAL = 2000; // 2秒おきに確認
const MAX_RETRIES = 30;        // 最大1分間待つ（2秒 × 30回）

export const useAnalysis = () => {
  const [status, setStatus] = useState<AnalysisStatus | 'idle' | 'waking' | 'cancelled'>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // タイマーと中断用信号の参照を保持
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // クリーンアップ関数（二重実行やアンマウント時のメモリリーク防止）
  const cleanup = () => {
    if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
  };

  /**
   * 解析開始メインロジック
   */
  const startAnalysis = useCallback(async (data: DiagnosisRequest) => {
    cleanup(); // 前回の処理があれば中断
    
    // 初期状態をセット
    setStatus('waking');
    setProgress(10);
    setError(null);
    setResult(null);

    // 今回のリクエスト用の中断コントローラーを作成
    abortControllerRef.current = new AbortController();

    try {
      // 1. FastAPIに解析ジョブを登録 (POST)
      const { job_id } = await requestAnalysis(data);
      
      setStatus('processing');
      setProgress(30);

      let retryCount = 0;

      // 2. ステータスを繰り返し確認するポーリング処理
      const poll = async () => {
        try {
          // apiClient.ts の関数を使用
          const statusRes = await fetchAnalysisStatus(
            job_id, 
            abortControllerRef.current?.signal
          );

          if (statusRes.status === 'completed' && statusRes.result) {
            // 【成功】
            setProgress(100);
            setResult(statusRes.result);
            setStatus('completed');
            return;
          }

          if (statusRes.status === 'failed') {
            // 【サーバー側失敗】
            setError(statusRes.error || '解析サーバー内でエラーが発生しました。');
            setStatus('failed');
            return;
          }

          // 【継続中】
          retryCount++;
          if (retryCount < MAX_RETRIES) {
            // プログレスバーを少しずつ進めて「動いている感」を出す
            setProgress(prev => Math.min(prev + 5, 95));
            pollingTimerRef.current = setTimeout(poll, POLLING_INTERVAL);
          } else {
            setError('解析がタイムアウトしました。録音時間が長すぎる可能性があります。');
            setStatus('failed');
          }

        } catch (err: any) {
          // fetchのsignal.abort()によるエラーは無視する
          if (err.name === 'AbortError') return;
          
          setError('通信エラーが発生しました。インターネット接続を確認してください。');
          setStatus('failed');
        }
      };

      // 最初のポーリングを実行
      poll();

    } catch (err: any) {
      setError(err.message || 'サーバーへの接続に失敗しました。');
      setStatus('failed');
    }
  }, []);

  /**
   * ユーザーによる手動キャンセル
   */
  const cancelAnalysis = useCallback(() => {
    cleanup();
    setStatus('cancelled');
    setProgress(0);
  }, []);

  return {
    startAnalysis,
    cancelAnalysis,
    status,
    progress,
    result,
    error,
    // 便利フラグ：解析中（起動中含む）かどうか
    isAnalyzing: status === 'waking' || status === 'processing'
  };
};