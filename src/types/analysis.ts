import { DetailedPitchData } from './index';

/**
 * バックエンド (FastAPI) が POST /api/v1/analyze で受け取る型
 */
export interface DiagnosisRequest {
  session_id: string;
  frame_rate: number;
  // CrepeEngineのDetailedPitchDataをAPI用に変換するための型
  frames: PitchFrameForAPI[];
}

/**
 * API送信用の軽量なフレーム定義
 */
export interface PitchFrameForAPI {
  t: number;   // 秒単位 (s)
  f0: number;
  confidence: number;
}

/**
 * APIから返ってくる最終的な解析結果
 * (既存のDiagnosisResultを拡張・整理したもの)
 */
export interface AnalysisResult {
  statistics: {
    mean_f0: number;
    range_f0: number;
    stability_score: number;
  };
  score: number;
  comments: string[];
  message?: string;
}

/**
 * ステータス確認 (GET) のレスポンス型
 */
export type AnalysisStatus = 'accepted' | 'processing' | 'completed' | 'failed';

export interface StatusResponse {
  job_id: string;
  status: AnalysisStatus;
  result?: AnalysisResult; // completed の時のみ存在
  error?: string;          // failed の時のみ存在
}