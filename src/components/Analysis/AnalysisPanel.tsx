import React from 'react';
import { useAnalysis } from '../../hooks/useAnalysis';

interface AnalysisPanelProps {
  sessionData: any; 
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ sessionData }) => {
  const { startAnalysis, status, progress, result, error } = useAnalysis();

  const isIdle = status === 'idle';
  const isRunning = status === 'waking' || status === 'processing';
  const isFinished = status === 'completed' && result;

  // 安全に数値を取得するためのヘルパー
  const meanF0 = result?.statistics?.mean_f0 ?? (result as any)?.summary?.mean_f0 ?? 0;
  const stability = result?.statistics?.stability_score ?? (result as any)?.summary?.stability ?? 0;

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">精密診断レポート</h2>
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
          isFinished ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {status}
        </span>
      </div>

      {/* --- 初期状態 --- */}
      {isIdle && (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-6">録音が完了しました。サーバーで精密な歌唱解析を行いますか？</p>
          <button
            onClick={() => startAnalysis(sessionData)}
            className="px-8 py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
          >
            精密解析を実行する
          </button>
        </div>
      )}

      {/* --- 解析中 --- */}
      {isRunning && (
        <div className="py-10 text-center">
          <div className="mb-4 text-indigo-600 font-medium">
            {status === 'waking' ? '☁️ サーバーを起動しています...' : '🔍 歌唱データを解析中...'}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-indigo-500 h-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">{progress}% 完了</p>
        </div>
      )}

      {/* --- エラー表示 --- */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 mb-6">
          <p className="font-bold">解析エラー</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 text-xs underline"
          >
            再試行する
          </button>
        </div>
      )}

      {/* --- 解析完了 --- */}
      {isFinished && (
        <div className="space-y-6 animate-in fade-in duration-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50 p-4 rounded-lg text-center">
              <span className="text-sm text-indigo-600 font-bold">総合スコア</span>
              <div className="text-4xl font-black text-indigo-900">{result.score ?? 0}</div>
            </div>
            <div className="bg-emerald-50 p-4 rounded-lg text-center">
              <span className="text-sm text-emerald-600 font-bold">平均周波数</span>
              <div className="text-2xl font-bold text-emerald-900">
                {meanF0.toFixed(1)} <span className="text-sm">Hz</span>
              </div>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg text-center">
              <span className="text-sm text-amber-600 font-bold">安定性</span>
              <div className="text-2xl font-bold text-amber-900">
                {(stability * 100).toFixed(0)} <span className="text-sm">%</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center">
              <span className="mr-2">💡</span> AIアドバイス
            </h3>
            <ul className="space-y-2">
              {(result.comments || []).map((comment: string, i: number) => (
                <li key={i} className="flex items-start text-sm text-gray-700">
                  <span className="text-indigo-500 mr-2">•</span>
                  {comment}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};