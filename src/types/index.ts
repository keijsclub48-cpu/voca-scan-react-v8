// src/types/index.ts

export interface DetailedPitchData {
  t: number;      // 経過時間(ms)
  f0: number;     // 周波数(Hz)
  noteName: string; // 音名 (C4等)
  cents: number;    // セント偏差 (-50 ~ +50)
  rms: number;      // 音量 (0.0 ~ 1.0)
  conf: number;     // 信頼度 (0.0 ~ 1.0)
}

export interface DiagnosisSession {
  diagnosis_id: string;
  session_id: string;
  version: string;
  timestamp: string;
  frames: DetailedPitchData[];
  audio_base64: string;
  api_response: any; // Python APIからのレスポンス型（既存のDiagnosisResult等）
}