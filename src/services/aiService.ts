import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateMission(complexity: string = "MEDIUM") {
  const prompt = `Generate a cinematic cyberpunk hacking mission objective for a hacker simulation game. 
  Complexity level: ${complexity}.
  The objective should sound professional and technical.
  Include:
  - Mission Title
  - Target Organization
  - High-level Objective
  - 3-5 technical steps to complete (e.g., bypass firewall, inject SQL, exfiltrate data).
  - A brief briefing from a mysterious handler.
  
  Format the response as JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          target: { type: Type.STRING },
          description: { type: Type.STRING },
          steps: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          handlerMessage: { type: Type.STRING }
        },
        required: ["title", "target", "description", "steps", "handlerMessage"]
      },
    },
  });

  return JSON.parse(response.text);
}

export async function getAiResponse(userCommand: string, currentContext: any) {
  const prompt = `You are a hacker terminal AI for a game called GhostNet. 
  The user entered the command: "${userCommand}".
  The current mission context is: ${JSON.stringify(currentContext)}.
  Respond with a technical, cinematic terminal output. If they hacked successfully or failed, describe it in technical hacker jargon.
  Keep it concise (1-3 lines).`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "You are a realistic hacker terminal OS. Use technical jargon. Be concise.",
    }
  });

  return response.text;
}
