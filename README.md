<div align="center">
  <img src="./public/icon.png" alt="Forma Workspace" width="128" />
  <br/>
  <h1>Forma Workspace</h1>
  <p><strong>A beautiful, local-first project management system designed for creative professionals.</strong></p>

  [![Version](https://img.shields.io/badge/version-1.1.5-blue.svg)]()
  [![License](https://img.shields.io/badge/license-MIT-green.svg)]()
  [![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)]()
</div>

<br/>

## 🌟 Overview

Forma Workspace is a deeply integrated, desktop-native workspace application built with Next.js and Electron. It brings order to the chaos of creative projects by seamlessly bridging the gap between high-level project management and low-level file organization. 

Unlike traditional cloud tools, **Forma is completely local-first**. It generates physical folders on your hard drive, storing all data natively. No cloud syncs, no subscription fees, and absolute data privacy.

## ✨ Features

- **📂 Local-First Architecture:** Complete data sovereignty. All projects, clients, and notes are stored locally on your machine in a transparent JSON format.
- **🎨 Beautiful UI:** A stunning, highly polished interface with meticulously designed Light and Dark modes.
- **📊 Kanban Project Tracking:** Intuitive drag-and-drop boards to track the lifecycle of your projects.
- **🗂️ Automated File Management:** Automatically scaffolds standardized folder structures (Design, Assets, Exports, etc.) directly on your local hard drive when a new project is created.
- **💼 Invoicing & Proposals:** Generate beautiful, professional PDF invoices and reports directly within the application.
- **⚡ Command Palette:** Navigate anywhere instantly using `Cmd + K`.
- **🔐 Privacy by Default:** No telemetry, no analytics, no external servers. Your data never leaves your machine.

## 🚀 Getting Started

### Prerequisites

Ensure you have Node.js 20+ installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Aadi-Coder303/Forma-workspace.git
   cd Forma-workspace
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application in development mode:
   ```bash
   npm run electron:dev
   ```

### Building for macOS

To package the application into a standalone universal macOS `.dmg`:

```bash
npm run electron:build
```
The resulting `.dmg` file will be located in the `dist/` directory.

## 🛠️ Technology Stack

Forma Workspace is built on a modern, robust technology stack:
- **Framework:** Next.js (App Router)
- **Desktop Runtime:** Electron
- **Styling:** Tailwind CSS 
- **Icons:** Lucide React
- **Drag & Drop:** dnd-kit

## 🛡️ Privacy & Security

We believe your workspace should be your own. Forma Workspace is built entirely on local-first principles. We do not track usage, we do not require an account, and we do not sync your files to any proprietary cloud service. You own your data in its entirety. For more information, please see our Privacy Policy and Data Compliance documents within the app settings.

## 📄 License

This project is licensed under the MIT License.
