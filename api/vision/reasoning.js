const MODEL = "gemini-3.8-flash";

const schema = {
  type: "object",
  properties: {
    reasoning_status: { type: "string" },
    summary: { type: "string" },
    evidence_interpretation: {
      type: "array",
      items: {
        type: "object",
        properties: {
          evidence: { type: "string" },
          interpretation: { type: "string" },
          impact: { type: "string" }
        },
        required: ["evidence", "interpretation", "impact"]
      }
    },
    confluence: {
      type: "object",
      properties: {
        score: { type: "number" },
        explanation: { type: "string" }
      },
      required: ["score", "explanation"]
    },
    scenarios: {
      type: "array",
      items: {
        type: "object",
        properties: {
          scenario: { type: "string" },
          condition: { type: "string" },
          evidence: { type: "string" },
          status: { type: "string" }
        },
        required: ["scenario", "condition", "evidence", "status"]
      }
    },
    probability: {
      type: "object",
      properties: {
        status: { type: "string" },
        value: { type: "number" },
        explanation: { type: "string" }
      },
      required: ["status", "value", "explanation"]
    },
    invalidation: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: [
    "reasoning_status",
    "summary",
    "evidence_interpretation",
    "confluence",
    "scenarios",
    "probability",
    "invalidation"
  ]
};

function sendJSON(res, status, data) {
  res.status(status).json(data);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJSON(res, 405, {
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return sendJSON(res, 500, {
      error: "GEMINI_API_KEY belum tersedia."
    });
  }

  try {
    const v2 = req.body?.v2;

    if (!v2) {
      return sendJSON(res, 400, {
        error: "Data V2 belum dikirim."
      });
    }

    const instructions = `
Kamu adalah STEPM-IDX V3 AI Reasoning + Mathematical Probability Engine.

Tugas:
Analisis HASIL V2 yang diberikan sebagai evidence package.

ATURAN UTAMA:
1. V2 adalah sumber evidence utama.
2. Jangan membuat data yang tidak ada di V2.
3. Jangan mengarang harga, indikator, timeframe, order book, volume, atau pola.
4. NOT_AVAILABLE tetap NOT_AVAILABLE.
5. UNCERTAIN tetap UNCERTAIN.
6. Evidence VALIDATED boleh digunakan dalam reasoning.
7. Evidence NOT_AVAILABLE tidak boleh dianggap sebagai sinyal positif.
8. Evidence UNCERTAIN tidak boleh dianggap sebagai konfirmasi.
9. Confluence harus dijelaskan berdasarkan evidence yang tersedia.
10. Probability statistik HARUS NOT_AVAILABLE jika tidak ada dataset historis/calibration yang valid.
11. Jangan mengubah confidence visual menjadi probabilitas harga.
12. Buat beberapa skenario berdasarkan evidence yang benar-benar tersedia.
13. Sertakan kondisi yang dapat membatalkan setiap skenario.
14. Jangan menggunakan live market feed, broker feed, OHLCV API, atau sumber eksternal.
15. Fokus pada reasoning berbasis evidence, bukan prediksi pasti.

OUTPUT:
- reasoning_status
- summary
- evidence_interpretation
- confluence
- scenarios
- probability
- invalidation

Jika probability tidak dapat dihitung secara statistik:
probability.status = "NOT_AVAILABLE"
probability.value = 0
`;

    const prompt = `
${instructions}

HASIL V2:
${JSON.stringify(v2, null, 2)}
`;

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent` +
      `?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return sendJSON(res, response.status, {
        error:
          data?.error?.message ||
          `Gemini API error HTTP ${response.status}`
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("") || "";

    if (!text) {
      return sendJSON(res, 502, {
        error: "Gemini tidak mengembalikan hasil reasoning."
      });
    }

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      return sendJSON(res, 502, {
        error: "Gemini mengembalikan JSON yang tidak valid."
      });
    }

    result.meta = {
      version: "STEPM-IDX-V3-REASONING",
      model: MODEL,
      source: "V2_EVIDENCE",
      liveFeed: false
    };

    return sendJSON(res, 200, result);

  } catch (error) {
    return sendJSON(res, 500, {
      error: error?.message || String(error)
    });
  }
}
