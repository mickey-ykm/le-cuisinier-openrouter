# Le Cuisinier - AI-Powered Chef Planner

## Introduction
Le Cuisinier is an AI-powered chef planner designed to orchestrate your cooking. Whether you are cooking for your family or hosting a dinner party, planning courses and managing cooking times can be overwhelming. This app takes your desired dishes and generates a comprehensive cooking plan, complete with recipes, ingredient lists, and an execution timeline to ensure all your dishes are ready at the right time.

## How to Use

### 1. Setup API Key
This application uses OpenRouter to access various AI models for generating recipes and plans.
- Get an API key from [OpenRouter](https://openrouter.ai/).
- Open the **Settings ⚙️** menu in the top right corner of the application.
- Enter your OpenRouter API key.
- (Optional) Change the OpenRouter model. For example, you can use `google/gemini-2.5-flash` or `qwen/qwen-2.5-72b-instruct`.
- Click "Save Changes".

### 2. Create a Cooking Plan
- Enter a **Plan Name** (optional).
- List the **Dishes** you want to cook (e.g., "Beef Wellington", "Roasted Asparagus", "Mashed Potatoes").
- Provide any **Remarks** or special requests (e.g., "Make the mashed potatoes extra creamy").
- Set the **Guests** count.
- Set the number of **Additional Auto Side Dishes** you want the AI to suggest to complement your main dishes.
- Specify any **Dietary Restrictions** (e.g., "Gluten-free", "Nut allergy").
- Click **"Generate Plan"**.

The AI will research the recipes and structure a complete workflow for you.

## Features of the Cooking Plan

- **Dishes Overview**: Get a breakdown of each generated recipe, including estimated prep time, cooking time, and cuisine type.
- **Shopping List**: An aggregated list of all ingredients across all your selected dishes, helping you grocery shop efficiently.
- **Interactive Execution Timeline**: A detailed, step-by-step cooking schedule. It calculates the optimal order of operations to tell you exactly when to start each task so that everything is hot and ready at the same time.
- **Iterative Regeneration**: Not happy with a step, or missing an ingredient? Use the "Regenerate" feature to instruct the AI to adjust the plan, swap ingredients, or modify the cooking methods. You can also roll back to previous versions of your plan if needed.
- **Multilingual Support**: Switch seamlessly between English and Traditional Chinese (zh-TW) in the top navigation bar.
