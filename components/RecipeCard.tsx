import React, { useState } from 'react';
import { Recipe, AIConfig } from '../types';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { findDishImage } from '../services/geminiService';

interface Props {
  recipe: Recipe;
  language: 'en' | 'zh-TW';
  config: AIConfig;
}

export const RecipeCard: React.FC<Props> = ({ recipe, language, config }) => {
  const [imageUrl, setImageUrl] = useState<string | undefined>(recipe.imageUrl);
  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState(false);

  const handleImageError = async () => {
    if (error || recovering) return; // Prevent infinite loops or double triggers
    setError(true);
    setRecovering(true);
    
    // Attempt to recover image using Search tool
    const newUrl = await findDishImage(recipe.name, config);
    if (newUrl) {
      setImageUrl(newUrl);
      setError(false); // Reset error to try loading the new URL
    }
    setRecovering(false);
  };

  return (
    <div className="p-4 bg-brand-bg rounded-2xl border border-transparent hover:border-brand-primary/30 transition-all overflow-hidden relative">
      <div className="w-full h-32 mb-4 rounded-xl overflow-hidden bg-brand-surface relative group">
        {/* Loading Overlay for Recovery */}
        {recovering && (
          <div className="absolute inset-0 z-20 bg-brand-surface/80 flex items-center justify-center">
             <RefreshCw className="animate-spin text-brand-primary" size={20} />
          </div>
        )}
        
        {/* Placeholder Icon */}
        <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-20">🥘</div>
        
        {/* Image */}
        {imageUrl && !error && (
          <img 
            src={imageUrl} 
            alt={recipe.name} 
            className="w-full h-full object-cover relative z-10 transition-opacity"
            onError={handleImageError}
          />
        )}
      </div>
      
      <div className="font-bold text-brand-text text-lg">{recipe.name}</div>
      <div className="text-sm text-brand-muted mt-2 flex items-center flex-wrap gap-2 font-medium">
         <span className="bg-white px-2 py-1 rounded-md shadow-sm text-brand-text/80">{recipe.cuisine}</span>
         <span>{recipe.steps.length} steps</span>
      </div>
      
      {recipe.sourceUrl && (
        <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 text-xs flex items-center gap-1 text-brand-primary font-bold hover:underline">
          <ExternalLink size={12} /> {language === 'zh-TW' ? '來源連結' : 'Source'}
        </a>
      )}
    </div>
  );
};