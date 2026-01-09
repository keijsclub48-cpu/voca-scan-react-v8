import { sendAudioToAPI } from "../apiClient";
import { DetailedPitchData, DiagnosisSession } from "../types";
import { getPitchDetails } from "../utils/pitchUtils";
import { v4 as uuidv4 } from "uuid";

export class CrepeEngine {
  private running = false;
  private isPredicting = false;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private detector: any = null;
  private animationId: number | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  private frames: DetailedPitchData[] = [];
  private startTime: number = 0;
  private smooth: number | null = null;

  // --- 外部（FastVisualizer等）から直接覗くためのプロパティ ---
  public currentRMS: number = 0;
  public currentFreq: number = 0;
  public currentNote: string = "-";
  public currentCents: number = 0;
  public currentConf: number = 0;

  async init(ctx: AudioContext): Promise<void> {
    if (this.detector) return;
    this.audioContext = ctx;
    const ml5 = (window as any).ml5;
    if (!ml5) throw new Error("ml5 library is not loaded.");

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.source.connect(this.analyser);

      await new Promise<void>((resolve, reject) => {
        this.detector = ml5.pitchDetection(
          "/model/pitch-detection/crepe/",
          this.audioContext,
          this.stream,
          () => { resolve(); }
        );
        setTimeout(() => reject(new Error("Timeout")), 10000);
      });
    } catch (err) {
      console.error("Init Error:", err);
      throw err;
    }
  }

  async start(onResult: (result: DetailedPitchData) => void): Promise<void> {
    if (!this.detector || !this.stream || !this.audioContext) throw new Error("Not Init");
    if (this.running) return;
    if (this.audioContext.state === 'suspended') await this.audioContext.resume();

    this.frames = [];
    this.audioChunks = [];
    this.startTime = performance.now();
    this.smooth = null;
    this.currentFreq = 0;
    this.currentNote = "-";
    this.currentConf = 0;

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: "audio/webm" });
    this.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) this.audioChunks.push(e.data); };
    this.mediaRecorder.start(1000);

    this.running = true;
    this.isPredicting = false;
    this.loop(onResult);
  }

  private loop(callback: (result: DetailedPitchData) => void): void {
    const { running, analyser, dataArray, detector } = this;
    // 1. 全ての依存オブジェクトが存在するか一括チェック
    if (!running || !analyser || !dataArray || !detector) return;

    // 2. 波形データの取得 (anyキャストで型エラー回避)
    analyser.getByteTimeDomainData(dataArray as any);

    // 3. RMS (音量) 計算
    let sumSquared = 0;
    const len = dataArray.length;
    for (let i = 0; i < len; i++) {
      // 以前からエラーが出ていた箇所を、確実に number として扱うよう修正
      const rawValue = dataArray[i];
      if (typeof rawValue === 'number') {
        const val = (rawValue - 128) / 128;
        sumSquared += val * val;
      }
    }
    this.currentRMS = Math.sqrt(sumSquared / (len || 1));

    // 推論の実行 (音量 0.01 以上のとき)
    if (this.currentRMS > 0.01 && !this.isPredicting) {
      this.isPredicting = true;
      
      // detector をローカル定数として扱うことで undefined 警告を回避
      const d = detector;
      d.getPitch((err: any, freq: number) => {
        this.isPredicting = false;

        if (this.running && freq && !err) {
          const analyzed = this.analyze(freq, this.currentRMS);
          this.currentFreq = freq;
          this.currentNote = analyzed.noteName;
          this.currentCents = analyzed.cents;
          this.currentConf = analyzed.conf; 
          
          this.frames.push(analyzed);
          callback(analyzed);
        } else {
          // 不安定な時は徐々に下げる
          this.currentConf *= 0.5;
        }
      });
    } else {
      this.currentConf = 0;
    }

    this.animationId = requestAnimationFrame(() => this.loop(callback));
  }

  private analyze(rawFreq: number, rms: number): DetailedPitchData {
    if (!this.smooth) this.smooth = rawFreq;
    this.smooth = this.smooth * 0.7 + rawFreq * 0.3; 

    const { noteName, cents } = getPitchDetails(this.smooth);

    // Confidence の計算 (0.7〜1.0 の間で揺れる)
    const baseConf = Math.min(0.98, 0.7 + (rms * 5));
    const finalConf = baseConf + (Math.random() * 0.02);

    return {
      t: performance.now() - this.startTime,
      f0: this.smooth,
      noteName,
      cents,
      rms,
      conf: finalConf 
    };
  }

  async stop(): Promise<DiagnosisSession> {
    this.running = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) return reject(new Error("No recorder"));
      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.audioChunks, { type: "audio/webm" });
          const base64 = await this.blobToBase64(blob);
          const result = await sendAudioToAPI(base64);
          resolve({
            diagnosis_id: `diag_${uuidv4()}`,
            session_id: `sess_${uuidv4()}`,
            version: "8.2.0-stable",
            timestamp: new Date().toISOString(),
            frames: [...this.frames],
            audio_base64: base64,
            api_response: result
          });
        } catch (e) { reject(e); }
      };
      this.mediaRecorder.stop();
    });
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? "");
      };
      reader.readAsDataURL(blob);
    });
  }
}