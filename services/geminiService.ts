/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import {GoogleGenAI, Type} from '@google/genai';

// This check is for development-time feedback.
if (!process.env.API_KEY) {
  console.error(
    'API_KEY environment variable is not set. The application will not be able to connect to the Gemini API.',
  );
}

// The "!" asserts API_KEY is non-null after the check.
const ai = new GoogleGenAI({apiKey: process.env.API_KEY!});
const artModelName = 'gemini-2.5-flash';
const textModelName = 'gemini-2.5-flash';

/**
 * Art-direction toggle for ASCII art generation.
 * `true`: Slower, higher-quality results (allows the model to "think").
 * `false`: Faster, potentially lower-quality results (skips thinking).
 */
const ENABLE_THINKING_FOR_ASCII_ART = false;

/**
 * Art-direction toggle for blocky ASCII text generation.
 * `true`: Generates both creative art and blocky text for the topic name.
 * `false`: Generates only the creative ASCII art.
 */
const ENABLE_ASCII_TEXT_GENERATION = false;

export interface AsciiArtData {
  art: string;
  text?: string; // Text is now optional
}

export interface Link {
  url: string;
  title: string;
}

export interface StructuredAnswer {
  explanation: string;
  suggestion: string;
  links: Link[];
}

/**
 * Generates a structured answer for a given topic, including an explanation,
 * a suggestion, and relevant links.
 * @param topic The word or phrase to define.
 * @returns A promise that resolves to a structured answer object.
 */
export async function getStructuredAnswer(topic: string): Promise<StructuredAnswer> {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY is not configured. Please check your environment variables to continue.');
  }

  const prompt = `You are an expert content creator. For the topic "${topic}", generate a structured response with three parts: an explanation, a suggestion, and relevant links.

Follow these rules precisely:
1.  "explanation": A clear, factual, Wikipedia-style explanation of the topic. It must be concise, neutral, educational, and between 2 to 5 sentences.
2.  "suggestion": A subtle recommendation paragraph that naturally suggests related products, services, or learning resources. It should feel informative and inspiring, not like a hard advertisement.
3.  "links": Provide 3 to 5 relevant URL links. The "title" for each link MUST be a keyword or phrase that appears verbatim in the "explanation" or "suggestion" text. This is crucial for linking.

The response must be a single JSON object matching the provided schema. Do not include any extra text or markdown formatting.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      explanation: {
        type: Type.STRING,
        description: 'A clear, factual, Wikipedia-style explanation of the topic (2–5 sentences).',
      },
      suggestion: {
        type: Type.STRING,
        description: 'A subtle recommendation paragraph suggesting related resources.',
      },
      links: {
        type: Type.ARRAY,
        description: 'A list of 3-5 relevant links.',
        items: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'The display title for the link. Must be a keyword or phrase found verbatim in the explanation or suggestion text.',
            },
            url: {
              type: Type.STRING,
              description: 'The full URL for the link.',
            },
          },
          required: ['title', 'url'],
        },
      },
    },
    required: ['explanation', 'suggestion', 'links'],
  };

  try {
    const response = await ai.models.generateContent({
      model: textModelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    let jsonStr = response.text.trim();
    const parsedData = JSON.parse(jsonStr) as StructuredAnswer;

    if (!parsedData.explanation || !parsedData.suggestion || !Array.isArray(parsedData.links)) {
      throw new Error('Invalid response structure received from API.');
    }

    return parsedData;

  } catch (error) {
    console.error(`Error generating structured answer for "${topic}":`, error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    throw new Error(`Could not generate content for "${topic}". ${errorMessage}`);
  }
}


/**
 * Generates ASCII art and optionally text for a given topic.
 * @param topic The topic to generate art for.
 * @returns A promise that resolves to an object with art and optional text.
 */
export async function generateAsciiArt(topic: string): Promise<AsciiArtData> {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY is not configured.');
  }
  
  const artPromptPart = `1. "art": meta ASCII visualization of the word "${topic}":
  - Palette: │─┌┐└┘├┤┬┴┼►◄▲▼○●◐◑░▒▓█▀▄■□▪▫★☆♦♠♣♥⟨⟩/\\_|
  - Shape mirrors concept - make the visual form embody the word's essence
  - Examples: 
    * "explosion" → radiating lines from center
    * "hierarchy" → pyramid structure
    * "flow" → curved directional lines
  - Return as single string with \n for line breaks`;


  const keysDescription = `one key: "art"`;
  const promptBody = artPromptPart;

  const prompt = `For "${topic}", create a JSON object with ${keysDescription}.
${promptBody}

Return ONLY the raw JSON object, no additional text. The response must start with "{" and end with "}" and contain only the art property.`;

  const maxRetries = 1;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // FIX: Construct config object conditionally to avoid spreading a boolean
      const config: any = {
        responseMimeType: 'application/json',
      };
      if (!ENABLE_THINKING_FOR_ASCII_ART) {
        config.thinkingConfig = { thinkingBudget: 0 };
      }

      const response = await ai.models.generateContent({
        model: artModelName,
        contents: prompt,
        config: config,
      });

      let jsonStr = response.text.trim();
      
      // Debug logging
      console.log(`Attempt ${attempt}/${maxRetries} - Raw API response:`, jsonStr);
      
      // Remove any markdown code fences if present
      const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[1]) {
        jsonStr = match[1].trim();
      }

      // Ensure the string starts with { and ends with }
      if (!jsonStr.startsWith('{') || !jsonStr.endsWith('}')) {
        throw new Error('Response is not a valid JSON object');
      }

      const parsedData = JSON.parse(jsonStr) as AsciiArtData;
      
      // Validate the response structure
      if (typeof parsedData.art !== 'string' || parsedData.art.trim().length === 0) {
        throw new Error('Invalid or empty ASCII art in response');
      }
      
      // If we get here, the validation passed
      const result: AsciiArtData = {
        art: parsedData.art,
      };

      if (ENABLE_ASCII_TEXT_GENERATION && parsedData.text) {
        result.text = parsedData.text;
      }
      
      return result;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      console.warn(`Attempt ${attempt}/${maxRetries} failed:`, lastError.message);
      
      if (attempt === maxRetries) {
        console.error('All retry attempts failed for ASCII art generation');
        throw new Error(`Could not generate ASCII art after ${maxRetries} attempts: ${lastError.message}`);
      }
      // Continue to next attempt
    }
  }

  // This should never be reached, but just in case
  throw lastError || new Error('All retry attempts failed');
}