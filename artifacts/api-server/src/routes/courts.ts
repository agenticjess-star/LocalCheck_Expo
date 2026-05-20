import { Router } from "express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import { courtsTable } from "@workspace/db/schema";
import { and, between, desc, eq, gte } from "drizzle-orm";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

/**
 * GET /api/courts
 * Returns courts for a given map viewport, filtered by zoom level.
 * Zoom-level logic mirrors Google Maps:
 *  - Low zoom (country/state view) → only high-popularity courts
 *  - High zoom (street view) → all courts in bounds
 */
router.get("/courts", async (req, res) => {
  try {
    const {
      minLat,
      maxLat,
      minLng,
      maxLng,
      zoom,
      localCourtId,
    } = req.query as Record<string, string>;

    const z = Math.round(parseFloat(zoom ?? "12"));

    // How many courts to return and minimum popularity required, based on zoom
    let limit: number;
    let minPopularity: number;

    if (z <= 4) {
      limit = 25;
      minPopularity = 88;
    } else if (z <= 6) {
      limit = 60;
      minPopularity = 75;
    } else if (z <= 8) {
      limit = 120;
      minPopularity = 58;
    } else if (z <= 10) {
      limit = 300;
      minPopularity = 35;
    } else if (z <= 12) {
      limit = 600;
      minPopularity = 15;
    } else if (z <= 14) {
      limit = 1000;
      minPopularity = 0;
    } else {
      limit = 2000;
      minPopularity = 0;
    }

    const conditions = [];

    if (minLat && maxLat) {
      conditions.push(between(courtsTable.latitude, parseFloat(minLat), parseFloat(maxLat)));
    }
    if (minLng && maxLng) {
      // Handle antimeridian wrap
      const mnLng = parseFloat(minLng);
      const mxLng = parseFloat(maxLng);
      if (mnLng <= mxLng) {
        conditions.push(between(courtsTable.longitude, mnLng, mxLng));
      }
    }
    if (minPopularity > 0) {
      conditions.push(gte(courtsTable.popularity, minPopularity));
    }

    const courts = await db
      .select()
      .from(courtsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(courtsTable.popularity))
      .limit(limit);

    // Always include the user's local court regardless of popularity/zoom
    let finalCourts = courts;
    if (localCourtId && !courts.some((c) => c.id === localCourtId)) {
      const [localCourt] = await db
        .select()
        .from(courtsTable)
        .where(eq(courtsTable.id, localCourtId))
        .limit(1);
      if (localCourt) {
        finalCourts = [localCourt, ...courts];
      }
    }

    res.json({ courts: finalCourts, total: finalCourts.length });
  } catch (err) {
    console.error("Courts list error:", err);
    res.status(500).json({ error: "Failed to fetch courts" });
  }
});

/**
 * GET /api/courts/:id
 */
router.get("/courts/:id", async (req, res) => {
  try {
    const [court] = await db
      .select()
      .from(courtsTable)
      .where(eq(courtsTable.id, req.params.id))
      .limit(1);
    if (!court) {
      res.status(404).json({ error: "Court not found" });
      return;
    }
    res.json(court);
  } catch (err) {
    console.error("Court fetch error:", err);
    res.status(500).json({ error: "Failed to fetch court" });
  }
});

/**
 * POST /api/courts/verify
 * AI court photo verification using GPT-4o Vision
 */
router.post("/courts/verify", async (req, res) => {
  try {
    const { imageBase64, sport } = req.body as { imageBase64: string; sport: string };

    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64 is required" });
      return;
    }

    const sportLabel = sport ?? "sports";

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "low",
              },
            },
            {
              type: "text",
              text: `You are a quality control AI for a community sports court map app. Analyze this image and determine if it shows a real, publicly accessible outdoor or indoor ${sportLabel} court (e.g. basketball court, tennis court, pickleball court, soccer field, volleyball court, or any similar sports court).

Respond with ONLY valid JSON in this exact format:
{
  "verified": true or false,
  "confidence": a number from 0 to 100,
  "reason": "one short sentence explaining your decision"
}

Be strict: reject selfies, street scenes, indoor gyms, private facilities, or anything that is not a recognizable sports court accessible to the public. Verify if the court is real and visible in the image.`,
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim() ?? "";

    let result: { verified: boolean; confidence: number; reason: string };
    try {
      result = JSON.parse(content);
    } catch {
      result = {
        verified: false,
        confidence: 0,
        reason: "Could not analyze the image. Please try again with a clearer photo.",
      };
    }

    res.json(result);
  } catch (err) {
    console.error("Court verification error:", err);
    res.status(500).json({
      verified: false,
      confidence: 0,
      reason: "Verification service unavailable. Please try again.",
    });
  }
});

export default router;
