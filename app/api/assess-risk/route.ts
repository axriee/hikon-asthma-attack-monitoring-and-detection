import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import hybridFusion, { deriveAudioRiskFromSensor, FusionOutput } from "@/lib/fusion";

// POST: fetch latest sensor data for the active user, run fusion, return JSON
export async function POST(request: NextRequest) {
  try {
    // 1. Find active user
    const { data: activeUsers, error: userError } = await supabase
      .from("users")
      .select("id, first_name, child_age")
      .eq("active", true)
      .limit(1);

    if (userError) {
      console.error("Error fetching active user:", userError);
      return NextResponse.json({ error: "Failed to fetch active user" }, { status: 500 });
    }

    if (!activeUsers || activeUsers.length === 0) {
      return NextResponse.json({ error: "No active user configured" }, { status: 400 });
    }

    const activeUser = activeUsers[0];

    // 2. Get latest sensor_data for active user
    const { data: sensorRows, error: sensorError } = await supabase
      .from("sensor_data")
      .select("*")
      .eq("user_id", activeUser.id)
      .order("recorded_at", { ascending: false })
      .limit(1);

    if (sensorError) {
      console.error("Error fetching latest sensor data:", sensorError);
      return NextResponse.json({ error: "Failed to fetch sensor data" }, { status: 500 });
    }

    if (!sensorRows || sensorRows.length === 0) {
      return NextResponse.json({ error: "No sensor data available for active user" }, { status: 400 });
    }

    const sensor = sensorRows[0] as any;

    // 3. Derive audio risk (assumption: wheeze -> high, cough -> medium)
    const audioRisk = deriveAudioRiskFromSensor(sensor);

    // 4. Pull spo2 and respiration rate
    const spo2 = typeof sensor.spo2 === "number" ? sensor.spo2 : sensor.spo2 ? parseFloat(sensor.spo2) : null;
    const bpm = typeof sensor.respiration_rate === "number" ? sensor.respiration_rate : sensor.respiration_rate ? parseFloat(sensor.respiration_rate) : null;

    // 5. Run fusion
    const result: FusionOutput = hybridFusion(audioRisk, spo2, bpm);

    // 6. Try to persist assessment (best-effort). If table doesn't exist, ignore error.
    try {
      await supabase.from("assessments").insert([
        {
          user_id: activeUser.id,
          final_risk: result.final_risk,
          risk_score: result.risk_score,
          confidence: result.confidence,
          reasoning: result.reasoning,
          individual_risks: result.individual_risks,
          spo2_was_critical: result.spo2_was_critical,
          recorded_at: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      // Non-fatal: table may not exist or permissions missing
      console.warn("Warning: could not persist assessment (table may be missing)", e);
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("Error in /api/assess-risk:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "POST to this endpoint to run fusion on active user's latest sensor data" });
}
