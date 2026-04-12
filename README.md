# 🕊️ Folio (V2)
### The Private Home for Your Digital Postcards.

Folio is a "Slow Social" platform designed for intentional memory sharing. It blends the intimacy of a diary with the aesthetic of a high-end editorial magazine. Unlike traditional social networks, Folio prioritizes the privacy of the curator and the friction-less experience of the guest.

[**Live Demo**](https://curateyourfolio.com) | [**Support the Mission**](https://buymeacoffee.com/h9aq9muuyz)

---

## ✨ Key Features
*   **Postcard Storytelling:** Curate photos, videos, and diary entries into elegant, magazine-style layouts.
*   **Privacy-First Sharing:** Secure, token-based sharing allows guests to view your Folios without creating an account or giving away their data.
*   **Editorial UX:** High-fidelity UI built for beauty and focus, moving away from algorithmic noise.
*   **Multisensory Integration:** Seamlessly connect to Apple Music to curate a soundtrack for every experience.
*   **Granular Control:** Invite "Curators" to collaborate on Folios or send secure "Guest Passes" to specific individuals.

---

## 🏗️ Technical Architecture
Folio is built on a modern, scalable, and cost-efficient Google Cloud stack.

*   **Frontend:** [Next.js](https://nextjs.org/) (App Router) + [Tailwind CSS](https://tailwindcss.com/)
*   **State & Database:** [Google Firestore](https://firebase.google.com/docs/firestore)
*   **Authentication:** [Firebase Auth](https://firebase.google.com/docs/auth) (for Creators)
*   **Deployment:** [Google Cloud Run](https://cloud.google.com/run) using the **Docker Compose** specification.
*   **Media Processing:** [Imgproxy](https://imgproxy.net/) sidecar for real-time WebP optimization and BlurHash generation.
*   **CI/CD:** Automated via **GitHub Actions** with secret management through **GCP Secret Manager**.

---

## 🚀 Deployment
This repository is configured for automated deployment to Google Cloud Run. 

1. **Local Development:**
   ```bash
   npm install
   npm run dev
   ```
2. **Production Build:**
   The `docker-compose.yaml` handles the multi-container orchestration of the Web frontend and the Image-processing sidecar.

---

## 🎨 Design Philosophy
Folio is **Design-Led**. We use a "Premium Editorial" aesthetic—think Kinfolk meets Apple Journal. Our components are synced directly from **Stitch** mockups to maintain high visual fidelity.

**Ready to update?** This new README will instantly elevate the perceived value of the project to anyone who visits your GitHub.
