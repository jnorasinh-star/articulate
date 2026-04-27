import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface WordData {
  term: string;
  definition: string;
  examples: string[];
  level: string;
  ipa?: string;
  origin?: string;
  audioUrl?: string;
  related?: {
    synonyms: string[];
    antonyms: string[];
  };
}

export const geminiService = {
  async generateDailyWord(level: string): Promise<WordData> {
    const seed = Math.random().toString(36).substring(7);
    const prompt = `Generate a unique, interesting word of the day for a ${level} level English learner. 
    Seed: ${seed}.
    Pick something educational and slightly academic. Do not pick extremely common words.
    Include the word, its definition, 3 example sentences, IPA, origin, and related words (synonyms/antonyms). 
    Format the response as JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            definition: { type: Type.STRING },
            examples: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            level: { type: Type.STRING },
            ipa: { type: Type.STRING },
            origin: { type: Type.STRING },
            audioUrl: { type: Type.STRING },
            related: {
              type: Type.OBJECT,
              properties: {
                synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["synonyms", "antonyms"]
            }
          },
          required: ["term", "definition", "examples", "level", "related"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  },

  async getRandomWord(level: string): Promise<WordData> {
    const seed = Math.random().toString(36).substring(7);
    const prompt = `Generate a random, uniquely challenging word for a ${level} level English learner. 
    Seed: ${seed}.
    Avoid common list starters. Ensure the word is practical but requires a medium to high degree of literacy.
    Include the word, definition, examples, IPA, origin, and related words.
    Format the response as JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            definition: { type: Type.STRING },
            examples: { type: Type.ARRAY, items: { type: Type.STRING } },
            level: { type: Type.STRING },
            ipa: { type: Type.STRING },
            origin: { type: Type.STRING },
            audioUrl: { type: Type.STRING },
            related: {
              type: Type.OBJECT,
              properties: {
                synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["synonyms", "antonyms"]
            }
          },
          required: ["term", "definition", "examples", "level", "related"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  },

  async generatePlacementQuestions(): Promise<any[]> {
    const prompt = `Generate 5 multiple-choice questions to determine a user's English vocabulary level. 
    The levels are: 1 (Elementary), 2 (Middle School), 3 (High School), 4 (University), 5 (Academic/Expert).
    Each question should have a sentence with a missing word and 4 options.
    Include which level each question target corresponds to.
    Format as JSON array of objects.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswer: { type: Type.STRING },
              level: { type: Type.NUMBER }
            },
            required: ["question", "options", "correctAnswer", "level"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  },

  async generateAdvancementTest(currentLevel: string): Promise<any[]> {
    const prompt = `Generate a rigorous 5-question multiple-choice test for a student trying to advance from ${currentLevel} to the next higher grade level.
    The questions should be challenging and test deep nuances of vocabulary and context.
    Each question: a sentence with a blank, 4 options, and the correct answer.
    Format as JSON array of objects.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswer: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswer"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  },

  async lookupWord(term: string): Promise<WordData> {
    const prompt = `Provide a dictionary entry for the word "${term}".
    Include: 
    - term (the word)
    - definition (clear and concise)
    - ipa (phonetic pronunciation)
    - level (Beginner, Intermediate, Advanced, or Expert)
    - examples (array of 2-3 natural sentences)
    - origin (short etymology)
    - related words (synonyms and antonyms)
    Format as JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            definition: { type: Type.STRING },
            ipa: { type: Type.STRING },
            level: { type: Type.STRING },
            examples: { type: Type.ARRAY, items: { type: Type.STRING } },
            origin: { type: Type.STRING },
            audioUrl: { type: Type.STRING },
            related: {
              type: Type.OBJECT,
              properties: {
                synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["synonyms", "antonyms"]
            }
          },
          required: ["term", "definition", "ipa", "level", "examples", "related"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  },

  async validateSentence(word: string, sentence: string): Promise<{ isValid: boolean; feedback: string }> {
    const prompt = `Validate if the word "${word}" is used correctly and naturally in the following sentence: "${sentence}".
    Check for grammatical correctness and accurate contextual use of the word.
    Provide a boolean 'isValid' and a short 'feedback' string explaining why or giving a tip.
    Format as JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING }
          },
          required: ["isValid", "feedback"]
        }
      }
    });

    return JSON.parse(response.text || '{"isValid": false, "feedback": "System error"}');
  }
};
