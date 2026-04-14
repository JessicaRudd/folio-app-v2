# Folio 📮

**Folio** is a privacy-forward digital postcard platform designed for sharing meaningful moments with intention. Unlike traditional social media, Folio focuses on curated visual stories, allowing you to organize your memories into beautiful collections and share them with the world—or just a chosen few.

## ✨ Key Features

- **Digital Postcards**: Create and share postcards with multiple photos, captions, and location data.
- **Dynamic Postcard Stamps**: Every postcard gets a unique, location-based stamp (or a classic Folio postmark) that adds an authentic touch to your memories.
- **Curated Collections**: Organize your postcards into themed collections. Set them to Public, Private, or Personal.
- **Guest Pass System**: Share private collections securely using our OTP-based Guest Pass system—no account required for your guests.
- **Music Vibes**: Attach an Apple Music or Spotify "vibe" to your collections and postcards to set the perfect mood.
- **Privacy First**: Choose between Public and Private profiles. You control who sees your content and how you're discovered.
- **Memory Map**: View your global journey on an interactive map of your postcards.
- **Follower System**: Follow your favorite curators and stay updated with their latest public or shared collections.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Firebase Project (Firestore, Auth, Storage)

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd folio
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file based on `.env.example` and add your Firebase configuration and other API keys.

4. Start the development server:
   ```bash
   npm run dev
   ```

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Motion (Framer Motion)
- **Backend**: Node.js, Express (Full-stack mode)
- **Database & Auth**: Firebase Firestore, Firebase Authentication
- **Storage**: Firebase Storage
- **Icons**: Lucide React
- **Maps**: D3.js / Custom SVG mapping

## 🔒 Security

Folio uses robust Firestore Security Rules to ensure your data is protected. Private collections and profiles are strictly enforced at the database level.

---

Curate your story. Share your journey. **Curate your folio.**
