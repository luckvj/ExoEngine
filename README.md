<div align="center">
  <img src="docs/images/banner.png" width="100%" alt="ExoEngine Banner"/>
  
  # ExoEngine™
  ### Destiny 2 Synergy Optimizer & Random Meta Generator
  
  [![Website](https://img.shields.io/badge/LIVE-exoengine.online-ff8df6?style=for-the-badge&logo=google-chrome&logoColor=white)](https://exoengine.online)
  [![GitHub](https://img.shields.io/badge/REPO-luckvj%2FExoEngine-lightgrey?style=for-the-badge&logo=github)](https://github.com/luckvj/ExoEngine)
  [![Twitter](https://img.shields.io/badge/CONTACT-@Unluckvj-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](https://twitter.com/Unluckvj)
</div>

---

## 🚀 Overview

**ExoEngine™** is a specialized tool designed specifically for **New Players** and **Chaos-Lovers**. While the Destiny community has incredible inventory managers, we built ExoEngine to solve the "What do I even run?" problem through visual synergy analysis and randomized buildcrafting.

> **Disclaimer:** This is **NOT** a replacement for DIM (Destiny Item Manager). DIM is the gold standard for inventory management. ExoEngine is a companion tool focused on build discovery and experiment-driven gameplay.

---

> [!IMPORTANT]
> **Developer Note:** I am currently developing this project on an aging PC that struggles with modern development workloads. If you enjoy ExoEngine and would like to support full-time development, donations are incredibly appreciated. 
> 
> **[Support Development via Ko-fi](https://ko-fi.com/unluckvj)**

---

## ✨ Key Features

### 🎰 Random Meta Generator (Chaos Mode)
For the Guardian who has everything but is bored of using it.
- **Chaos Engine:** Spin the wheel to get a randomized but functional Loadout (Exotic Armor + Exotic Weapon + Subclass).
- **Recommended Mods:** Every meta build now includes a curated set of **Recommended Armor Mods** (Siphons, Surges, Reaper) displayed directly in the UI.
- **Smart Filtering:** Filter by Class or Element while keeping the "chaos" of random item selection.

### � Synergy Optimizer
For the Guardian who doesn't know what to run.
- **Interaction Mapping:** We interpret complex API data into simple, beautiful "Synergy Cards".
- **Visual Learning:** New players can see exactly *why* a certain Exotic Armor interacts with a specific Subclass Aspect.
- **Auto-Config:** Pick a synergy, and the engine automatically configures your Fragments and Abilities to match.

### 🔗 DIM Compatibility & Universal Sharing
ExoEngine is fully integrated with the Destiny ecosystem.
- **Universal Links:** Generate links that can be opened directly in ExoEngine OR DIM.
- **Deep DIM Support:** Import any DIM share link to view it in ExoEngine's immersive interface.
- **One-Click Import:** Found a build you like? Click one button to open it in DIM and save it to your permanent collection.

### 🛡️ Tactical Vault & One-Click Capture
- **Build Capture:** Use the "One-Click Capture" in the Loadout Viewer to snapshot your *entire* currently equipped build (Weapons, Armor, Subclass, and all 15+ Mods).
- **Local Storage:** Save your favorite experimental builds to your local "Tactical Vault" (IndexedDB) without needing a central server.
- **Progress Tracking:** Real-time feedback bars show you exactly what the API is doing during equipment swaps.

---

## 🧠 Engineering & Technical Challenges

ExoEngine™ implements unique solutions to solve specific Destiny 2 API hurdles:

### 1. The Dynamic Fragment Slot Conflict
When applying Aspects via the API, the server doesn't instantly "unlock" the corresponding Fragment slots.
- **Solution:** A multi-stage **"Heartbeat Pass"** system. The engine applies Aspects, waits for a socket-update verification pulse (approx 1.2s), and *then* seats the Fragments in a secondary pass once the server acknowledges the new slots.

### 2. Manifest Optimization (Client-Side Worker)
The Destiny 2 Manifest is over 100MB. Loading this on mobile data or slow connections is prohibitive.
- **Solution:** We implemented a custom **Trimming Worker** that discards 90% of unneeded manifest metadata (lore, non-English strings, raw logic) *before* caching it to IndexedDB. This results in a lightning-fast <10MB final startup load.

### 3. Serverless Link Encoding
Sharing massive loadout configurations without a database backend.
- **Solution:** A URL-safe Base64 compression scheme that packs the entire `LoadoutShareData` structure into the URL. This ensures your links never expire and require zero server storage.

---

---

## 🎬 Demonstration

<div align="center">
  <img src="docs/images/demo.gif" width="100%" alt="ExoEngine Feature Demonstration"/>
  <p align="center"><em>ExoEngine™ Core Workflow: Discover, Capture, and Share</em></p>
</div>

---

## 🛠️ Built With

- **Framework:** React 19 + Vite 7
- **Language:** TypeScript (Strict Type Safety)
- **State:** Zustand
- **Storage:** IndexedDB (Local Privacy)
- **Styling:** Custom Vanilla CSS (Glassmorphism & Prismatic Theme)
- **API:** Bungie.net API + DIM Value Mappings

---

## 🐛 Known Issues & Roadmap

- **API Latency:** Occasionally, the Bungie API may take a moment to reflect subclass changes. If a fragment fails to seat, clicking "Equip" again usually resolves the sync issue.
- **PWA Support:** Full offline manifest support is currently in development.

---

## 📬 Credits & Contact

**Lead Developer:**
- **Vince (Vj) - [@Unluckvj](https://twitter.com/Unluckvj)**

**Special Thanks:**
- **Bungie API Team:** For providing the incredible platform and documentation.
- **Destiny Item Manager (DIM):** For setting the standard and providing open-source mappings.
- **Destiny 2 Community:** For 10 years of incredible buildcrafting history.

---
**Made with ❤️ for the Guardian Games.**
