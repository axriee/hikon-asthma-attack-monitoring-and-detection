// Port of Fusion Logic (originally Python) into TypeScript for Next.js server
export type FusionOutput = {
  final_risk: "SAFE" | "MEDIUM" | "HIGH";
  risk_score: number;
  confidence: number; // 0.5 - 1.0
  reasoning: string;
  individual_risks: { audio: number; spo2: number; breathing: number };
  spo2_was_critical: boolean;
};

// Configuration (kept close to the Python original)
const SENSOR_WEIGHTS = { audio: 1.0, spo2: 2.5, breathing: 1.5 };
const TOTAL_WEIGHT = SENSOR_WEIGHTS.audio + SENSOR_WEIGHTS.spo2 + SENSOR_WEIGHTS.breathing;
const RISK_THRESHOLDS = { safe_max: 0.67, medium_max: 1.33, high_min: 1.33 };
const SPO2_THRESHOLDS = { high_max: 92, safe_min: 95 };
const BREATHING_THRESHOLDS_3_TO_7_YRS = { safe_max: 34, medium_max: 40 };

export function classifySpO2(spo2Value: number | null): number {
  if (spo2Value === null || Number.isNaN(spo2Value)) return 1; // unknown -> medium
  if (spo2Value <= SPO2_THRESHOLDS.high_max) return 2; // high risk
  if (spo2Value < SPO2_THRESHOLDS.safe_min) return 1; // medium
  return 0; // safe
}

export function classifyBreathingRate(bpm: number | null): number {
  if (bpm === null || Number.isNaN(bpm)) return 1; // unknown -> medium
  if (bpm > BREATHING_THRESHOLDS_3_TO_7_YRS.medium_max) return 2;
  if (bpm > BREATHING_THRESHOLDS_3_TO_7_YRS.safe_max) return 1;
  return 0;
}

// Simple helper: derive an audio-based risk from sensor fields.
// Assumption: wheeze_detected has highest priority, cough_detected less so.
// If you already compute an audio_risk upstream, pass it directly to hybridFusion.
export function deriveAudioRiskFromSensor(sensor: any): number {
  try {
    if (!sensor) return 0;
    // If wheeze detected, treat as high risk (2)
    if (sensor.wheeze_detected) return 2;
    // If cough detected, treat as medium risk (1)
    if (sensor.cough_detected) return 1;
    return 0;
  } catch (e) {
    return 1; // fallback
  }
}

function stddev(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export function hybridFusion(
  audioRisk: number | null,
  spo2Value: number | null,
  bpm: number | null
): FusionOutput {
  const spo2Risk = classifySpO2(spo2Value);
  const breathingRisk = classifyBreathingRate(bpm);
  const individual_risks = {
    audio: audioRisk === null || Number.isNaN(audioRisk) ? 1 : audioRisk,
    spo2: spo2Risk,
    breathing: breathingRisk,
  };

  // Safety guardrail: critical SpO2 overrides everything
  if (spo2Risk === 2) {
    return {
      final_risk: "HIGH",
      risk_score: 2.0,
      confidence: 0.95,
      reasoning: "CRITICAL OVERRIDE: SpO2 at or below threshold triggered safety guardrail.",
      individual_risks,
      spo2_was_critical: true,
    };
  }

  const weighted_sum =
    SENSOR_WEIGHTS.audio * individual_risks.audio +
    SENSOR_WEIGHTS.spo2 * individual_risks.spo2 +
    SENSOR_WEIGHTS.breathing * individual_risks.breathing;

  const risk_score = weighted_sum / TOTAL_WEIGHT;

  let final_risk: FusionOutput["final_risk"];
  if (risk_score >= RISK_THRESHOLDS.high_min) final_risk = "HIGH";
  else if (risk_score > RISK_THRESHOLDS.safe_max) final_risk = "MEDIUM";
  else final_risk = "SAFE";

  const std = stddev(Object.values(individual_risks));
  const confidence = Math.max(0.5, 1.0 - std * 0.5);

  const reasoning = `Weighted fusion score of ${risk_score.toFixed(2)} resulted in a ${final_risk} risk assessment.`;

  return {
    final_risk,
    risk_score,
    confidence,
    reasoning,
    individual_risks,
    spo2_was_critical: false,
  };
}

export default hybridFusion;
