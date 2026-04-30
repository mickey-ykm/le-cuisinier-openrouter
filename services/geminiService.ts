import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Recipe, Ingredient, TimelineEvent, MealPlan, AIConfig } from "../types";

export const invokeAI = async (
  prompt: string,
  config: AIConfig,
  schema: Schema,
  useSearch: boolean = false
): Promise<any> => {
  if (config.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: config.apiKey || process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: config.model || 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: useSearch ? [{googleSearch: {}}] : undefined,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });
    return JSON.parse(response.text || '{}');
  } else {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey || ''}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.model || 'qwen/qwen-2.5-72b-instruct',
        messages: [
          { role: "system", content: "You must always return your response in raw JSON format according to the provided schema. Do not wrap in markdown blocks, just raw JSON string." },
          { role: "user", content: prompt + `\n\nEnsure your response strictly matches this JSON schema (do not output markdown json block markers):\n${JSON.stringify(schema, null, 2)}` }
        ],
        response_format: { type: "json_object" }
      })
    });
    
    if (!res.ok) {
       const errorData = await res.json().catch(() => ({}));
       console.error("OpenRouter Error:", errorData);
       if (res.status === 429) throw new Error('RATE_LIMIT');
       if (res.status === 401) throw new Error('UNAUTHORIZED');
       throw new Error(`OpenRouter API error: ${res.status}`);
    }
    
    const data = await res.json();
    let text = data.choices[0]?.message?.content || '{}';
    if (text.startsWith('```json')) text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    if (text.startsWith('```')) text = text.replace(/```/g, '').trim();
    return JSON.parse(text);
  }
};

// Schemas
const ingredientSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    item: { type: Type.STRING },
    quantity: { type: Type.STRING },
    unit: { type: Type.STRING },
    notes: { type: Type.STRING },
    category: { type: Type.STRING },
    imageTerm: { type: Type.STRING, description: "A SINGLE standard English noun for the ingredient to look up its image. Must be singular and common (e.g. 'Garlic', 'Chicken', 'Beef', 'Onion', 'Rice'). Do not include adjectives." },
    usedInDishes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of dish names that this ingredient is used in." },
  },
  required: ["item", "quantity", "unit", "category"],
};

const cookingStepSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    description: { type: Type.STRING },
    durationMinutes: { type: Type.NUMBER },
    type: { type: Type.STRING, enum: ["active", "passive"] },
  },
  required: ["id", "description", "durationMinutes", "type"],
};

const recipeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    name: { type: Type.STRING },
    servings: { type: Type.NUMBER },
    ingredients: {
      type: Type.ARRAY,
      items: ingredientSchema,
    },
    steps: {
      type: Type.ARRAY,
      items: cookingStepSchema,
    },
    cuisine: { type: Type.STRING },
    difficulty: { type: Type.STRING },
    sourceUrl: { type: Type.STRING, description: "The URL of the website where this recipe was found." },
    imageUrl: { type: Type.STRING, description: "The direct URL of the main image (OG image or Hero image) from the sourceUrl page." },
  },
  required: ["name", "ingredients", "steps"],
};

const recipeListSchema: Schema = {
  type: Type.ARRAY,
  items: recipeSchema,
};

const timelineEventSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    day: { type: Type.NUMBER, description: "The day number (1 for Day 1, 2 for Day 2). Defaults to 1 if it's a single day plan." },
    recipeName: { type: Type.STRING },
    task: { type: Type.STRING },
    startTimeOffset: { type: Type.NUMBER, description: "Minutes from the start of cooking on that specific day" },
    duration: { type: Type.NUMBER },
    type: { type: Type.STRING, enum: ["active", "passive"] },
    phase: { type: Type.STRING, enum: ["preparation", "partial_cooking", "final_cooking"], description: "Categorize the step into preparation (e.g. chopping, washing), partial_cooking (e.g. simmering, marinating, half-done), or final_cooking (e.g. final stir-fry, assembly)." },
    critical: { type: Type.BOOLEAN },
  },
  required: ["recipeName", "task", "startTimeOffset", "duration", "type", "day", "phase"],
};

const timelineSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    timeline: { type: Type.ARRAY, items: timelineEventSchema },
    shoppingList: { type: Type.ARRAY, items: ingredientSchema },
    totalEstimatedTimeMinutes: { type: Type.NUMBER },
  },
  required: ["timeline", "shoppingList", "totalEstimatedTimeMinutes"],
};

/**
 * Attempts to find a new image URL for a specific dish using Google Search.
 * Used when the original image link is broken.
 */
export const findDishImage = async (dishName: string, config: AIConfig): Promise<string | null> => {
  const prompt = `Find a representative high-quality image URL for the dish: "${dishName}". Return JSON { "imageUrl": "..." }.`;
  try {
     const schema: Schema = {
        type: Type.OBJECT,
        properties: { imageUrl: { type: Type.STRING } }
     };
     const res = await invokeAI(prompt, config, schema, true);
     return res.imageUrl || null;
  } catch (e: any) {
    if (e?.status === 'RESOURCE_EXHAUSTED' || e?.message?.includes('429') || e?.message?.includes('quota') || e?.message === 'RATE_LIMIT') {
      console.warn("Image recovery skipped due to API rate limits.");
    } else {
      console.error("Failed to recover image", e);
    }
    return null;
  }
}

export const fetchRecipes = async (
  dishes: { name: string; requirements: string; youtubeUrl?: string }[], 
  remarks: string,
  headcount: number, 
  dietary: string,
  sideDishCount: number,
  language: 'en' | 'zh-TW',
  config: AIConfig,
  fridgeIngredients?: string,
  expectedTime?: string
): Promise<Recipe[]> => {
  
  const langPrompt = language === 'zh-TW' ? "Output all text (except URLs) in Traditional Chinese (zh-TW)." : "Output all text in English.";
  
  const sideDishPrompt = sideDishCount > 0 
    ? `Also, suggest and include exactly ${sideDishCount} appropriate side dish(es) that complement the meal. Name them creatively.` 
    : "";
    
  let dishesPrompt = "";
  if (dishes.length > 0) {
    dishesPrompt = "1. Search for authentic and high-rated recipes for the following dishes: \n    " + 
      dishes.map(d => `- ${d.name}` + 
      (d.requirements ? ` (Requirements: ${d.requirements})` : '') + 
      (d.youtubeUrl ? ` (Extract recipe ingredients and steps exactly from this YouTube video: ${d.youtubeUrl})` : '')
    ).join("\n    ");
  }

  const fridgePrompt = fridgeIngredients?.trim() 
    ? `\nCRITICAL REQUIREMENT: The user wants to CLEAR THEIR FRIDGE. You MUST utilize these ingredients from the user's fridge to create the recipe(s): ${fridgeIngredients.trim()}. ` + (dishes.length === 0 ? "Invent or suggest creative and delicious dishes utilizing these ingredients." : "Adapt the requested dishes to use these ingredients as much as possible.")
    : "";
    
  const expectedTimePrompt = expectedTime?.trim()
    ? `\nCRITICAL REQUIREMENT: The expected total cooking time is around ${expectedTime.trim()} minutes. Please plan simple dishes and optimize the recipes if the time is short.`
    : "";
  
  const remarksPrompt = remarks.trim() ? `Additional Chef Requirements/Remarks: ${remarks.trim()}` : "";
  
  const prompt = `
    You are a professional chef. 
    ${dishesPrompt}
    ${fridgePrompt}
    ${expectedTimePrompt}
    2. Create detailed recipes based on your research or creativity.
    3. Scale ingredients for ${headcount} people.
    Constraint: ${dietary || "None"}.
    ${remarksPrompt}
    ${sideDishPrompt}
    ${langPrompt}
    Structure each recipe carefully. Distinguish between 'active' steps (chopping, stirring) and 'passive' steps (roasting, boiling, marinating).
    IMPORTANT: For each recipe, you MUST include the 'sourceUrl' from the search result. If it's a completely original recipe, make sourceUrl empty string.
    CRITICAL: You MUST extract the main image URL (such as the 'og:image' meta tag or the main article image) directly from the specific source URL found. Populate 'imageUrl' with this specific URL. If it's an original recipe, leave it empty. Do not use generic placeholders.
  `;

  try {
    const res = await invokeAI(prompt, config, recipeListSchema, true);
    return res as Recipe[];
  } catch (e: any) {
    console.error("Failed to fetch recipes", e);
    if (e?.status === 'RESOURCE_EXHAUSTED' || e?.message?.includes('429') || e?.message?.includes('quota') || e?.message === 'RATE_LIMIT') {
      throw new Error('RATE_LIMIT');
    }
    throw e;
  }
};

