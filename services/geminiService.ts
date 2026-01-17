
import { GoogleGenAI, Type } from "@google/genai";

// Always use { apiKey: process.env.GEMINI_API_KEY } for initialization
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function parseOrderInput(input: string) {
  // Lấy danh sách preset để nhúng vào prompt
  const savedPresets = localStorage.getItem('nb_preset_services');
  const presetsContext = savedPresets ? `DANH MỤC DỊCH VỤ CỦA CỬA HÀNG (ƯU TIÊN): ${savedPresets}` : "";

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Bạn là trợ lý bán hàng chuyên nghiệp tại cửa hàng photocopy Nhân Bản. 
      Nhiệm vụ: Bóc tách đơn hàng từ lời nói hoặc tin nhắn của khách hàng Việt Nam.
      
      ${presetsContext}

      Nội dung khách nói: "${input}"
      
      QUY TẮC XỬ LÝ NGÔN NGỮ TIẾNG VIỆT:
      1. Đơn vị tiền tệ: 
         - "k", "ngàn", "nghìn" -> x1000
         - "lít", "xị" -> 100000, 10000
         - "chục" -> 10 (số lượng) hoặc 10000 (giá tiền)
      2. Tên dịch vụ phổ biến:
         - "photo", "phô", "tô" -> Photocopy
         - "in", "ấn" -> In ấn
         - "đóng tập", "đóng gáy", "lò xo" -> Đóng sách
      3. Tham chiếu danh mục dịch vụ bên trên để lấy đơn giá đúng nếu khách không nói giá.
      4. Kết quả trả về là mảng JSON các đối tượng.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              service: { type: Type.STRING, description: "Tên hàng hóa/dịch vụ" },
              quantity: { type: Type.NUMBER, description: "Số lượng" },
              unitPrice: { type: Type.NUMBER, description: "Đơn giá (số)" },
              note: { type: Type.STRING, description: "Ghi chú thêm" }
            },
            required: ["service", "quantity", "unitPrice"],
            propertyOrdering: ["service", "quantity", "unitPrice", "note"]
          }
        }
      }
    });

    return JSON.parse(result.text || "[]");
  } catch (e) {
    console.error("Gemini Error:", e);
    return [];
  }
}
