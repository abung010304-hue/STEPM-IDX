import OpenAI from "openai";

const MODEL = process.env.OPENAI_VISION_MODEL || "gpt-5.6-luna";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    chart_identity: {
      type: "object",
      additionalProperties: false,
      properties: {
        symbol: { type: "string" },
        timeframes: {
          type: "array",
          items: { type: "string" }
        },
        prices: {
          type: "array",
          items: { type: "string" }
        },
        status: { type: "string" }
      },
      required: ["symbol", "timeframes", "prices", "status"]
    },

    indicators: {
      type: "object",
      additionalProperties: false,
      properties: {
        detected: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              value: { type: "string" },
              timeframe: { type: "string" },
              status: { type: "string" },
              confidence: { type: "integer" },
              evidence: { type: "string" }
            },
            required: [
              "name",
              "value",
              "timeframe",
              "status",
              "confidence",
              "evidence"
            ]
          }
        },
        values: {
          type: "object",
          additionalProperties: {
            type: "string"
          }
        },
        status: { type: "string" }
      },
      required: ["detected", "values", "status"]
    },

    reversal_candles: {
      type: "object",
      additionalProperties: false,
      properties: {
        detected: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              timeframe: { type: "string" },
              status: { type: "string" },
              confidence: { type: "integer" },
              evidence: { type: "string" }
            },
            required: [
              "name",
              "timeframe",
              "status",
              "confidence",
              "evidence"
            ]
          }
        },
        status: { type: "string" }
      },
      required: ["detected", "status"]
    },

    reversal_chart_patterns: {
      type: "object",
      additionalProperties: false,
      properties: {
        detected: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              timeframe: { type: "string" },
              status: { type: "string" },
              confidence: { type: "integer" },
              evidence: { type: "string" }
            },
            required: [
              "name",
              "timeframe",
              "status",
              "confidence",
              "evidence"
            ]
          }
        },
        status: { type: "string" }
      },
      required: ["detected", "status"]
    },

    market_structure: {
      type: "object",
      additionalProperties: false,
      properties: {
        trend: { type: "string" },
        swings: {
          type: "array",
          items: { type: "string" }
        },
        bos: {
          type: "array",
          items: { type: "string" }
        },
        choch: {
          type: "array",
          items: { type: "string" }
        },
        status: { type: "string" }
      },
      required: ["trend", "swings", "bos", "choch", "status"]
    },

    support_resistance: {
      type: "object",
      additionalProperties: false,
      properties: {
        support: {
          type: "array",
          items: { type: "string" }
        },
        resistance: {
          type: "array",
          items: { type: "string" }
        },
        status: { type: "string" }
      },
      required: ["support", "resistance", "status"]
    },

    volume: {
      type: "object",
      additionalProperties: false,
      properties: {
        status: { type: "string" },
        behavior: { type: "string" },
        confirmation: { type: "string" }
      },
      required: ["status", "behavior", "confirmation"]
    },

    order_book: {
      type: "object",
      additionalProperties: false,
      properties: {
        status: { type: "string" },
        bid: {
          type: "array",
          items: { type: "string" }
        },
        offer: {
          type: "array",
          items: { type: "string" }
        },
        notes: { type: "string" }
      },
      required: ["status", "bid", "offer", "notes"]
    },

    multi_timeframe: {
      type: "object",
      additionalProperties: false,
      properties: {
        frames: {
          type: "array",
          items: { type: "string" }
        },
        confluence: { type: "string" },
        conflicts: {
          type: "array",
          items: { type: "string" }
        },
        status: { type: "string" }
      },
      required: ["frames", "confluence", "conflicts", "status"]
    },

    evidence_quality: {
      type: "object",
      additionalProperties: false,
      properties: {
        overall: { type: "string" },
        ambiguous: {
          type: "array",
          items: { type: "string" }
        },
        missing: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["overall", "ambiguous", "missing"]
    }
  },

  required: [
    "chart_identity",
    "indicators",
    "reversal_candles",
    "reversal_chart_patterns",
    "market_structure",
    "support_resistance",
    "volume",
    "order_book",
    "multi_timeframe",
    "evidence_quality"
  ]
};

