import { sendAudioToAPI } from "../apiClient";
import { DetailedPitchData, DiagnosisSession } from "../types"; // index.tsからインポート想定
import { getPitchDetails, calculateRMS } from "../utils/pitchUtils";
import { v4 as uuidv4 } from "uuid";

export class CrepeEngine {
  private running = false;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null; // V7追加
  private dataArray: Uint8Array | null = null; // V7追加
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private detector: any = null;

  // 診断データ蓄積用
  private frames: DetailedPitchData[] = [];
  private startTime: number = 0;

  // スムージング用
  private prevPitch: number | null = null;
  private smooth: number | null = null;

  async start(ctx: AudioContext, onResult: (result: DetailedPitchData) => void): Promise<void> {
    if (this.running) return;

    this.audioContext = ctx;
    const ml5 = (window as any).ml5;
    if (!ml5) throw new Error("ml5 not loaded");

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.source = this.audioContext.createMediaStreamSource(this.stream);

      // AnalyserNodeの設定（音量ビジュアライザー用）
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.source.connect(this.analyser);

      // モデルのロード待機
      await new Promise<void>((resolve, reject) => {
        this.detector = ml5.pitchDetection(
          "/model/pitch-detection/crepe/",
          this.audioContext,
          this.stream,
          () => {
            console.log("CREPE model V7 loaded");
            resolve();
          }
        );
        setTimeout(() => reject(new Error("Model load timeout")), 10000);
      });

      // 録音準備
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: "audio/webm" });
      this.mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      // 計測・蓄積の初期化
      this.frames = [];
      this.startTime = performance.now();
      this.mediaRecorder.start(1000);
      this.running = true;

      this.loop(onResult);
    } catch (err) {
      this.cleanup();
      throw err;
    }
  }

  private loop(callback: (result: DetailedPitchData) => void): void {
    if (!this.running || !this.detector || !this.analyser || !this.dataArray) return;

    this.detector.getPitch((err: any, freq: number) => {
      if (this.running) {
        // 音量(RMS)の取得
        (this.analyser as any).getByteTimeDomainData(this.dataArray!);
        const rms = calculateRMS(this.dataArray!);
        if (!err && freq) {
          const analyzed = this.analyze(freq, rms);
          if (analyzed) {
            this.frames.push(analyzed); // 診断データの蓄積
            callback(analyzed);
          }
        } else {
          // 無音・解析不能時も時間軸を維持するため、0データを入れる場合はここで処理
        }
        requestAnimationFrame(() => this.loop(callback));
      }
    });
  }

  /**
   * 停止時に「診断データ」と「音声」をパッケージングして返す
   */
  async stop(): Promise<DiagnosisSession> {
    const wasRunning = this.running;
    this.running = false;

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !wasRunning) {
        this.cleanup();
        return reject(new Error("No active session"));
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.audioChunks, { type: "audio/webm" });
          const base64 = await this.blobToBase64(blob);

          // APIへは音声のみ送り、フロントでは全データをパッケージング
          // (将来的にHubへこのまま送信する想定)
          const result = await sendAudioToAPI(base64);

          const session: DiagnosisSession = {
            diagnosis_id: `diag_${uuidv4()}`,
            session_id: `sess_${uuidv4()}`, // 本来は上位コンテキストから取得
            version: "7.0.0",
            timestamp: new Date().toISOString(),
            frames: this.frames,
            audio_base64: base64,
            api_response: result // Python APIからの初期診断結果
          };

          resolve(session);
        } catch (e) {
          reject(e);
        } finally {
          this.cleanup();
        }
      };
      this.mediaRecorder.stop();
    });
  }

  private cleanup(): void {
    this.running = false;
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.resetAnalyzer();
  }

  private analyze(rawFreq: number, rms: number): DetailedPitchData | null {
    if (!rawFreq) return null;

    // スムージング処理
    if (!this.smooth) this.smooth = rawFreq;
    this.smooth = this.smooth * 0.85 + rawFreq * 0.15;
    const s = this.smooth;

    // 信頼度計算
    let confidence = 1;
    if (this.prevPitch) {
      confidence = Math.max(0, 1 - Math.abs(s - this.prevPitch) / this.prevPitch * 5);
    }
    this.prevPitch = s;

    // V7: 音名とセント偏差の算出
    const { noteName, cents } = getPitchDetails(s);

    return {
      t: performance.now() - this.startTime,
      f0: s,
      noteName: noteName,
      cents: cents,
      rms: rms,
      conf: Math.min(1, 0.3 + confidence * 0.7)
    };
  }

  private resetAnalyzer(): void {
    this.prevPitch = null;
    this.smooth = null;
    this.frames = [];
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (!result) {
          reject(new Error("Base64 conversion failed"));
          return;
        }
        const base64 = result.split(",")[1];
        resolve(base64 || ""); // undefined を防ぐ
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}