import express from "express";
import admin from "firebase-admin";
console.log("Server file loaded");
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { handleReport } from "./src/services/reportService.ts";
import { sendInviteEmail, sendOtpEmail } from "./src/services/emailService.ts";
import { db } from "./src/lib/firebaseAdmin.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  console.log("Environment check:", {
    NODE_ENV: process.env.NODE_ENV,
    hasToken: !!process.env.GITHUB_FEEDBACK_TOKEN,
    hasOwner: !!process.env.GITHUB_REPO_OWNER,
    hasRepo: !!process.env.GITHUB_REPO_NAME,
    owner: process.env.GITHUB_REPO_OWNER,
    repo: process.env.GITHUB_REPO_NAME
  });

  // Health Check Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok",
      environment: process.env.NODE_ENV || 'development',
      config: {
        hasToken: !!process.env.GITHUB_FEEDBACK_TOKEN,
        hasOwner: !!process.env.GITHUB_REPO_OWNER,
        hasRepo: !!process.env.GITHUB_REPO_NAME
      }
    });
  });

  // GitHub Report Endpoint
  app.post("/api/support/report", handleReport);

  // Email Invite Endpoint
  app.post("/api/shares/invite", async (req, res) => {
    const { shareId, email, collectionTitle, creatorName, shareUrl } = req.body;
    
    try {
      await sendInviteEmail({ email, collectionTitle, creatorName, shareUrl });
      res.json({ success: true });
    } catch (error) {
      console.error("Error in /api/shares/invite:", error);
      res.status(500).json({ error: "Failed to send invite email" });
    }
  });

  // Send OTP Endpoint
  app.post("/api/shares/send-otp", async (req, res) => {
    const { shareId, email } = req.body;
    
    try {
      if (!shareId || !email) {
        return res.status(400).json({ error: "Missing shareId or email" });
      }

      const shareRef = db.collection("shares").doc(shareId);
      const shareDoc = await shareRef.get();
      
      if (!shareDoc.exists) {
        console.error(`Share not found: ${shareId}`);
        return res.status(404).json({ error: "Share link is invalid or has expired" });
      }
      
      const shareData = shareDoc.data();
      if (shareData?.email !== email.toLowerCase()) {
        return res.status(403).json({ error: "This email is not on the guest list for this private link" });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in Firestore with expiration (5 minutes)
      await shareRef.update({
        currentOtp: otp,
        otpExpiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000))
      });

      const emailResult = await sendOtpEmail({ 
        email, 
        otp, 
        collectionTitle: shareData.collectionTitle || "a collection" 
      });

      if (emailResult?.error) {
        return res.status(500).json({ error: `Email service error: ${emailResult.error}` });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error in /api/shares/send-otp:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Verify OTP Endpoint
  app.post("/api/shares/verify-otp", async (req, res) => {
    const { shareId, email, otp } = req.body;
    
    try {
      const shareRef = db.collection("shares").doc(shareId);
      const shareDoc = await shareRef.get();
      
      if (!shareDoc.exists) {
        return res.status(404).json({ error: "Share not found" });
      }
      
      const shareData = shareDoc.data();
      
      if (shareData?.currentOtp === otp && new Date() < shareData?.otpExpiresAt.toDate()) {
        // Clear OTP after successful verification
        await shareRef.update({
          currentOtp: null,
          otpExpiresAt: null,
          accessedBy: admin.firestore.FieldValue.arrayUnion(email)
        });
        res.json({ success: true });
      } else {
        res.status(401).json({ error: "Invalid or expired code" });
      }
    } catch (error) {
      console.error("Error in /api/shares/verify-otp:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Vite in development mode...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: {
          port: 24679 // Use a different port for HMR to avoid conflicts
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware attached.");
  } else {
    console.log("Starting in production mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
