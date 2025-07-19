import { GoogleGenAI } from "@google/genai";

if (!process.env.API_KEY) {
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  savingsTarget: number;
  currency: string;
  month: string;
  year: number;
  expensesByCategory: {
    category: string;
    spent: number;
    budget: number;
  }[];
}

export const generateFinancialTip = async (summary: FinancialSummary): Promise<string> => {
  const prompt = `
    Eres un asesor financiero experto y amigable. Tu objetivo es dar un consejo breve (máximo 2-3 frases), práctico y alentador en español.
    No uses markdown, asteriscos ni ningún formato especial. Responde en texto plano.
    Habla directamente al usuario en un tono positivo y constructivo.
    La moneda actual es ${summary.currency}.

    Aquí está el resumen financiero del usuario para ${summary.month} de ${summary.year}:
    - Ingresos Totales: ${summary.currency}${summary.totalIncome.toFixed(2)}
    - Gastos Totales: ${summary.currency}${summary.totalExpenses.toFixed(2)}
    - Ahorro Total: ${summary.currency}${summary.totalSavings.toFixed(2)}
    - Objetivo de ahorro recomendado (10% de ingresos): ${summary.currency}${summary.savingsTarget.toFixed(2)}
    - Balance (Ingresos - Gastos - Ahorros): ${summary.currency}${(summary.totalIncome - summary.totalExpenses - summary.totalSavings).toFixed(2)}
    - Desglose de gastos por categoría:
    ${summary.expensesByCategory.map(e => `  - ${e.category}: Gastado ${summary.currency}${e.spent.toFixed(2)}`).join('\n')}

    Basándote en estos datos, proporciona un consejo financiero conciso y útil para este período.
    1. Analiza si el usuario está cumpliendo su objetivo de ahorro del 10%. Felicítale si lo cumple o anímale si está cerca.
    2. Comenta brevemente sobre la relación entre ingresos y gastos del mes.
    3. Si un gasto de una categoría parece alto en este período, menciónalo sutilmente.
    Prioriza el consejo sobre el ahorro.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 1,
        topK: 1,
      }
    });
    
    if (response.text) {
        return response.text;
    } else {
        return "Parece que todo va bien. ¡Sigue así con tus finanzas!";
    }
  } catch (error) {
    console.error('Error al generar el consejo financiero con Gemini:', error);
    throw new Error('No se pudo comunicar con el servicio de IA.');
  }
};