<div align="center">
  <img src="docs/images/logo.svg" width="300px" alt="ExoEngine Logo"/>
  
  # ExoEngine™
  ### The Universe of Build Synergies - Visualized
  
  **Destiny 2's First Interactive 3D Synergy Explorer**
  
  [![Live Site](https://img.shields.io/badge/LIVE-exoengine.online-8b5cf6?style=for-the-badge)](https://exoengine.online)
  [![Status](https://img.shields.io/badge/STATUS-Production-10b981?style=for-the-badge)](https://exoengine.online)
  [![Twitter](https://img.shields.io/badge/TWITTER-@Unluckvj-1DA1F2?style=for-the-badge)](https://twitter.com/Unluckvj)
  
  ---
</div>

<br/>

## What is ExoEngine?

**ExoEngine** is an advanced Destiny 2 loadout management and build discovery platform. It provides powerful tools for equipping builds, visualizing gear synergies, and managing your vault with intelligent automation.

### Built For:
- **Build Enthusiasts** - Quickly equip and test different loadout combinations
- **Vault Managers** - Visual organization of your entire arsenal
- **Synergy Seekers** - Discover exotic and subclass interactions
- **Efficiency Players** - One-click loadout equipping with full mod support

> **Note:** ExoEngine is a **companion tool** to DIM (Destiny Item Manager), not a replacement. DIM excels at inventory management. ExoEngine focuses on **build equipping, synergy visualization, and automated loadout application**.

---

## Core Features

### **Agent Wake** - Natural Language Build Equipping

Equip builds using simple text commands through the Agent interface:

- **Text-Based Commands** - Type "equip sunshot and sunbracers" to instantly gear up
- **Smart Item Search** - Finds items by name across your entire vault
- **Full Loadout Support** - Handles weapons, armor, subclass, aspects, fragments, and mods
- **Natural Language** - Understands casual commands like "void hunter with omnioculus"
- **Instant Transfer** - Automatically moves and equips items across characters
- **Progress Feedback** - Real-time status updates during equipment operations

### **Synergy Galaxy** - Interactive 3D Vault Visualization *(BETA)*

A fully interactive 3D view of your entire arsenal:

- **3D Node System** - Every exotic, subclass, and item becomes a visual node
- **Click to Equip** - One click transfers and equips items across characters
- **Synergy Wires** - Visual connections show which items work together
- **Element Colors** - Solar, Void, Arc, Stasis, Strand nodes color-coded
- **Real-Time Sync** - Live inventory updates from Bungie's API
- **Interactive Navigation** - Drag to rotate, scroll to zoom, click to focus

> **Beta Notice:** Galaxy visualization is actively being refined. Some features may be experimental.

---

### **Build Generator** - Randomized Loadout Creator *(BETA)*

Generate random but functional builds from your vault:

- **Spin the Wheel** - Get randomized exotic + subclass + weapon combinations
- **Class Filtering** - Filter by Titan, Hunter, or Warlock
- **Element Filtering** - Focus on specific damage types
- **Lock Slots** - Keep certain items while randomizing others
- **Expansion Filtering** - Only use exotics from DLCs you own
- **One-Click Equip** - Apply the generated build instantly

> **Beta Notice:** Build templates are being expanded. Generator logic is under active development.

---

### **Loadout Vault** - Build Collection

Save and manage your favorite builds locally:

- **Local Storage** - Builds saved to IndexedDB (no server required)
- **One-Click Capture** - Save your current equipped loadout with all mods
- **Build Cards** - Visual cards showing exotics, subclass, and element
- **Quick Equip** - Re-equip saved builds with one click
- **Universal Links** - Generate shareable links for your builds
- **Import/Export** - Share builds with other ExoEngine users

---

### **DIM Loadout Viewer** - Import DIM Builds

Seamlessly import and visualize DIM share links:

- **Paste DIM Links** - Import `dim.gg` share URLs
- **Full Visualization** - See all mods, aspects, and fragments
- **Immersive View** - DIM builds displayed in ExoEngine's interface
- **One-Click Equip** - Apply imported DIM builds directly
- **Save to Vault** - Capture DIM builds to your local collection

---

## Under the Hood

ExoEngine is built with DIM-grade engineering for Destiny 2 API challenges:

### **Smart Inventory Management**
- **Multi-Character Transfers** - Automatically routes items through vault when needed
- **Proactive Space Checks** - Prevents transfer failures before they happen
- **Exotic Conflict Resolution** - Intelligently swaps exotics without breaking your loadout
- **Optimistic UI Updates** - Instant feedback with API validation

### **Security & Privacy**
- **Local-First Architecture** - Your vault data stays on your device
- **Encrypted Token Storage** - AES-GCM encryption for OAuth tokens
- **No Analytics Tracking** - Your builds are yours alone
- **Open Source** - Audit the code yourself

### **Performance Optimizations**
- **Manifest Trimming** - 90% smaller manifest cache (<10MB vs 100MB+)
- **Code Splitting** - 23 optimized chunks for fast initial load
- **Timestamp Protection** - Rejects stale API responses automatically
- **Dynamic Fragment Slots** - Handles Aspectâ†’Fragment dependencies gracefully

### **Tech Stack**
```
Frontend:     React 19 + TypeScript
Build Tool:   Vite 7
State:        Zustand (5KB)
Storage:      IndexedDB + Encryption
Styling:      Custom CSS (Glassmorphism + Prismatic)
3D Engine:    Custom Canvas Renderer
API:          Bungie.net + DIM Mappings
```

---

## Usage Guide

### First Time Setup
1. Visit **https://exoengine.online**
2. Click "Connect to Bungie.net" and authorize with your Bungie account
3. Select your character
4. Wait for your vault to sync (~5-10 seconds)
5. You're in! Access features from the navigation menu

### Using Agent Wake (Text Commands)
1. Navigate to "Agent Wake" from the menu
2. Type natural language commands:
   - `equip sunshot and sunbracers`
   - `void hunter with omnioculus`
   - `solar titan with loreley`
3. Press Enter or click the command button
4. ExoEngine handles all transfers and equipping automatically

### Using Synergy Galaxy (3D View)
1. Navigate to "Galaxy" from the menu
2. Your vault loads as a 3D space
3. **Click** any node to see item details
4. **Double-click** to equip items
5. **Drag** to rotate the view
6. **Scroll** to zoom in/out
7. Use synergy sidebar to equip full builds

### Using Build Generator
1. Navigate to "Generator" from the menu
2. Click "Spin" to generate a random build
3. Use filters to narrow by class or element
4. Click "Lock" on slots you want to keep
5. Click "Equip Build" to apply the loadout

### Saving Builds
1. Equip your desired loadout in-game
2. Navigate to "Saved Builds" or "Loadout Vault"
3. Click "Capture Current Loadout"
4. Name your build and save
5. Re-equip saved builds anytime with one click

---

## Known Limitations & Beta Features

### Bungie API Restrictions
- **Error 1663:** Subclass changes only work in Orbit/Social spaces (Bungie limitation)
- **Error 1676:** Some mod combinations fail due to energy cost limits
- **Socket Changes:** Aspects and fragments can only be modified outside of activities

### Beta Features
- **Synergy Galaxy:** 3D visualization is experimental and under active development
- **Build Generator:** Template library is being expanded with more exotic combinations
- **Mobile Support:** Galaxy navigation may be limited on mobile devices

### Performance Notes
- Large vaults (500+ items) may take longer to load in Galaxy view
- First-time manifest download can take 30-60 seconds

---

## Support Development

> [!IMPORTANT]
> ExoEngine is developed solo on an aging PC. If this tool enhances your Guardian experience, consider supporting continued development!

**Ways to Support:**
- **[Buy me a Ko-fi](https://ko-fi.com/unluckvj)**
- **Star this repo** on GitHub
- **Share** on Twitter with #ExoEngine
- **Use it** and provide feedback!

Every contribution helps maintain servers and fund new features.

---

## Credits & Contact

**Created by:** Vince (Vj)  
**Twitter:** [@Unluckvj](https://twitter.com/Unluckvj)  
**Website:** [exoengine.online](https://exoengine.online)  
**GitHub:** [luckvj/ExoEngine](https://github.com/luckvj/ExoEngine)

### Special Thanks
- **Bungie** - For the incredible API and 10 years of Destiny
- **DIM Team** - For setting the standard and open-source inspiration
- **Destiny Community** - For endless buildcrafting creativity
- **Early Testers** - You know who you are

---

## License & Legal

**ExoEngine™** is a proprietary trademark. All rights reserved.

### Legal Disclaimer
- ExoEngine™ is a trademark of Vince (Vj). Unauthorized use is prohibited.
- This is a fan-made tool and is not affiliated with, endorsed by, or associated with Bungie, Inc. or Destiny 2.
- All Destiny 2 assets, names, and trademarks are property of Bungie, Inc.
- No part of this software may be reproduced, distributed, or transmitted without explicit permission.

---

<div align="center">
  
### Explore. Discover. Dominate.

**Made with love for Guardians, by Guardians**

[Launch ExoEngine](https://exoengine.online) | [Documentation](https://github.com/luckvj/ExoEngine/wiki) | [Discord](#)

---

*"Eyes up, Guardian. Your next build awaits in the stars."*

</div>