export const regenerateRecipes = async (
  currentRecipes: Recipe[],
  instruction: string,
  headcount: number,
  dietary: string,
  language: 'en' | 'zh-TW',
  config: AIConfig
): Promise<Recipe[]> => {
  const langPrompt = language === 'zh-TW' ? "Output all text in Traditional Chinese (zh-TW), but keep dish names in original language if better." : "Output in English.";
  
  const prompt = `
    You are a professional chef. We have an existing set of recipes for a meal plan:
    ${JSON.stringify(currentRecipes)}

    The user has a requested change: "${instruction}"
    
    1. Regenerate or adapt the set of recipes to fulfill this request.
    2. Scale ingredients for ${headcount} people.
    Constraint: ${dietary || "None"}.
    ${langPrompt}
    Structure each recipe carefully according to the JSON schema. Distinguish between 'active' steps (chopping, stirring) and 'passive' steps (roasting, boiling, marinating).
  `;

  try {
    const res = await invokeAI(prompt, config, recipeListSchema, true);
    return res as Recipe[];
  } catch (e: any) {
    console.error("Failed to regenerate recipes", e);
    if (e?.status === 'RESOURCE_EXHAUSTED' || e?.message?.includes('429') || e?.message?.includes('quota') || e?.message === 'RATE_LIMIT') {
      throw new Error('RATE_LIMIT');
    }
    throw e;
  }
};

