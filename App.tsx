import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { ChefHat, History, Plus, Globe, ArrowRight, Loader2, ArrowLeft, Trash2, UtensilsCrossed, Minus, ExternalLink, Clock, List, Zap, BrainCircuit, Settings, Heart, Utensils, Smile, ChevronDown, ChevronUp, Snowflake } from 'lucide-react';
import { Language, MealPlan } from './types';
import { translations } from './translations';
import { fetchRecipes, generateOrchestration, regenerateRecipes } from './services/geminiService';
import { ShoppingList } from './components/ShoppingList';
import { CookingTimeline } from './components/CookingTimeline';
import { RecipeCard } from './components/RecipeCard';
import { SettingsModal } from './components/SettingsModal';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsConditions } from './components/TermsConditions';

const STORAGE_KEY = 'mise-en-place-plans';
const SETTINGS_STORAGE_KEY = 'mise-en-place-settings';

const App = () => {
  const [language, setLanguage] = useState<Language>('zh-TW');
  const [view, setView] = useState<'dashboard' | 'creatorOptions' | 'creator' | 'assistant' | 'privacy' | 'terms'>('dashboard');
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<MealPlan | null>(null);
  
  // Settings State
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openrouter'>('openrouter');
  const [geminiModel, setGeminiModel] = useState<'gemini-3-flash-preview' | 'gemini-3.1-pro-preview'>('gemini-3-flash-preview');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openRouterModel, setOpenRouterModel] = useState('qwen/qwen-2.5-72b-instruct');
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Tab State for Assistant View
  const [activeTab, setActiveTab] = useState<'timeline' | 'steps'>('timeline');
  const [isStepsCollapsed, setIsStepsCollapsed] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [isRegenModalOpen, setIsRegenModalOpen] = useState(false);
  const [regenInstruction, setRegenInstruction] = useState('');

  // Form State
  const [creatorMode, setCreatorMode] = useState<'normal' | 'clearFridge'>('normal');
  const [fridgeIngredients, setFridgeIngredients] = useState('');
  const [expectedTime, setExpectedTime] = useState('');
  const [planTitleInput, setPlanTitleInput] = useState('');
  const [dishesInput, setDishesInput] = useState([{ id: Date.now().toString(), name: '', requirements: '', youtubeUrl: '' }]);
  const [remarks, setRemarks] = useState('');
  const [headcount, setHeadcount] = useState(2);
  const [dietary, setDietary] = useState('');
  const [sideDishCount, setSideDishCount] = useState(0);
  
  // Loading State
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  
  const t = translations[language];

  useEffect(() => {
    // Load Plans
    const savedPlans = localStorage.getItem(STORAGE_KEY);
    if (savedPlans) {
      setPlans(JSON.parse(savedPlans));
    }

    // Load Settings
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedSettings) {
      const { provider, gModel, orModel } = JSON.parse(savedSettings);
      if (provider) setAiProvider(provider);
      if (gModel) setGeminiModel(gModel);
      if (orModel) setOpenRouterModel(orModel);
      // NOTE: We no longer load API keys from local storage
    }
  }, []);

  const handleSaveSettings = (
    orModel: string,
    orKey: string
  ) => {
    setAiProvider('openrouter');
    setOpenRouterModel(orModel);
    setOpenRouterApiKey(orKey);
    // Persist only non-key configurations
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ provider: 'openrouter', orModel }));
    setIsSettingsOpen(false);
  };

  const savePlan = (plan: MealPlan) => {
    const updated = [plan, ...plans];
    setPlans(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const deletePlan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = plans.filter(p => p.id !== id);
    setPlans(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleGenerate = async () => {
    const validDishes = dishesInput.filter(d => d.name.trim() !== '');
    if (creatorMode === 'normal' && validDishes.length === 0) return;
    if (creatorMode === 'clearFridge' && validDishes.length === 0 && fridgeIngredients.trim() === '') return;

    setLoading(true);
    
    const config = {
      provider: aiProvider,
      model: aiProvider === 'gemini' ? geminiModel : openRouterModel,
      apiKey: aiProvider === 'gemini' ? geminiApiKey : openRouterApiKey,
    };
    
    let dishNamesStr = validDishes.map(d => d.name).join(', ');
    if (creatorMode === 'clearFridge' && validDishes.length === 0) {
      dishNamesStr = language === 'zh-TW' ? "清雪櫃料理" : "Clear Fridge Recipes";
    }
    
    try {
      // Step 1: Research
      setLoadingStep(language === 'zh-TW' 
        ? `🔍 正在搜尋關於 "${dishNamesStr}" 的食譜...` 
        : `🔍 Researching recipes for "${dishNamesStr}"...`);
        
      const recipes = await fetchRecipes(validDishes, remarks, headcount, dietary, sideDishCount, language, config, creatorMode === 'clearFridge' ? fridgeIngredients : undefined, creatorMode === 'clearFridge' ? expectedTime : undefined);
      
      if (recipes.length === 0) {
        throw new Error("No recipes found");
      }

      // Step 2: Planning
      setLoadingStep(language === 'zh-TW'
        ? `🥬 找到 ${recipes.length} 道料理。正在規劃廚房動線與時間表...`
        : `🥬 Found ${recipes.length} dishes. Orchestrating kitchen workflow...`);

      const { timeline, shoppingList, totalTime } = await generateOrchestration(recipes, language, config);

      // Step 3: Finalizing
      setLoadingStep(language === 'zh-TW' 
        ? "✨ 正在完成最終計畫..." 
        : "✨ Finalizing plan...");

      const generatedTitle = creatorMode === 'clearFridge' 
        ? t.clearFridgeOn.replace('{date}', new Date().toLocaleDateString())
        : (planTitleInput.trim() || (dishNamesStr + (sideDishCount > 0 ? ` + ${sideDishCount} sides` : '')));
      
      const title = generatedTitle;

      const newPlan: MealPlan = {
        id: Date.now().toString(),
        createdAt: Date.now(),
        title: title,
        guestCount: headcount,
        dietaryRestrictions: dietary,
        recipes,
        shoppingList,
        timeline,
        totalEstimatedTimeMinutes: totalTime,
      };

      savePlan(newPlan);
      setCurrentPlan(newPlan);
      setView('assistant');
      setActiveTab('timeline'); // Reset tab
      // Reset inputs slightly but maybe keep some preferences? Let's clear unique inputs.
      setPlanTitleInput(''); 
      setDishesInput([{ id: Date.now().toString(), name: '', requirements: '', youtubeUrl: '' }]);
      setRemarks('');
      setFridgeIngredients('');
      setExpectedTime('');
    } catch (err: any) {
      console.error(err);
      if (err?.message === 'RATE_LIMIT') {
         alert(language === 'zh-TW' ? "AI API 使用量已達上限。請稍後再試，或在右上角設定中配置您自己的 API Key。" : "AI API rate limit exceeded. Please try again later, or configure your own API key in the top-right settings.");
      } else if (err?.message === 'UNAUTHORIZED' || err?.message?.includes('401')) {
         alert(language === 'zh-TW' ? "API 連線失敗 (未授權)。請在右上角設定中檢查您的 API Key 是否正確設定。" : "API connection failed (Unauthorized). Please check your API key in the top-right settings.");
      } else {
         alert((language === 'zh-TW' ? "生成計畫失敗: " : "Failed to generate plan: ") + (err?.message || "Please try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  const openPlan = (plan: MealPlan) => {
    setCurrentPlan(plan);
    setView('assistant');
    setActiveTab('timeline');
    setIsStepsCollapsed(false);
  };

  const handleRegenerate = async () => {
    if (!currentPlan || !regenInstruction.trim()) return;
    setLoading(true);
    setIsRegenModalOpen(false);

    const config = {
      provider: aiProvider,
      model: aiProvider === 'gemini' ? geminiModel : openRouterModel,
      apiKey: aiProvider === 'gemini' ? geminiApiKey : openRouterApiKey,
    };

    try {
      setLoadingStep(language === 'zh-TW' 
        ? `🔄 正在根據指示重新生成食譜...` 
        : `🔄 Regenerating recipes based on instruction...`);
      
      const newRecipes = await regenerateRecipes(
        currentPlan.recipes, 
        regenInstruction, 
        currentPlan.guestCount, 
        currentPlan.dietaryRestrictions, 
        language, 
        config
      );

      if (newRecipes.length === 0) throw new Error("No recipes found");

      setLoadingStep(language === 'zh-TW'
        ? `🥬 重新規劃廚房動線與時間表...`
        : `🥬 Re-orchestrating kitchen workflow...`);

      const { timeline, shoppingList, totalTime } = await generateOrchestration(
        newRecipes, 
        language, 
        config
      );

      setLoadingStep(language === 'zh-TW' 
        ? "✨ 正在完成最終計畫..." 
        : "✨ Finalizing plan...");

      const previousVersions = currentPlan.previousVersions ? [...currentPlan.previousVersions] : [];
      const { previousVersions: _, ...oldVersionWithoutHistory } = currentPlan;
      previousVersions.push(oldVersionWithoutHistory as MealPlan);

      const updatedPlan: MealPlan = {
        ...currentPlan,
        recipes: newRecipes,
        shoppingList,
        timeline,
        totalEstimatedTimeMinutes: totalTime,
        previousVersions,
        regenInstruction
      };

      const updatedPlans = plans.map(p => p.id === updatedPlan.id ? updatedPlan : p);
      setPlans(updatedPlans);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlans));
      setCurrentPlan(updatedPlan);
      
      setRegenInstruction('');
    } catch (err: any) {
      console.error(err);
      if (err?.message === 'RATE_LIMIT') {
         alert(language === 'zh-TW' ? "AI API 使用量已達上限。請稍後再試，或在左上角設定中配置您自己的 API Key。" : "AI API rate limit exceeded. Please try again later, or configure your own API key in the top-left settings.");
      } else {
         alert("Failed to regenerate plan. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = (targetVersion: MealPlan) => {
    if (!currentPlan || !currentPlan.previousVersions) return;

    const previousVersions = currentPlan.previousVersions;
    const { previousVersions: _, ...currentWithoutHistory } = currentPlan;
    
    const updatedHistory = previousVersions.filter(v => v !== targetVersion);
    updatedHistory.push(currentWithoutHistory as MealPlan);

    const updatedPlan: MealPlan = {
      ...targetVersion,
      id: currentPlan.id, 
      previousVersions: updatedHistory
    };

    const updatedPlans = plans.map(p => p.id === updatedPlan.id ? updatedPlan : p);
    setPlans(updatedPlans);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlans));
    setCurrentPlan(updatedPlan);
  };

  // --- Views ---

  const renderDashboard = () => (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="bg-brand-surface rounded-3xl p-8 md:p-12 shadow-soft mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-secondary/20 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-primary/10 rounded-full blur-2xl -ml-12 -mb-12 transition-transform group-hover:scale-110"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-left md:w-2/3">
             <div className="inline-flex items-center gap-2 bg-brand-secondary/30 px-3 py-1 rounded-full text-brand-text text-sm font-semibold mb-4">
                <ChefHat size={16} className="text-brand-primary" />
                <span>AI Chef Assistant</span>
             </div>
             <h1 className="text-2xl md:text-6xl font-black tracking-tight text-brand-text mb-4">
               {t.appTitle}
             </h1>
             <p className="text-brand-text/70 text-lg mb-8 max-w-md font-medium leading-relaxed">
               {t.subtitle}
             </p>
             <div className="flex flex-col sm:flex-row items-center gap-4">
               <button 
                 onClick={() => setView('creatorOptions')}
                 className="w-full sm:w-auto bg-brand-primary hover:bg-brand-primaryDark text-white px-8 py-4 rounded-full font-bold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
               >
                 <Plus size={22} strokeWidth={3} />
                 {t.startNew}
               </button>
             </div>
          </div>
          <div className="hidden md:block md:w-1/3 flex justify-center">
             <div className="relative">
               <div className="absolute inset-0 bg-brand-secondary rounded-full blur-xl opacity-40"></div>
               <ChefHat size={160} className="text-brand-primary relative z-10 drop-shadow-lg" />
               <UtensilsCrossed size={60} className="text-brand-text absolute -bottom-4 -right-4 z-20 bg-brand-bg p-4 rounded-full shadow-soft" />
             </div>
          </div>
        </div>
      </div>

      {/* Share the Joy Banner */}
      <div className="bg-gradient-to-r from-brand-primary to-brand-primaryDark rounded-2xl p-6 mb-12 flex items-center justify-between shadow-soft text-white relative overflow-hidden">
         {/* decorative background shapes */}
         <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_50%_120%,#fff_0%,transparent_50%)]"></div>
         <div className="relative z-10 flex items-center gap-4 mx-auto md:mx-0">
            <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
               <Heart size={24} className="text-white" fill="currentColor" />
            </div>
            <span className="font-black text-xl md:text-2xl tracking-wide uppercase">
               {t.shareJoy}
            </span>
         </div>
         <div className="hidden md:flex relative z-10 gap-3 opacity-80 mr-4">
            <Utensils size={24} />
            <Smile size={24} />
         </div>
      </div>

      {/* History */}
      <div className="space-y-6">
        <h2 className="text-xl md:text-2xl font-bold text-brand-text flex items-center gap-3 px-2">
          <History className="text-brand-primary" />
          {t.history}
        </h2>
        
        {plans.length === 0 ? (
          <div className="text-center py-20 bg-brand-surface rounded-3xl border-2 border-dashed border-brand-secondary/50">
            <p className="text-brand-muted text-lg font-medium">{t.noHistory}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div 
                key={plan.id} 
                onClick={() => openPlan(plan)}
                className="bg-brand-surface p-6 rounded-3xl shadow-soft hover:shadow-hover transition-all cursor-pointer group relative border border-transparent hover:border-brand-secondary/30"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-xl text-brand-text line-clamp-1">{plan.title}</h3>
                  <div className="bg-brand-bg px-3 py-1 rounded-full text-xs text-brand-muted font-bold tracking-wide">
                    {new Date(plan.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="space-y-2 text-sm text-brand-text/70 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="bg-brand-secondary/20 p-1 rounded-md">👥</span> {plan.guestCount} {t.guests === '用餐人數' ? '人' : 'Guests'}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-brand-primary/20 p-1 rounded-md">⏱️</span> {plan.totalEstimatedTimeMinutes} {t.minutes}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-brand-bg">
                  <span className="text-brand-primary text-sm font-bold group-hover:underline flex items-center gap-1">
                    {t.open} <ArrowRight size={16} />
                  </span>
                  <button 
                    onClick={(e) => deletePlan(plan.id, e)}
                    className="text-brand-muted hover:text-red-400 hover:bg-red-50 p-2 rounded-full transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCreatorOptions = () => (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <button 
        onClick={() => setView('dashboard')}
        className="mb-8 text-brand-text/60 hover:text-brand-primary flex items-center gap-2 transition-colors font-bold"
      >
        <ArrowLeft size={20} /> {t.back}
      </button>

      <div className="bg-brand-surface rounded-3xl shadow-soft p-10 relative overflow-hidden text-center">
        <h2 className="text-3xl font-black text-brand-text mb-10">
          {t.creatorOptionTitle}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => { setCreatorMode('normal'); setView('creator'); }}
            className="flex flex-col items-center p-8 bg-brand-bg rounded-3xl border border-transparent hover:border-brand-primary/30 hover:shadow-hover transition-all group"
          >
            <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="text-3xl">🍳</span>
            </div>
            <h3 className="text-xl font-bold text-brand-text mb-3">{t.optionSpecificDishes}</h3>
            <p className="text-brand-text/70 text-sm font-medium leading-relaxed">
              {t.optionSpecificDishesDesc}
            </p>
          </button>

          <button 
            onClick={() => { setCreatorMode('clearFridge'); setView('creator'); }}
            className="flex flex-col items-center p-8 bg-blue-50/50 rounded-3xl border border-transparent hover:border-blue-400/30 hover:shadow-hover transition-all group"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="text-3xl">❄️</span>
            </div>
            <h3 className="text-xl font-bold text-brand-text mb-3">{t.optionClearFridge}</h3>
            <p className="text-brand-text/70 text-sm font-medium leading-relaxed">
              {t.optionClearFridgeDesc}
            </p>
          </button>
        </div>
      </div>
    </div>
  );

  const renderCreator = () => (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <button 
        onClick={() => setView('creatorOptions')}
        className="mb-8 text-brand-text/60 hover:text-brand-primary flex items-center gap-2 transition-colors font-bold"
      >
        <ArrowLeft size={20} /> {t.back}
      </button>

      <div className="bg-brand-surface rounded-3xl shadow-soft p-10 relative overflow-hidden">
        {loading && (
           <div className="absolute inset-0 bg-brand-surface/95 z-20 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300 backdrop-blur-sm">
              <div className="bg-brand-bg p-6 rounded-full shadow-soft mb-6 relative">
                 <Loader2 className="w-16 h-16 text-brand-primary animate-spin relative z-10" />
                 <div className="absolute inset-0 bg-brand-primary/20 blur-xl rounded-full animate-pulse"></div>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-brand-text mb-2">{t.generating}</h3>
              <p className="text-brand-text/70 text-lg animate-pulse font-medium max-w-md">{loadingStep}</p>
           </div>
        )}

        <h2 className="text-xl md:text-3xl font-black text-brand-text mb-8 flex items-center gap-3">
          <span className="bg-brand-secondary p-2 rounded-xl text-brand-text">{creatorMode === 'clearFridge' ? '❄️' : '📝'}</span>
          <span>{creatorMode === 'clearFridge' ? t.clearFridge : t.step1}</span>
        </h2>
        
        <div className="space-y-8">
          {/* Plan Name Input */}
          <div>
            <label className="block text-sm font-bold text-brand-text/80 mb-3 uppercase tracking-wide">
               {t.planName} <span className="text-brand-muted normal-case font-normal ml-1">({t.optional})</span>
            </label>
            <input 
              type="text" 
              value={planTitleInput}
              onChange={(e) => setPlanTitleInput(e.target.value)}
              placeholder={t.planNamePlaceholder}
              className="w-full p-4 bg-brand-bg border-none rounded-2xl focus:ring-4 focus:ring-brand-primary/20 outline-none transition-all text-lg font-medium placeholder-brand-muted/50 text-brand-text shadow-inner"
              disabled={loading}
            />
          </div>

          {/* Clear Fridge Ingredients Input */}
          {creatorMode === 'clearFridge' && (
            <>
              <div>
                <label className="block text-sm font-bold text-brand-text/80 mb-3 uppercase tracking-wide">
                   {t.fridgeIngredients}
                </label>
                <textarea 
                  value={fridgeIngredients}
                  onChange={(e) => setFridgeIngredients(e.target.value)}
                  placeholder={t.fridgeIngredientsPlaceholder}
                  className="w-full p-4 bg-brand-bg border-none rounded-2xl focus:ring-4 focus:ring-brand-primary/20 outline-none transition-all text-lg font-medium placeholder-brand-muted/50 text-brand-text shadow-inner min-h-[100px] resize-y"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-text/80 mb-3 uppercase tracking-wide">
                  {t.expectedTime}
                </label>
                <input 
                  type="number"
                  min={1} 
                  value={expectedTime}
                  onChange={(e) => setExpectedTime(e.target.value)}
                  placeholder={t.expectedTimePlaceholder}
                  className="w-full p-4 bg-brand-bg border-none rounded-2xl focus:ring-4 focus:ring-brand-primary/20 outline-none transition-all text-lg font-medium placeholder-brand-muted/50 text-brand-text shadow-inner"
                  disabled={loading}
                />
              </div>
            </>
          )}

          <div className="space-y-4">
            <label className="block text-sm font-bold text-brand-text/80 mb-3 uppercase tracking-wide">
              {t.dishes} {creatorMode === 'clearFridge' && <span className="text-brand-muted normal-case font-normal ml-1">({t.optional})</span>}
            </label>
            {dishesInput.map((dish, index) => (
              <div key={dish.id} className="flex flex-col gap-3 bg-brand-bg p-4 rounded-2xl shadow-inner relative group border border-transparent hover:border-brand-primary/20 transition-colors">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <input 
                    type="text" 
                    value={dish.name}
                    onChange={(e) => {
                      const newDishes = [...dishesInput];
                      newDishes[index].name = e.target.value;
                      setDishesInput(newDishes);
                    }}
                    placeholder={t.dishNamePlaceholder || t.dishName}
                    className="w-full sm:w-1/2 p-3 bg-white border-none rounded-xl focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all text-base font-medium placeholder-brand-muted/50 text-brand-text shadow-sm"
                    disabled={loading}
                  />
                  <input 
                    type="text" 
                    value={dish.requirements}
                    onChange={(e) => {
                      const newDishes = [...dishesInput];
                      newDishes[index].requirements = e.target.value;
                      setDishesInput(newDishes);
                    }}
                    placeholder={t.dishRequirementsPlaceholder || t.dishRequirements}
                    className="w-full sm:w-1/2 p-3 bg-white border-none rounded-xl focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all text-base font-medium placeholder-brand-muted/50 text-brand-text shadow-sm"
                    disabled={loading}
                  />
                </div>
                <input 
                  type="text" 
                  value={dish.youtubeUrl || ''}
                  onChange={(e) => {
                    const newDishes = [...dishesInput];
                    newDishes[index].youtubeUrl = e.target.value;
                    setDishesInput(newDishes);
                  }}
                  placeholder={t.youtubePlaceholder || "YouTube Recipe Link (Optional) 📺"}
                  className="w-full p-3 bg-white border-none rounded-xl focus:ring-2 focus:ring-red-400/30 outline-none transition-all text-base font-medium placeholder-brand-muted/50 text-brand-text shadow-sm"
                  disabled={loading}
                />
                {dishesInput.length > 1 && (
                  <button 
                    onClick={() => setDishesInput(dishesInput.filter(d => d.id !== dish.id))}
                    className="absolute -right-3 -top-3 bg-red-100 text-red-500 rounded-full p-1.5 opacity-0 sm:opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-200"
                    title={t.removeDish}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setDishesInput([...dishesInput, { id: Date.now().toString(), name: '', requirements: '', youtubeUrl: '' }])}
              className="mt-2 text-sm font-bold text-brand-primary hover:text-brand-primaryDark flex items-center gap-1 transition-colors bg-brand-primary/10 px-4 py-2 rounded-full"
              disabled={loading}
            >
              <Plus size={16} strokeWidth={3} />
              {t.addDish}
            </button>
          </div>

          <div>
            <label className="block text-sm font-bold text-brand-text/80 mb-3 uppercase tracking-wide">
               {t.remarks} <span className="text-brand-muted normal-case font-normal ml-1">({t.optional})</span>
            </label>
            <textarea 
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={t.remarksPlaceholder}
              rows={3}
              className="w-full p-4 bg-brand-bg border-none rounded-2xl focus:ring-4 focus:ring-brand-primary/20 outline-none transition-all text-lg font-medium placeholder-brand-muted/50 text-brand-text shadow-inner resize-none"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-bold text-brand-text/80 mb-3 uppercase tracking-wide">{t.guests}</label>
              <input 
                type="number" 
                min={1}
                value={headcount}
                onChange={(e) => setHeadcount(parseInt(e.target.value))}
                className="w-full p-4 bg-brand-bg border-none rounded-2xl focus:ring-4 focus:ring-brand-primary/20 outline-none transition-all text-lg font-medium text-brand-text shadow-inner"
                disabled={loading}
              />
            </div>
            
            {/* Side Dish Counter Input */}
            <div>
              <label className="block text-sm font-bold text-brand-text/80 mb-3 uppercase tracking-wide">{t.sideDishCount}</label>
              <div className="flex items-center justify-between bg-brand-bg p-2 rounded-2xl shadow-inner border border-transparent">
                 <button 
                   onClick={() => setSideDishCount(Math.max(0, sideDishCount - 1))}
                   disabled={loading || sideDishCount <= 0}
                   className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm hover:shadow-md text-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                 >
                   <Minus size={20} strokeWidth={3} />
                 </button>
                 <span className="font-black text-xl text-brand-text w-8 text-center">{sideDishCount}</span>
                 <button 
                   onClick={() => setSideDishCount(Math.min(5, sideDishCount + 1))}
                   disabled={loading || sideDishCount >= 5}
                   className="w-10 h-10 flex items-center justify-center bg-brand-primary text-white rounded-xl shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                 >
                   <Plus size={20} strokeWidth={3} />
                 </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-brand-text/80 mb-3 uppercase tracking-wide">
              {t.dietary} <span className="text-brand-muted normal-case font-normal ml-1">({t.optional})</span>
            </label>
            <input 
              type="text" 
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              placeholder="e.g., No nuts, Vegetarian guest"
              className="w-full p-4 bg-brand-bg border-none rounded-2xl focus:ring-4 focus:ring-brand-primary/20 outline-none transition-all text-lg font-medium placeholder-brand-muted/50 text-brand-text shadow-inner"
              disabled={loading}
            />
          </div>

          <button 
            onClick={handleGenerate}
            disabled={loading || (creatorMode === 'normal' ? dishesInput.filter(d => d.name.trim() !== '').length === 0 : fridgeIngredients.trim() === '' && dishesInput.filter(d => d.name.trim() !== '').length === 0)}
            className={`w-full py-5 rounded-full font-black text-lg flex items-center justify-center gap-3 transition-all mt-6
              ${(loading || (creatorMode === 'normal' ? dishesInput.filter(d => d.name.trim() !== '').length === 0 : fridgeIngredients.trim() === '' && dishesInput.filter(d => d.name.trim() !== '').length === 0)) 
                ? 'bg-brand-bg text-brand-muted cursor-not-allowed' 
                : 'bg-brand-primary hover:bg-brand-primaryDark text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1'}`}
          >
            <ChefHat size={24} />
            {t.generatePlan}
          </button>
        </div>
      </div>
    </div>
  );

  const renderAssistant = () => {
    if (!currentPlan) return null;

    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
          <button 
            onClick={() => setView('dashboard')}
            className="text-brand-text/70 hover:text-brand-primary flex items-center gap-2 transition-colors font-bold bg-brand-surface px-5 py-3 rounded-full shadow-soft hover:shadow-hover self-start md:self-auto shrink-0"
          >
            <ArrowLeft size={20} /> {t.back}
          </button>
          <div className="flex flex-col items-end w-full md:w-auto overflow-hidden">
            <input 
              type="text" 
              value={currentPlan.title}
              onChange={(e) => {
                const updatedPlan = { ...currentPlan, title: e.target.value };
                setCurrentPlan(updatedPlan);
                const updatedPlans = plans.map(p => p.id === updatedPlan.id ? updatedPlan : p);
                setPlans(updatedPlans);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlans));
              }}
              className="text-xl sm:text-3xl md:text-4xl font-black text-brand-text mb-2 bg-transparent border-b-2 border-transparent hover:border-brand-primary/30 focus:border-brand-primary focus:outline-none transition-colors text-right w-full md:min-w-[300px]"
              dir="auto"
            />
            <div className="flex flex-wrap items-center justify-end gap-3 text-brand-text/70 font-semibold mt-1">
               <span className="bg-brand-secondary/20 px-3 py-1 rounded-full whitespace-nowrap">👥 {currentPlan.guestCount} {t.guests === '用餐人數 👥' ? '人' : 'Guests'}</span>
               <span className="bg-brand-primary/20 px-3 py-1 rounded-full whitespace-nowrap">⏱️ {currentPlan.totalEstimatedTimeMinutes} {t.minutes}</span>
               <button 
                 onClick={() => setIsRegenModalOpen(true)}
                 className="bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                 title={t.regenerate}
               >
                 🔄 <span className="hidden sm:inline">{t.regenerate}</span>
               </button>
               
               {currentPlan.previousVersions && currentPlan.previousVersions.length > 0 && (
                 <div className="relative group">
                   <button className="bg-brand-bg border border-brand-primary/20 text-brand-text px-3 py-1 rounded-full transition-colors flex items-center gap-1">
                     <History size={16} /> {t.versionHistory} <ChevronDown size={14} />
                   </button>
                   <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-brand-primary/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                     <div className="p-2 max-h-60 overflow-y-auto">
                       <div className="px-3 py-2 bg-brand-primary/5 rounded-lg mb-1 border border-brand-primary/20 cursor-default">
                         <div className="font-bold text-sm">{t.currentVersion}</div>
                         <div className="text-xs text-brand-text/60">{currentPlan.regenInstruction || 'Initial Generation'}</div>
                       </div>
                       {currentPlan.previousVersions.map((v, i) => (
                         <div key={i} className="px-3 py-2 hover:bg-brand-bg rounded-lg cursor-pointer border border-transparent hover:border-brand-primary/10 transition-colors" onClick={() => handleRollback(v)}>
                           <div className="flex justify-between items-center">
                              <span className="font-bold text-sm">V{currentPlan.previousVersions!.length - i}</span>
                              <span className="text-xs font-semibold text-brand-primary">{t.rollback}</span>
                           </div>
                           <div className="text-xs text-brand-text/60 truncate">{v.regenInstruction || 'Initial Generation'}</div>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
               )}
            </div>
          </div>
        </div>

        {isRegenModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 sm:p-8 rounded-3xl max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95">
              <button 
                onClick={() => setIsRegenModalOpen(false)}
                className="absolute top-4 right-4 text-brand-muted hover:text-brand-text bg-brand-bg p-2 rounded-full transition-colors"
                disabled={loading}
              >
                <UtensilsCrossed size={20} />
              </button>
              <h2 className="text-xl sm:text-2xl font-black mb-4 text-brand-text pr-8">{t.regenerate}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-brand-text/80 mb-2 uppercase tracking-wide">{t.regenInstructions}</label>
                  <textarea 
                    value={regenInstruction}
                    onChange={(e) => setRegenInstruction(e.target.value)}
                    placeholder={t.regenInstructionsPlaceholder}
                    rows={4}
                    className="w-full p-4 bg-brand-bg border border-transparent rounded-2xl focus:border-brand-primary/30 focus:ring-4 focus:ring-brand-primary/20 outline-none transition-all text-base font-medium placeholder-brand-muted/50 text-brand-text shadow-inner resize-none"
                    disabled={loading}
                  />
                </div>
                <button
                  onClick={handleRegenerate}
                  disabled={!regenInstruction.trim() || loading}
                  className={`w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-2 transition-all mt-2
                    ${!regenInstruction.trim() || loading 
                      ? 'bg-brand-bg text-brand-muted cursor-not-allowed' 
                      : 'bg-brand-primary hover:bg-brand-primaryDark text-white shadow-md hover:shadow-lg'}`}
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : '✨'}
                  {loading ? t.generating : t.regenConfirm}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Action Buttons for Collapsed Sections */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <button
              onClick={() => setIsOverviewOpen(!isOverviewOpen)}
              className={`flex-1 p-4 rounded-2xl font-bold flex items-center justify-between transition-all border-2 ${isOverviewOpen ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'bg-brand-surface border-transparent text-brand-text/80 hover:bg-white hover:border-brand-primary/30 hover:shadow-soft'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🍱</span>
                <span>{t.overview}</span>
              </div>
              {isOverviewOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            <button
              onClick={() => setIsShoppingListOpen(!isShoppingListOpen)}
              className={`flex-1 p-4 rounded-2xl font-bold flex items-center justify-between transition-all border-2 ${isShoppingListOpen ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'bg-brand-surface border-transparent text-brand-text/80 hover:bg-white hover:border-brand-primary/30 hover:shadow-soft'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🛒</span>
                <span>{t.shoppingList}</span>
              </div>
              {isShoppingListOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {/* Collapsible Overview Content */}
          {isOverviewOpen && (
            <div className="bg-brand-surface p-8 rounded-3xl shadow-soft animate-in slide-in-from-top-4 relative z-20">
               <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {currentPlan.recipes.map(r => (
                   <RecipeCard key={r.id} recipe={r} language={language} config={{ provider: aiProvider, model: aiProvider === 'gemini' ? geminiModel : openRouterModel, apiKey: aiProvider === 'gemini' ? geminiApiKey : openRouterApiKey }} />
                 ))}
               </div>
            </div>
          )}

          {/* Collapsible Shopping List Content */}
          {isShoppingListOpen && (
            <div className="animate-in slide-in-from-top-4 relative z-10">
              <ShoppingList ingredients={currentPlan.shoppingList} language={language} />
            </div>
          )}

          {/* Core Display: Timeline & Steps Toggler */}
          <div className="space-y-6 pt-4 border-t-2 border-brand-primary/10 mt-8">
            {/* Tab Switcher */}
            <div className="flex bg-brand-surface p-1.5 rounded-2xl shadow-sm w-full sm:w-auto sm:inline-flex mx-auto">
              <button 
                onClick={() => setActiveTab('timeline')}
                className={`flex-1 sm:flex-none px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'timeline' 
                    ? 'bg-brand-primary text-white shadow-md' 
                    : 'text-brand-text/60 hover:bg-brand-bg'
                }`}
              >
                <Clock size={18} />
                {t.viewTimeline}
              </button>
              <button 
                onClick={() => setActiveTab('steps')}
                className={`flex-1 sm:flex-none px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'steps' 
                    ? 'bg-brand-primary text-white shadow-md' 
                    : 'text-brand-text/60 hover:bg-brand-bg'
                }`}
              >
                <List size={18} />
                {t.viewSteps}
              </button>
            </div>

            {/* View Content */}
            {activeTab === 'timeline' ? (
              <CookingTimeline 
                events={currentPlan.timeline} 
                totalMinutes={currentPlan.totalEstimatedTimeMinutes}
                language={language}
              />
            ) : (
              <div className="bg-brand-surface p-8 rounded-3xl shadow-soft animate-in fade-in slide-in-from-bottom-4 duration-300 transition-all max-w-4xl mx-auto">
                 <div 
                   className="flex items-center justify-between cursor-pointer group mb-2" 
                   onClick={() => setIsStepsCollapsed(!isStepsCollapsed)}
                 >
                   <h3 className="font-black text-brand-text text-xl flex items-center gap-2">
                     <span>👣</span> {t.steps}
                   </h3>
                   <button className="text-brand-muted hover:text-brand-text transition-colors">
                      {isStepsCollapsed ? <ChevronDown size={24} /> : <ChevronUp size={24} />}
                   </button>
                 </div>
                 
                 {!isStepsCollapsed && (
                   <div className="space-y-8 animate-in slide-in-from-top-4 duration-300 pt-4">
                     {(() => {
                        const eventsByDay = currentPlan.timeline.reduce((acc, event) => {
                          const day = event.day || 1;
                          if (!acc[day]) acc[day] = [];
                          acc[day].push(event);
                          return acc;
                        }, {} as Record<number, TimelineEvent[]>);
                        
                        const days = Object.keys(eventsByDay).map(Number).sort((a,b) => a - b);
                        
                        return days.map(day => {
                          const dayEvents = eventsByDay[day].sort((a,b) => a.startTimeOffset - b.startTimeOffset);
                          const byPhase = dayEvents.reduce((acc, event) => {
                            const p = event.phase || 'other';
                            if (!acc[p]) acc[p] = [];
                            acc[p].push(event);
                            return acc;
                          }, {} as Record<string, TimelineEvent[]>);
                          
                          const phaseLabels = {
                            preparation: t.phasePrep,
                            partial_cooking: t.phasePartial,
                            final_cooking: t.phaseFinal
                          };

                          return (
                           <div key={day} className="space-y-6">
                             {days.length > 1 && (
                               <h4 className="text-lg font-bold text-brand-primary mb-2 ml-12 bg-brand-primary/10 inline-block px-3 py-1 rounded-lg">Day {day}</h4>
                             )}
                             
                             {['preparation', 'partial_cooking', 'final_cooking', 'other'].map(phase => {
                               if (!byPhase[phase] || byPhase[phase].length === 0) return null;
                               return (
                                 <div key={phase} className="space-y-1">
                                   {phase !== 'other' && (
                                     <h5 className="font-bold text-brand-text/80 text-sm tracking-widest uppercase ml-24 mb-2 mt-4">{phaseLabels[phase as keyof typeof phaseLabels]}</h5>
                                   )}
                                   {byPhase[phase].map((event, idx) => (
                                     <div key={idx} className="flex gap-5 p-4 hover:bg-brand-bg rounded-2xl transition-all group">
                                        <div className="min-w-[80px] flex flex-col items-end pt-1">
                                          <span className="text-lg font-bold text-brand-text">T+{event.startTimeOffset}</span>
                                          <span className="text-xs text-brand-muted font-mono">{event.duration}m</span>
                                        </div>
                                        
                                        {/* Timeline Line Decorator */}
                                        <div className="relative flex flex-col items-center">
                                          <div className={`w-4 h-4 rounded-full z-10 
                                             ${event.type === 'active' ? 'bg-brand-primary shadow-[0_0_10px_rgba(255,158,115,0.6)]' : 'bg-brand-secondary'}`} 
                                          />
                                          {idx !== byPhase[phase].length - 1 && (
                                            <div className="w-0.5 bg-brand-bg flex-grow absolute top-4 bottom-[-16px]"></div>
                                          )}
                                        </div>

                                        <div className="pb-4 w-full">
                                          <div className="font-bold text-brand-text text-lg leading-snug">
                                             {event.task}
                                          </div>
                                          <div className="text-sm text-brand-muted mt-2 flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-brand-text/70 bg-brand-bg px-3 py-1 rounded-lg text-xs">
                                              {event.recipeName}
                                            </span>
                                             {event.critical && (
                                               <span className="text-xs text-brand-primary font-bold flex items-center gap-1 bg-brand-primary/5 px-2 py-1 rounded-full">
                                                 ⚡ Critical Path
                                               </span>
                                             )}
                                          </div>
                                        </div>
                                     </div>
                                   ))}
                                 </div>
                               );
                             })}
                           </div>
                        );
                        });
                     })()}
                   </div>
                 )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-bg pb-20 font-sans flex flex-col">
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        language={language}
        initialOpenRouterModel={openRouterModel}
        initialOpenRouterApiKey={openRouterApiKey}
      />

      {/* Header */}
      <header className="bg-brand-surface/80 backdrop-blur-md sticky top-0 z-50 shadow-sm flex-none">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group min-w-0" onClick={() => setView('dashboard')}>
            <div className="bg-brand-primary text-white p-2 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-brand-primary/30 shrink-0">
               <ChefHat size={24} />
            </div>
            <span className="font-black text-[1.1rem] sm:text-lg md:text-2xl text-brand-text tracking-tight truncate">
              {t.appTitle}
            </span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              disabled={loading}
              className={`w-10 h-10 flex items-center justify-center rounded-full bg-brand-bg hover:bg-brand-secondary/30 text-brand-text/70 hover:text-brand-text transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Settings size={20} />
            </button>

            <button 
              onClick={() => setLanguage(l => l === 'en' ? 'zh-TW' : 'en')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-bg hover:bg-brand-secondary/30 text-brand-text text-sm font-bold transition-colors shadow-soft"
            >
              <Globe size={18} />
              {language === 'en' ? 'English' : '繁體中文'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {view === 'dashboard' && renderDashboard()}
        {view === 'creatorOptions' && renderCreatorOptions()}
        {view === 'creator' && renderCreator()}
        {view === 'assistant' && renderAssistant()}
        {view === 'privacy' && <PrivacyPolicy onBack={() => setView('dashboard')} language={language} />}
        {view === 'terms' && <TermsConditions onBack={() => setView('dashboard')} language={language} />}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-brand-muted/70 font-medium border-t border-brand-secondary/10 flex-none flex flex-col gap-3">
        <p>{t.copyright} {t.developedBy} <span className="text-brand-primary font-bold">MickeyYKM</span></p>
        <div className="flex justify-center gap-4">
          <button onClick={() => setView('privacy')} className="hover:text-brand-primary transition-colors hover:underline">
             {t.privacyPolicy}
          </button>
          <button onClick={() => setView('terms')} className="hover:text-brand-primary transition-colors hover:underline">
             {t.termsConditions}
          </button>
        </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);