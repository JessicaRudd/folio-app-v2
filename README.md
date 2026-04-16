# 🕊️ Folio
### The Private Home for Your Digital Postcards.

**Folio** is a "Slow Social" platform designed for intentional, high-fidelity memory sharing. It blends the intimacy of a personal diary with the aesthetic of a premium editorial magazine. Unlike traditional social networks, Folio prioritizes the privacy of the curator and a friction-less, ad-free experience for the guest.

[**Join the Waitlist**](https://curateyourfolio.com) | [**Support the Mission**](https://buymeacoffee.com/h9aq9muuyz) | [**LinkedIn**](https://linkedin.com/company/curateyourfolio)

---

## 📢 Project Status: Private Early Access
Folio is currently in an **intentional rollout phase**. We are onboarding a limited number of "Founding Members" to our Private Alpha to ensure the highest standards of privacy and performance.

*   **Gatekeeper System:** Access to the full platform is currently restricted to invited curators.
*   **Public Landing:** Visitors can join the waitlist at [curateyourfolio.com](https://curateyourfolio.com).

---

## ✨ Core Features

### 📮 Digital Postcards
Curate photos, videos, and diary entries into elegant, magazine-style "Postcards."
*   **Editorial Layouts:** High-fidelity UI inspired by premium print publications (Kinfolk, Apple Journal).
*   **Apple Music Integration:** Search and attach the perfect soundtrack to your postcards via MusicKit JS.
*   **Multimedia Storytelling:** Seamless carousel support for photos and video.

### 🛡️ Privacy & Sharing
*   **The Guest Pass:** Share your "Folios" (collections) with friends and family using secure, individualized access tokens.
*   **No-Auth Viewing:** Recipients can view your postcards on the web without creating an account, keeping the experience friction-less for them and private for you.
*   **Soft-Verification:** Private links are protected via Email/SMS OTP (One-Time Passcode) to ensure only the intended audience has access.
*   **Public Collections:** Curators can choose to toggle specific collections to "Public" for wider sharing.

### 🖋️ Curator Experience
*   **Apple Photos Sync:** Built to leverage Apple Photos shared albums for effortless media sourcing.
*   **Diary Entries:** Write long-form, serif-styled reflections to accompany your visual media.
*   **Revocation Control:** Real-time dashboard to manage who has access to your Folios and the ability to revoke "Guest Passes" instantly.

---

## 🏗️ Technical Architecture
Folio is built as a **"Private Cloud Appliance,"** utilizing a modern, scalable Google Cloud stack designed for performance and cost-efficiency.

*   **Frontend:** [Next.js](https://nextjs.org/) (App Router) + [Tailwind CSS](https://tailwindcss.com/)
*   **Infrastructure:** Multi-container deployment via **Docker Compose for Cloud Run**.
    *   **Container A (Web):** The Next.js editorial interface.
    *   **Container B (Image-Proc):** [Imgproxy](https://imgproxy.net/) sidecar for real-time WebP optimization and BlurHash generation.
*   **Database & Auth:** [Google Firestore](https://firebase.google.com/docs/firestore) + [Firebase Auth](https://firebase.google.com/docs/auth).
*   **Storage:** [Google Cloud Storage](https://cloud.google.com/storage) with Cloud CDN for global asset delivery.
*   **CI/CD:** Automated via **GitHub Actions** and **Google Cloud Build**.

---

## 🎨 Design Philosophy
Folio is **Design-Led**. We believe that digital memories deserve the same care as physical heirlooms.
*   **Stitch-Synced:** UI components are derived directly from high-fidelity [Stitch](https://stitch.so/) mockups.
*   **Typography:** A refined pairing of **SF Pro Display** for UI and **New York (Serif)** for narrative content.
*   **Motion:** Fluid transitions powered by **Framer Motion** to simulate the feel of a physical magazine.

---

## 🐞 Feedback & Bug Reporting
We value the "Founding Member" feedback loop.
*   **Bug Alerts:** If you encounter an issue, please use the **"Send Feedback"** button within the app. This automatically creates a logged issue in this repository with the necessary environment metadata.
*   **Manual Issues:** You can also [open an issue](https://github.com/JessicaRudd/folio-app-v2/issues) directly on GitHub.

---

## ☕ Support the Mission
Folio is independent and ad-free. We rely on the support of our community to keep the "Slow Social" movement alive. If you value this space, consider [Buying us a Stamp](https://buymeacoffee.com/h9aq9muuyz).

---

**Built with intention by [Jessica Rudd]**  
*Preserving memories, protecting privacy.*  
[curateyourfolio.com](https://curateyourfolio.com)