export const generateOrchestration = async (
  recipes: Recipe[],
  language: 'en' | 'zh-TW',
  config: AIConfig
): Promise<{ timeline: TimelineEvent[], shoppingList: Ingredient[], totalTime: number }> => {

  const langPrompt = language === 'zh-TW' ? "Output task descriptions and ingredients in Traditional Chinese (zh-TW)." : "Output in English.";

  // Simplify prompt to avoid token limits and reduce latency
  const prompt = `
    You are a logistics expert. I have these recipes:
    ${JSON.stringify(recipes)}

    1. Create a consolidated Shopping List.
       - IMPORTANT: For each ingredient, populate 'imageTerm' with a SINGLE English noun (e.g., 'Chopped Garlic' -> 'Garlic', '500g Beef' -> 'Beef') to be used for fetching a thumbnail image.
       - IMPORTANT: For each ingredient, identify which dishes it's used in and populate the 'usedInDishes' array with the exact recipe names.
    2. Create a "Parallel Processing" Cooking Itinerary.
       - Interleave steps to minimize time.
       - Active tasks during passive times.
       - Categorize each task explicitly into 'preparation', 'partial_cooking', or 'final_cooking' using the 'phase' property.
       - If the user's request, remarks, or recipes imply different days (e.g., a multi-day meal plan), assign the correct 'day' integer (1, 2, etc.) to each timeline event. Otherwise use 1.
       - Each day's timeline must start its 'startTimeOffset' from 0.
       - All dishes for the SAME DAY should finish at the end of that day.
    ${langPrompt}
  `;

  try {
    const data = await invokeAI(prompt, config, timelineSchema, false);

    return {
      timeline: data.timeline,
      shoppingList: data.shoppingList,
      totalTime: data.totalEstimatedTimeMinutes
    };
  } catch (e: any) {
    console.error("Failed to parse orchestration", e);
    if (e?.status === 'RESOURCE_EXHAUSTED' || e?.message?.includes('429') || e?.message?.includes('quota') || e?.message === 'RATE_LIMIT') {
      throw new Error('RATE_LIMIT');
    }
    throw e;
  }
};