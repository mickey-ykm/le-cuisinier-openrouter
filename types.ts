export type Language = 'en' | 'zh-TW';

export interface AIConfig {
  provider: 'gemini' | 'openrouter';
  model: string;
  apiKey: string;
}

export interface Ingredient {
  item: string;
  quantity: string;
  unit: string;
  notes?: string;
  category: string; // e.g., Produce, Dairy, Meat
  imageTerm?: string; // Single noun for image lookup
  usedInDishes?: string[];
}

export interface CookingStep {
  id: string;
  description: string;
  durationMinutes: number;
  type: 'active' | 'passive'; // Active = cutting, stirring; Passive = roasting, boiling
  ingredientsNeeded?: string[];
}

export interface Recipe {
  id: string;
  name: string;
  servings: number;
  ingredients: Ingredient[];
  steps: CookingStep[];
  cuisine?: string;
  difficulty?: string;
  sourceUrl?: string;
  imageUrl?: string;
}

export type CookingPhase = 'preparation' | 'partial_cooking' | 'final_cooking';

export interface TimelineEvent {
  id: string;
  day: number;
  recipeName: string;
  task: string;
  startTimeOffset: number; // Minutes from T-0 (start of cooking on that day)
  duration: number;
  type: 'active' | 'passive';
  phase?: CookingPhase;
  critical: boolean; // True if on critical path
}

export interface MealPlan {
  id: string;
  createdAt: number;
  title: string;
  guestCount: number;
  dietaryRestrictions: string;
  recipes: Recipe[];
  shoppingList: Ingredient[];
  timeline: TimelineEvent[];
  totalEstimatedTimeMinutes: number;
  previousVersions?: MealPlan[];
  regenInstruction?: string; // What instruction generated this version
}