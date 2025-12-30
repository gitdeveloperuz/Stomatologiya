import { GoogleGenAI, Type } from "@google/genai";
import { Treatment } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDentalImage = async (base64Image: string): Promise<Treatment[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: 'image/jpeg', // Assuming JPEG for simplicity from canvas/input
            },
          },
          {
            text: `You are an expert dentist AI assistant for a clinic in Uzbekistan. 
            Analyze the provided image of teeth/smile. 
            Identify potential dental issues (e.g., yellowing, misalignment, cavities, gum issues, or just general cleaning needs).
            Recommend 3-5 specific treatments available in a modern dental clinic.
            Provide estimated prices in Uzbek Soum (UZS). Realistic market prices.
            
            Return the response in UZBEK language (Latin script).
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
              name: { type: Type.STRING, description: "Name of the treatment (e.g., 'Tish oqartirish')" },
              description: { type: Type.STRING, description: "Short explanation of why this is needed based on the image" },
              price: { type: Type.NUMBER, description: "Estimated price in UZS" },
            },
            required: ["name", "description", "price"]
          }
        }
      }
    });

    const rawData = JSON.parse(response.text || "[]");
    
    // Map to our Treatment interface
    return rawData.map((item: any, index: number) => ({
      id: `ai-${Date.now()}-${index}`,
      name: item.name,
      description: item.description,
      price: item.price,
      recommended: true
    }));

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Tahlil jarayonida xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
  }
};