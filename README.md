<a name="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

<br />
<div align="center">
  <a href="https://nexamind.vercel.app/">
    <img src="public/logo.jpg" alt="Logo" width="300" height="200">
  </a>

<h1 align="center">🚀 NexaMind</h1>

<h3 align="center">🧠 All-in-one AI Assistant Platform</h3>

  <p align="center">
    NexaMind is a powerful AI assistant platform featuring text chat, image generation, AI agents with collaboration capabilities, and decentralized storage, providing users with a comprehensive suite of AI-powered tools.
  </p>
  
  <p align="center">
   <a href="https://nexamind.gitbook.io/nexamind/">📖 View Docs</a>
    ·
    <a href="https://github.com/KPR-V/nexamind/issues/new?labels=bug&template=bug-report.md">🐛 Report Bug</a>
    ·
    <a href="https://github.com/KPR-V/nexamind/issues/new?labels=enhancement&template=feature-request.md">✨ Request Feature</a>
  </p>
</div>

## 🌟 Features

- **Advanced AI Chat**: Engage with multiple LLM models for natural language conversations
- **AI Agents System**: Create and customize specialized AI agents with different roles and capabilities
- **Multi-Agent Collaboration**: Combine multiple agents to solve complex tasks with collaborative workflows
- **Document-based Context**: Upload documents to provide context for your AI interactions
- **Image Generation**: Create AI-generated images with detailed prompts
- **Tool-Enhanced Responses**: Get up-to-date information through web search capabilities
- **Web3 Integration**: Connect your wallet for access to decentralized storage
- **Storacha Storage**: Securely store conversations and generated images on IPFS with encryption
- **Responsive Design**: Fully functional on both desktop and mobile devices
- **Multi-Model Support**: Choose from various LLM and image generation models
- **Web Search Support**: All LLMs have support for web search using Anura API

## 📋 Prerequisites

- Node.js (LTS recommended)
- NPM 
- Environment variables (see below)

## 🔧 Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/KPR-V/nexamind.git
   cd nexamind
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file in the project root and add the following environment variables:

   ```bash
   LILYPAD_API_KEY=your_lilypad_api_key
   GOOGLE_SEARCH_API_KEY=your_google_api_key
   GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
   NEXT_PUBLIC_ENCRYPTION_SALT=your_encryption_salt
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 📚 Usage

1. **Chat Interface**: Start a conversation with the AI by typing in the chat input.
2. **AI Agents**: Access the Agents Arena to:
   - Create custom agents with specific roles and specializations
   - Select tools for your agents (web search, image generation, etc.)
   - Upload documents for context-aware responses
   - Combine multiple agents for collaborative problem-solving
3. **Image Generation**: Toggle to image mode to generate images from text prompts.
4. **File Upload**: Upload documents for AI analysis and context-aware responses.
5. **Tool Usage**: Enable or disable web search capabilities for more accurate responses.
6. **Storage**: Connect your Web3 wallet to save conversations and images to Storacha.
7. **Model Selection**: Choose from various AI models based on your needs.

## 🔐 Storacha Storage

NexaMind uses a decentralized storage system called Storacha that:

- Stores your data encrypted with your wallet address as a key
- Provides permanent, decentralized storage for your conversations and generated images

## 📱 Responsive Design

NexaMind is fully responsive:

- Collapsible sidebar for desktop
- Mobile-friendly interface with adaptive layouts
- Optimized UI components for different screen sizes

## 📈 Dashboard

Access your stored content through the dashboard:

- View saved conversations
- Browse generated images
- Access uploaded files

## 📄 License

[MIT License](https://github.com/KPR-V/nexamind/blob/main/LICENSE.txt)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->

[contributors-shield]: https://img.shields.io/github/contributors/KPR-V/nexamind.svg?style=for-the-badge
[contributors-url]: https://github.com/KPR-V/nexamind/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/KPR-V/nexamind.svg?style=for-the-badge
[forks-url]: https://github.com/KPR-V/nexamind/network/members
[stars-shield]: https://img.shields.io/github/stars/KPR-V/nexamind.svg?style=for-the-badge
[stars-url]: https://github.com/KPR-V/nexamind/stargazers
[issues-shield]: https://img.shields.io/github/issues/KPR-V/nexamind.svg?style=for-the-badge
[issues-url]: https://github.com/KPR-V/nexamind/issues
[license-shield]: https://img.shields.io/github/license/KPR-V/Nexamind.svg?style=for-the-badge
[license-url]: https://github.com/KPR-V/nexamind/blob/main/LICENSE.txt
