// types/index.ts (V8.2 最終版)
export interface DetailedPitchData {
  t: number;      // 相対時間(ms)
  f0: number;     // 周波数
  noteName: string; // 判定音名
  cents: number;  // ズレ
  rms: number;    // 音量
  conf: number;   // 信頼度
}

export interface DiagnosisSession {
  diagnosis_id: string; // 一意の計測ID
  session_id: string;   // ユーザーセッションID
  version: string;      // Engine Version (e.g., "8.2.0")
  timestamp: string;    // 計測日時
  sampling_rate: number; // 44100等
  frames: DetailedPitchData[]; // JSONB保存対象
  audio_base64?: string; // S3等への保存用
  api_response?: any;    // Python APIからの返却値
}