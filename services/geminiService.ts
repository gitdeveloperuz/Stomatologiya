
import { GoogleGenAI, Type } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDentalImage = async (base64Image: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: `You are a professional dentist AI assistant. Analyze this image of a person's teeth/smile.
            Identify visible issues such as discoloration, alignment, cavities, or missing teeth.
            
            Based on the analysis, suggest 3-4 suitable dental treatments from this pricing list (approximate):
            - Tish Oqartirish (Zoom 4) - 2,000,000 UZS
            - Tish Tozalash (AirFlow) - 300,000 UZS
            - Tish Yuvish va Polirovka - 250,000 UZS
            - Karies Davolash (Plomba) - 400,000 UZS
            - Metall Keramika - 800,000 UZS
            - Dental Implant (Osstem) - 4,000,000 UZS
            - Vinirlar (E-max) - 2,500,000 UZS
            - Breketlar (Metall) - 5,000,000 UZS

            Return a JSON array of objects. Each object must have:
            - 'name': Name of the treatment (from the list above)
            - 'price': Numeric price in UZS (no currency symbol)
            - 'description': A short, friendly explanation (in Uzbek) of why this treatment is recommended based on the image.
            - 'currency': 'UZS'
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              price: { type: Type.NUMBER },
              description: { type: Type.STRING },
              currency: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return [];
  }
};