const instructions = `
Kamu adalah STEPM-IDX V2 Vision Engine.

Analisis 1-10 screenshot TradingView sebagai SATU evidence package.

Baca semua informasi visual yang benar-benar terlihat:

- ticker
- harga
- semua timeframe
- semua indikator
- indikator custom
- nilai indikator
- candlestick reversal
- chart reversal pattern
- market structure
- HH
- HL
- LH
- LL
- BOS
- CHOCH
- trend
- range
- breakout
- breakdown
- retest
- support
- resistance
- volume
- order book
- bid
- offer
- konfirmasi antar-timeframe
- konflik antar-timeframe

ATURAN WAJIB:

1. JANGAN MENEBak.
2. Jika data tidak terlihat atau tidak terbaca, gunakan NOT_AVAILABLE.
3. Jika terlihat tetapi ambigu, gunakan UNCERTAIN.
4. VALIDATED hanya jika bukti visual cukup jelas.
5. Confidence 0-100 adalah confidence keterbacaan visual, BUKAN probabilitas harga.
6. Jangan menggunakan live market.
7. Jangan menggunakan OHLCV API.
8. Jangan menggunakan broker feed.
9. Jangan menggunakan data eksternal.
10. Screenshot adalah sumber bukti utama.
11. Analisis seluruh screenshot sebagai satu paket.
12. Pertahankan sumber foto dan timeframe dalam evidence jika dapat diketahui.
13. Jangan membuat nilai indikator yang tidak terlihat.
14. Jangan membuat harga yang tidak terlihat.
15. Jangan membuat order book yang tidak terlihat.
16. Jangan menyimpan foto pada aplikasi.
`;

function sendJSON(res, status, data) {
  return res.status(status).json(data);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return sendJSON(res, 200, {
      ok: Boolean(process.env.OPENAI_API_KEY),
      model: MODEL,
      photosPersisted: false
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");

    return sendJSON(res, 405, {
      error: "Method Not Allowed"
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return sendJSON(res, 500, {
      error: "OPENAI_API_KEY belum dikonfigurasi di Vercel."
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};

    const images = Array.isArray(body.images)
      ? body.images
      : [];

    if (images.length < 1 || images.length > 10) {
      return sendJSON(res, 400, {
        error: "Kirim 1-10 gambar."
      });
    }

    for (const image of images) {
      if (!image?.dataUrl?.startsWith("data:image/")) {
        return sendJSON(res, 400, {
          error: "Semua input harus berupa data URL gambar."
        });
      }

      if (image.dataUrl.length > 3000000) {
        return sendJSON(res, 413, {
          error: "Satu gambar terlalu besar."
        });
      }
    }

    const client = new OpenAI({
      apiKey
    });

    const content = [
      {
        type: "input_text",
        text:
          instructions +
          `

Jumlah foto: ${images.length}.
Nomor foto harus dipertahankan secara konsisten pada evidence.`
      },

      ...images.map((image) => ({
        type: "input_image",
        image_url: image.dataUrl,
        detail: "high"
      }))
    ];

    const response = await client.responses.create({
      model: MODEL,
      store: false,

      input: [
        {
          role: "user",
          content
        }
      ],

      text: {
        format: {
          type: "json_schema",
          name: "stepm_idx_v2_visual_evidence",
          description:
            "Structured visual evidence for STEPM-IDX V2",
          strict: true,
          schema
        }
      },

      max_output_tokens: 12000
    });

    let result;

    try {
      result = JSON.parse(response.output_text);
    } catch {
      throw new Error(
        "Vision Engine mengembalikan JSON tidak valid."
      );
    }

    result.meta = {
      version: "STEPM-IDX-V2-VISION",
      model: MODEL,
      imageCount: images.length,
      liveFeed: false,
      photosPersistedByApp: false,
      analyzedAt: new Date().toISOString()
    };

    return sendJSON(res, 200, result);

  } catch (error) {
    console.error(error);

    return sendJSON(res, 500, {
      error: error?.message || String(error)
    });
  }
}
