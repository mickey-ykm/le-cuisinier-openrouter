import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { Language } from '../types';

interface Props {
  onBack: () => void;
  language: Language;
}

export const PrivacyPolicy: React.FC<Props> = ({ onBack, language }) => {
  const content = {
    en: {
      title: "Privacy Policy",
      lastUpdated: "Last updated: January 2026",
      introTitle: "1. Introduction",
      intro: "Welcome to Le cuisinier (\"we,\" \"our,\" or \"us\"). We are committed to protecting your privacy. This Privacy Policy explains how your information is collected, used, and disclosed by Le cuisinier.",
      collectTitle: "2. Information We Collect",
      collectIntro: "We collect information you provide directly to us when using the application, including:",
      collectList: [
        "User Inputs: Dish names, dietary restrictions, headcount, and other cooking preferences entered into the planner.",
        "API Keys: If provided, your Google Gemini API key is stored locally on your device via your browser's Local Storage. We do not transmit this key to our own servers."
      ],
      useTitle: "3. How We Use Information",
      useIntro: "We use the information we collect to:",
      useList: [
        "Generate meal plans, recipes, and shopping lists using Artificial Intelligence (Google Gemini).",
        "Maintain your cooking history locally on your device."
      ],
      shareTitle: "4. Data Sharing and AI",
      share: "This application utilizes Google Gemini API and Google Search to generate content. The text prompts you enter (e.g., dish names, dietary needs) are sent to Google's servers for processing. Please refer to Google's Privacy Policy regarding how they handle data sent to their AI services.",
      storageTitle: "5. Data Storage",
      storage: "Local Storage: Your cooking history and settings (including API keys) are stored locally on your device. We do not maintain a central database of your personal meal plans.",
      contactTitle: "6. Contact Us",
      contact: "If you have any questions about this Privacy Policy, please contact us at:",
      back: "Back",
      versionNote: "If there is any inconsistency between the Chinese and English versions of this Privacy Policy, the English version shall prevail."
    },
    'zh-TW': {
      title: "隱私權政策",
      lastUpdated: "最後更新：2026年1月",
      introTitle: "1. 簡介",
      intro: "歡迎來到 Le cuisinier（以下簡稱「我們」）。我們致力於保護您的隱私。本隱私權政策說明 Le cuisinier 如何收集、使用和揭露您的資訊。",
      collectTitle: "2. 我們收集的資訊",
      collectIntro: "我們收集您在使用應用程式時直接提供的資訊，包括：",
      collectList: [
        "使用者輸入：輸入到計畫中的菜餚名稱、飲食限制、人數和其他烹飪偏好。",
        "API 金鑰：如果提供，您的 Google Gemini API 金鑰將透過瀏覽器的本地存儲（Local Storage）儲存在您的裝置上。我們不會將此金鑰傳輸到我們自己的伺服器。"
      ],
      useTitle: "3. 我們如何使用資訊",
      useIntro: "我們使用收集的資訊來：",
      useList: [
        "使用人工智慧（Google Gemini）生成膳食計畫、食譜和購物清單。",
        "在您的裝置上維護您的烹飪紀錄。"
      ],
      shareTitle: "4. 資料分享與 AI",
      share: "本應用程式利用 Google Gemini API 和 Google 搜尋來生成內容。您輸入的文字提示（例如：菜餚名稱、飲食需求）將發送到 Google 的伺服器進行處理。請參閱 Google 的隱私權政策，以了解他們如何處理發送到其 AI 服務的數據。",
      storageTitle: "5. 資料儲存",
      storage: "本地儲存：您的烹飪紀錄和設定（包括 API 金鑰）均儲存在您的裝置上。我們不維護您個人膳食計畫的中央資料庫。",
      contactTitle: "6. 聯絡我們",
      contact: "如果您對本隱私權政策有任何疑問，請聯繫我們：",
      back: "返回",
      versionNote: "本隱私權政策若有中英文版本不一致之處，以英文版本為準。"
    }
  };

  const t = content[language];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <button
        onClick={onBack}
        className="mb-8 text-brand-text/60 hover:text-brand-primary flex items-center gap-2 transition-colors font-bold bg-brand-surface px-4 py-2 rounded-full shadow-sm hover:shadow-md"
      >
        <ArrowLeft size={20} /> {t.back}
      </button>

      <div className="bg-brand-surface rounded-3xl shadow-soft p-8 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4 mb-8 border-b border-brand-primary/10 pb-6">
            <div className="bg-brand-primary/10 p-4 rounded-2xl text-brand-primary">
                <Shield size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-brand-text">{t.title}</h1>
              <p className="font-medium text-sm text-brand-muted mt-1">{t.lastUpdated}</p>
            </div>
        </div>

        <div className="space-y-8 text-brand-text/80 leading-relaxed">
            <section>
                <h2 className="text-xl font-bold text-brand-text mb-3 flex items-center gap-2">
                  {t.introTitle}
                </h2>
                <p>{t.intro}</p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-brand-text mb-3 flex items-center gap-2">
                  {t.collectTitle}
                </h2>
                <p className="mb-2">{t.collectIntro}</p>
                <ul className="list-disc pl-5 space-y-2 bg-brand-bg p-4 rounded-xl">
                    {t.collectList.map((item, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: item.replace(':', '</strong>:').replace('：', '</strong>：').replace(/^/, '<strong>') }} />
                    ))}
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-bold text-brand-text mb-3 flex items-center gap-2">
                  {t.useTitle}
                </h2>
                <p className="mb-2">{t.useIntro}</p>
                <ul className="list-disc pl-5 space-y-2 bg-brand-bg p-4 rounded-xl">
                    {t.useList.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-bold text-brand-text mb-3 flex items-center gap-2">
                   {t.shareTitle}
                </h2>
                <p>{t.share}</p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-brand-text mb-3 flex items-center gap-2">
                   {t.storageTitle}
                </h2>
                <p dangerouslySetInnerHTML={{ __html: t.storage.replace(':', '</strong>:').replace('：', '</strong>：').replace(/^/, '<strong>') }} />
            </section>

            <section>
                <h2 className="text-xl font-bold text-brand-text mb-3 flex items-center gap-2">
                   {t.contactTitle}
                </h2>
                <p>{t.contact}</p>
                <a href="mailto:admin@mickey-calligraphy.art" className="inline-block mt-2 font-bold text-brand-primary bg-brand-primary/10 px-4 py-2 rounded-lg hover:bg-brand-primary hover:text-white transition-colors">
                  admin@mickey-calligraphy.art
                </a>
            </section>

            {language !== 'en' && (
              <section className="pt-6 border-t border-brand-muted/20">
                 <p className="text-sm text-brand-muted italic">
                   {t.versionNote}
                 </p>
              </section>
            )}
        </div>
      </div>
    </div>
  );
};