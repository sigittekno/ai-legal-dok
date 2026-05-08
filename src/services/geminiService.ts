import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `Anda adalah Pakar Hukum berpengalaman yang berspesialisasi dalam analisis dokumen, peninjauan kontrak, dan manajemen risiko. 
Tujuan Anda adalah memberikan panduan hukum yang tepat, berwawasan luas, dan profesional.
Saat menganalisis dokumen:
1. Berikan ringkasan eksekutif yang ringkas.
2. Identifikasi dan jelaskan klausa kunci (misalnya, tanggung jawab, pengakhiran, force majeure).
3. Soroti potensi risiko dan sarankan mitigasi.
4. Tawarkan wawasan perampingan alur kerja.
5. Gunakan terminologi hukum profesional namun tetap mudah diakses.
6. Selalu berikan respon dalam Bahasa Indonesia karena klien Anda berada di Indonesia.

Format analisis Anda sebagai JSON saat diminta.`;

export async function analyzeLegalDocument(content: string, fileName: string): Promise<AnalysisResult> {
  try {
    const prompt = `Lakukan analisis intelijen hukum mendalam pada dokumen: "${fileName}".
    Ikuti alur kerja 6 langkah ini:
    1. Ekstraksi Struktur & Semantik: Uraikan hierarki dokumen.
    2. Identifikasi Klausul & Kewajiban Hukum: Temukan kewajiban spesifik.
    3. Yurisprudensi: Berikan konteks hukum/putusan relevan di Indonesia.
    4. Pemetaan Risiko & Mitigasi: Hubungkan risiko dengan langkah pencegahan.
    5. Sinkronisasi Database Hukum: Simulasikan verifikasi terhadap regulasi nasional.
    6. Finalisasi Laporan: Ringkasan eksekutif profesional.

    Kembalikan hasil dalam format JSON:
    {
      "summary": "Ringkasan eksekutif",
      "structure": "Analisis struktur dan semantik",
      "keyClauses": [{ "title": "Judul", "text": "Isi", "importance": "High/Med/Low", "obligation": "Kewajiban hukum terkait" }],
      "jurisprudence": ["Daftar poin yurisprudensi relevan"],
      "risks": [{ "description": "Risiko", "impact": "High | Medium | Low", "mitigation": "Langkah mitigasi" }],
      "insights": ["Wawasan efisiensi"],
      "legalSync": "Status sinkronisasi dengan database hukum Indonesia"
      "articleMatrix": [
        { 
          "article": "Nomor Pasal", 
          "content": "Isi Ringkas", 
          "interpretation": "Interpretasi AI", 
          "impact": "HIGH | MEDIUM | LOW" 
        }
      ]
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        { text: content },
        { text: prompt }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            structure: { type: Type.STRING },
            keyClauses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  text: { type: Type.STRING },
                  importance: { type: Type.STRING },
                  obligation: { type: Type.STRING }
                },
                required: ["title", "text", "importance"]
              }
            },
            jurisprudence: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            risks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  impact: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  mitigation: { type: Type.STRING }
                },
                required: ["description", "impact", "mitigation"]
              }
            },
            insights: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            legalSync: { type: Type.STRING },
            articleMatrix: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  article: { type: Type.STRING },
                  content: { type: Type.STRING },
                  interpretation: { type: Type.STRING },
                  impact: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] }
                },
                required: ["article", "content", "interpretation", "impact"]
              }
            }
          },
          required: ["summary", "structure", "keyClauses", "jurisprudence", "risks", "insights", "legalSync", "articleMatrix"]
        }
      }
    });

    const jsonStr = response.text || "{}";
    return JSON.parse(jsonStr) as AnalysisResult;
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    if (error?.status === 429 || error?.message?.includes("429")) {
      throw new Error("Kuota API Gemini telah habis. Silakan coba lagi beberapa saat lagi.");
    }
    throw error;
  }
}

export async function chatWithDocument(content: string, history: ChatMessage[], currentMessage: string) {
  try {
    const chatHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `${SYSTEM_INSTRUCTION}\n\nKONTEKS DOKUMEN:\n${content.substring(0, 30000)}`
      },
      history: chatHistory
    });

    const response = await chat.sendMessage({ message: currentMessage });
    return response.text || "Saya tidak dapat memberikan tanggapan.";
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.includes("429")) {
      return "Maaf, kuota permintaan AI saat ini sudah penuh (Error 429). Silakan tunggu sebentar dan coba lagi.";
    }
    return "Terjadi kesalahan saat memproses permintaan Anda.";
  }
}

export async function compareDocuments(contentA: string, contentB: string, nameA: string, nameB: string) {
  try {
    const prompt = `Bandingkan kedua dokumen hukum ini:
    Dok A: "${nameA}"
    Dok B: "${nameB}"
    
    Identifikasi perbedaan utama, klausa yang bertentangan, dan dokumen mana yang lebih menguntungkan bagi klien (asumsikan klien menginginkan risiko minimal dan kewajiban yang jelas). Berikan analisis dalam Bahasa Indonesia.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        { text: `KONTEN DOK A:\n${contentA}` },
        { text: `KONTEN DOK B:\n${contentB}` },
        { text: prompt }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });

    return response.text || "Gagal melakukan perbandingan.";
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.includes("429")) {
      return "Gagal membandingkan dokumen karena kuota API terlampaui. Silakan coba lagi nanti.";
    }
    return "Terjadi kesalahan saat membandingkan dokumen.";
  }
}

