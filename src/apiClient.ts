// src/api/apiClient.ts
import { DiagnosisRequest, StatusResponse } from "./types/analysis";
import { DiagnosisResult } from "./types/pitch";

const API_BASE = import.meta.env.VITE_API_BASE;
const API_KEY = import.meta.env.VITE_API_KEY;

const getHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${API_KEY}`,
});

/**
 * [V8] 解析リクエストを開始 (POST)
 * 422エラーを防ぐため、ここでフィールド名を confidence に統一します
 */
export async function requestAnalysis(data: DiagnosisRequest): Promise<{ job_id: string }> {
  // --- 最終バリデーション & 変換 ---
  const sanitizedData = {
    ...data,
    frames: data.frames.map((f: any) => ({
      t: f.t,
      f0: f.f0,
      // conf か confidence のある方を採用
      confidence: f.confidence ?? f.conf ?? 0 
    }))
  };

  const res = await fetch(`${API_BASE}/api/v1/analyze`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(sanitizedData), // 変換後のデータを送る
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Analyze Request Error: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * [V8] ステータスを確認 (GET)
 */
export async function fetchAnalysisStatus(jobId: string, signal?: AbortSignal): Promise<StatusResponse> {
  const res = await fetch(`${API_BASE}/api/v1/status/${jobId}`, {
    method: "GET",
    headers: getHeaders(),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Status Check Error: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * [V8] サーバーの死活確認
 */
export async function pingServer(): Promise<void> {
  try {
    await fetch(`${API_BASE}/health`, { method: "GET" });
  } catch (e) {
    console.warn("Ping failed, but it's okay.");
  }
}

/**
 * 既存の同期型API
 */
export async function sendAudioToAPI(base64Audio: string): Promise<DiagnosisResult> {
  const res = await fetch(`${API_BASE}/api/score`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ audio: base64Audio }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error: ${res.status} ${text}`);
  }
  return res.json();
}