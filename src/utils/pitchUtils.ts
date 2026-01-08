export const FREQUENCY_A4 = 440;
export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/**
 * 周波数から音名、セント偏差を算出
 */
export const getPitchDetails = (frequency: number) => {
  if (!frequency || frequency <= 0) return { noteName: "--", cents: 0 };

  const noteNum = 12 * Math.log2(frequency / FREQUENCY_A4) + 69;
  const roundedNoteNum = Math.round(noteNum);
  const cents = Math.floor((noteNum - roundedNoteNum) * 100);

  const index = ((roundedNoteNum % 12) + 12) % 12;
  const noteName = NOTE_NAMES[index]; // シンプルな参照に戻しました
  const octave = Math.floor(roundedNoteNum / 12) - 1;

  return {
    noteName: `${noteName}${octave}`,
    cents: cents,
  };
};

export const calculateRMS = (dataArray: ArrayLike<number>): number => {
  let sum = 0;
  const len = dataArray.length;
  for (let i = 0; i < len; i++) {
    const val = dataArray[i] ?? 128;
    const amplitude = (val - 128) / 128;
    sum += amplitude * amplitude;
  }
  return Math.sqrt(sum / len);
};