export async function generateMemo(analysis: AnalysisResult, docName: string) {
  try {
    const prompt = `Berdasarkan analisis hasil intelijen hukum untuk dokumen "${docName}" berikut, buatlah sebuah Memo Hukum (Internal Legal Memo) yang profesional dan formal.
    
    DATA ANALISIS:
    Summary: ${analysis.summary}
    Key Clauses: ${JSON.stringify(analysis.keyClauses)}
    Risks & Mitigations: ${JSON.stringify(analysis.risks)}
    Jurisprudence: ${analysis.jurisprudence.join(', ')}
    Legal Sync: ${analysis.legalSync}

    Gunakan format JSON yang sesuai dengan skema:
    {
      "title": "Judul Memo",
      "recipient": "Jabatan Penerima (misal: Direksi / Legal Manager)",
      "date": "Tanggal Hari Ini",
      "subject": "Subjek Memo",
      "introduction": "Ringkasan temuan utama dan tujuan memo",
      "legalAnalysis": "Analisis hukum mendalam yang menghubungkan klausul, risiko, dan yurisprudensi",
      "conclusion": "Kesimpulan akhir dan rekomendasi langkah hukum konkrit"
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [{ text: prompt }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            recipient: { type: Type.STRING },
            date: { type: Type.STRING },
            subject: { type: Type.STRING },
            introduction: { type: Type.STRING },
            legalAnalysis: { type: Type.STRING },
            conclusion: { type: Type.STRING }
          },
          required: ["title", "recipient", "date", "subject", "introduction", "legalAnalysis", "conclusion"]
        }
      }
    });

    const jsonStr = response.text || "{}";
    return JSON.parse(jsonStr);
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.includes("429")) {
      throw new Error("Gagal membuat memo: Kuota API terlampaui.");
    }
    throw new Error("Gagal membuat memo hukum.");
  }
}

export async function performOCR(base64Data: string, mimeType: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        { text: "Ekstrak semua teks dari dokumen/gambar ini dengan sangat akurat. Pastikan semua detail hukum dan angka terbaca dengan benar. Berikan hanya teks hasil ekstraksi." }
      ],
      config: {
        systemInstruction: "Anda adalah asisten OCR profesional yang mengkhususkan diri dalam dokumen hukum. Tugas Anda adalah mengekstrak teks mentah dari file yang diberikan tanpa menambahkan komentar atau penjelasan."
      }
    });

    return response.text || "";
  } catch (error: any) {
    console.error("Gemini OCR Error:", error);
    if (error?.status === 429 || error?.message?.includes("429")) {
      throw new Error("Gagal melakukan OCR: Kuota API terlampaui.");
    }
    throw new Error("Gagal mengekstrak teks dari dokumen menggunakan AI.");
  }
}

export async function generateTTS(text: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say naturally: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("Tidak ada data audio yang dihasilkan.");
    }
    return base64Audio;
  } catch (error: any) {
    console.error("Gemini TTS Error:", error);
    throw new Error("Gagal menghasilkan suara.");
  }
}
