const MODEL = "gemini-3.6-flash";

const MAX_RETRIES = 0;
const RETRY_DELAYS = [2000, 4000, 8000, 16000];

const RETRYABLE_STATUS_CODES = new Set([
  408,
  429,
  500,
  502,
  503,
  504
]);


const schema = {
  type: "object",

  properties: {
    chart_identity: {
      type: "object",
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
      required: [
        "symbol",
        "timeframes",
        "prices",
        "status"
      ]
    },

    indicators: {
      type: "object",
      properties: {
        detected: {
          type: "array",
          items: {
            type: "object",
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
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              value: { type: "string" },
              timeframe: { type: "string" },
              status: { type: "string" }
            },
            required: [
              "name",
              "value",
              "timeframe",
              "status"
            ]
          }
        },

        status: { type: "string" }
      },
      required: [
        "detected",
        "values",
        "status"
      ]
    },

    reversal_candles: {
      type: "object",
      properties: {
        detected: {
          type: "array",
          items: {
            type: "object",
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
      required: [
        "detected",
        "status"
      ]
    },

    reversal_chart_patterns: {
      type: "object",
      properties: {
        detected: {
          type: "array",
          items: {
            type: "object",
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
      required: [
        "detected",
        "status"
      ]
    },

    market_structure: {
      type: "object",
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
      required: [
        "trend",
        "swings",
        "bos",
        "choch",
        "status"
      ]
    },

    support_resistance: {
      type: "object",
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
      required: [
        "support",
        "resistance",
        "status"
      ]
    },

    volume: {
      type: "object",
      properties: {
        status: { type: "string" },
        behavior: { type: "string" },
        confirmation: { type: "string" }
      },
      required: [
        "status",
        "behavior",
        "confirmation"
      ]
    },

    order_book: {
      type: "object",
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
      required: [
        "status",
        "bid",
        "offer",
        "notes"
      ]
    },

    multi_timeframe: {
      type: "object",
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
      required: [
        "frames",
        "confluence",
        "conflicts",
        "status"
      ]
    },

    evidence_quality: {
      type: "object",
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
      required: [
        "overall",
        "ambiguous",
        "missing"
      ]
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

Screenshot adalah sumber bukti utama.

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

Jika nilai indikator tidak terlihat:
value = NOT_AVAILABLE

Jika nama indikator tidak dapat dibaca:
name = NOT_AVAILABLE

Jika timeframe tidak dapat diketahui:
timeframe = NOT_AVAILABLE
`;


function sendJSON(res, status, data) {
  return res.status(status).json(data);
}


function parseDataUrl(dataUrl) {
  const match = dataUrl.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
  );

  if (!match) {
    throw new Error("Format data URL gambar tidak valid.");
  }

  return {
    mimeType: match[1],
    data: match[2]
  };
}


/*
 * Gemini temporary-error retry.
 *
 * Percobaan:
 * 1. langsung
 * 2. tunggu 2 detik
 * 3. tunggu 4 detik
 * 4. tunggu 8 detik
 * 5. tunggu 16 detik
 *
 * Tidak melakukan retry untuk error permanen
 * seperti API key salah atau request/schema invalid.
 */
async function fetchGeminiWithRetry(url, options) {

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {

    try {

      const response = await fetch(url, options);

      if (
        response.ok ||
        !RETRYABLE_STATUS_CODES.has(response.status) ||
        attempt === MAX_RETRIES
      ) {
        return response;
      }

      const delay = RETRY_DELAYS[attempt] || 16000;

      console.warn(
        `Gemini temporary error ${response.status}. ` +
        `Retry ${attempt + 1}/${MAX_RETRIES} ` +
        `after ${delay}ms.`
      );

      await new Promise(resolve =>
        setTimeout(resolve, delay)
      );

    } catch (error) {

      lastError = error;

      if (attempt === MAX_RETRIES) {
        throw error;
      }

      const delay = RETRY_DELAYS[attempt] || 16000;

      console.warn(
        `Gemini network error. ` +
        `Retry ${attempt + 1}/${MAX_RETRIES} ` +
        `after ${delay}ms.`,
        error
      );

      await new Promise(resolve =>
        setTimeout(resolve, delay)
      );
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("Gemini request gagal setelah retry.");
}


export default async function handler(req, res) {

  if (req.method === "GET") {

    return sendJSON(res, 200, {
      ok: Boolean(process.env.GEMINI_API_KEY),
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


  const apiKey = process.env.GEMINI_API_KEY;


  if (!apiKey) {

    return sendJSON(res, 500, {
      error: "GEMINI_API_KEY belum dikonfigurasi di Vercel."
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


    const parts = [

      {
        text:
          instructions +
          `

Jumlah foto: ${images.length}.
Nomor foto harus dipertahankan secara konsisten pada evidence.`
      }

    ];


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


      const parsed = parseDataUrl(image.dataUrl);


      parts.push({

        inline_data: {
          mime_type: parsed.mimeType,
          data: parsed.data
        }

      });

    }


    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;


    const requestOptions = {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({

        contents: [
          {
            role: "user",
            parts
          }
        ],

        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0
        }

      })

    };


    /*
     * Gunakan retry wrapper.
     * Ini menggantikan fetch(url, requestOptions)
     * langsung yang sebelumnya.
     */
    const response = await fetchGeminiWithRetry(
      url,
      requestOptions
    );


    const data = await response.json();


    if (!response.ok) {

      console.error("Gemini API error:", data);

      throw new Error(
        data?.error?.message ||
        `Gemini API gagal memproses gambar. HTTP ${response.status}`
      );

    }


    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") || "";


    if (!text) {

      throw new Error(
        "Gemini tidak mengembalikan hasil analisis."
      );

    }


    let result;


    try {

      result = JSON.parse(text);

    } catch {

      throw new Error(
        "Gemini mengembalikan JSON yang tidak valid."
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

    console.error("STEPM-IDX Vision Engine error:", error);

    return sendJSON(res, 500, {
      error: error?.message || String(error)
    });

  }

}
