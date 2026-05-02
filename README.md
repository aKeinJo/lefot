# Lefot: LLM environment for optimized translation

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)

---

## Demo

> Coming soon

---

## Overview

LLM-generated translations are more natural than those from existing machine translation services like Google Translate and DeepL. However, the chat-based UI of most existing LLM services is not well-suited for translation tasks. We need an LLM environment focused specifically on translation.

Lefot features a bilingual reader-style UI. The left side is the source text area where users can input text, and the right side displays the translation results.

The LLM is called twice in total. First, the main model focuses on performing the translation. Second, the auxiliary model structures and aligns the output into JSON. By offloading the JSON tasks from the main model, we prevent the degradation of intelligence reported when models are forced to output JSON and reduce costs by limiting unnecessary work.

## Key Features

- **2-Depth LLM Pipeline:** When a translation is performed, a separate model is called for sentence alignment.
- **Highlighting:** When you hover over a sentence, the corresponding sentence in the source text is also highlighted.
- **Chat-style Feedback:** You can click a highlighted sentence to request an explanation or suggest modifications for that specific sentence. Additionally, you can request a re-translation of only that specific sentence to avoid unnecessary calls.
- **Multiple Provider Support:** Currently supports Gemini, OpenAI, Anthropic official APIs, and all OpenAI-compatible endpoints.

### Backend
Currently, there is no separate server, and all data is managed within the user's browser. API keys are also sent directly to the providers without passing through a server, ensuring security. It supports project history, displaying a list of previous translations in the sidebar.

### Recommended Models
- Main Model: Gemini 3 Flash or higher intelligence models. For Chinese, open-source models being developed in China, such as DeepSeek V4 or Qwen3.6, are effective.
- Auxiliary Model: Gemini 3.1 Flash Lite or similar high-efficiency models.

## Getting Started

### Prerequisites

- Node.js v18 or higher
- At least one API key from a supported LLM provider

### Installation and Execution

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Upon first entry, you will need to enter an API Key. Please navigate to the /settings page.

---

## Tech Stack

- **Framework** — [Next.js](https://nextjs.org) 16 (App Router), React 19
- **Styling** — [Tailwind CSS](https://tailwindcss.com) v4, [shadcn/ui](https://ui.shadcn.com), Radix UI
- **State Management** — [Zustand](https://zustand-demo.pmnd.rs) with `localStorage` persistence
- **LLM SDKs** — `@google/generative-ai`, `@anthropic-ai/sdk`, `openai`

## License

[MIT](LICENSE) © 2026 ToddJo