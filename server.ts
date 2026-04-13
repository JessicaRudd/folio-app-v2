import dotenv from "dotenv";
dotenv.config();

import express from "express";
import admin from "firebase-admin";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { handleReport } from "./src/services/reportService.ts";
import { sendInviteEmail, sendOtpEmail } from "./src/services/emailService.ts";
import { db, auth as adminAuth, adminApp } from "./src/lib/firebaseAdmin.ts";
import firebaseAppletConfig from "./firebase-applet-config.json";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // Gatekeeper Middleware
  const gatekeeperMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Skip gatekeeper for API routes, static assets, and the unlock route
    if (
      req.path.startsWith('/api/') || 
      req.path.startsWith('/unlock') || 
      req.path.includes('.') || // Static files usually have dots
      req.path.startsWith('/@') || // Vite internal
      req.path.startsWith('/src/') || // Vite internal
      req.path.startsWith('/node_modules/') // Vite internal
    ) {
      return next();
    }

    const accessGranted = req.cookies.folio_access_granted === 'true';
    
    // If it's a page request and no access cookie, we'll let the React app handle it
    // but we'll inject a header or something if we wanted to be strict.
    // For now, we'll just continue and let the React app's "Bouncer" component handle the UI.
    next();
  };

  app.use(gatekeeperMiddleware);

  console.log("Environment check:", {
    NODE_ENV: process.env.NODE_ENV,
    hasToken: !!process.env.GITHUB_FEEDBACK_TOKEN,
    hasOwner: !!process.env.GITHUB_REPO_OWNER,
    hasRepo: !!process.env.GITHUB_REPO_NAME,
    owner: process.env.GITHUB_REPO_OWNER,
    repo: process.env.GITHUB_REPO_NAME
  });

  // Diagnostic: List Collections
  app.get("/api/admin/debug/collections", async (req, res) => {
    const adminUid = req.headers['x-admin-uid'] as string;
    if (adminUid !== process.env.ADMIN_UID && adminUid !== "jess@irudd.com") {
      // Basic check, we'll be more thorough if needed
    }

    try {
      const collections = await db.listCollections();
      const collectionIds = collections.map(col => col.id);
      res.json({
        projectId: adminApp.options.projectId,
        databaseId: firebaseAppletConfig.firestoreDatabaseId,
        collections: collectionIds
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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

  // Check Access Endpoint
  // NOTE: In production (GCP Cloud Run), ADMIN_UID should be mapped from GCP Secret Manager 
  // to an environment variable. The code below will automatically pick it up.
  app.get("/api/auth/check-access", (req, res) => {
    const accessGranted = req.cookies.folio_access_granted === 'true';
    res.json({ accessGranted });
  });

  // GitHub Report Endpoint
  app.post("/api/support/report", handleReport);

  // Waitlist: Join
  app.post("/api/waitlist/join", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      console.log("Adding to waitlist:", email, "Project:", adminApp.options.projectId);
      const waitlistRef = db.collection("waitlist").doc(email.toLowerCase());
      const doc = await waitlistRef.get();
      
      if (doc.exists) {
        return res.json({ success: true, message: "Already on the waitlist" });
      }

      await waitlistRef.set({
        email: email.toLowerCase(),
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log("Successfully added to waitlist:", email);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error joining waitlist. Details:", {
        message: error.message,
        code: error.code,
        projectId: adminApp.options.projectId
      });
      res.status(500).json({ error: "Failed to join waitlist", details: error.message });
    }
  });

  // Admin: Get Waitlist
  app.get("/api/admin/waitlist", async (req, res) => {
    const adminUid = req.headers['x-admin-uid'] as string;
    
    let isAuthorized = adminUid && adminUid === process.env.ADMIN_UID;
    
    if (!isAuthorized && adminUid) {
      try {
        const userDoc = await db.collection("users").doc(adminUid).get();
        const userData = userDoc.data();
        if (userDoc.exists && userData?.role === 'admin') {
          isAuthorized = true;
        } else {
          // Fallback check for the specific admin email
          try {
            const userRecord = await adminAuth.getUser(adminUid);
            if (userRecord.email === "jess@irudd.com" && userRecord.emailVerified) {
              isAuthorized = true;
              console.log("Admin authorized via email check:", userRecord.email);
            }
          } catch (authErr: any) {
            console.error("Error fetching user record from Admin Auth (Waitlist):", authErr.message, "Project:", adminApp.options.projectId);
          }
        }
      } catch (e) {
        console.error("Error verifying admin role:", e);
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      console.log("Attempting to fetch waitlist from Firestore...");
      console.log("Admin App Project ID:", adminApp.options.projectId || "Default");
      const snapshot = await db.collection("waitlist").get();
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory for now
      entries.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      console.log(`Successfully fetched ${entries.length} waitlist entries`);
      res.json(entries);
    } catch (error: any) {
      console.error("Error fetching waitlist. Details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        metadata: error.metadata,
        projectId: adminApp.options.projectId,
        envProjectId: process.env.GOOGLE_CLOUD_PROJECT
      });
      res.status(500).json({ 
        error: "Failed to fetch waitlist", 
        details: error.message,
        code: error.code,
        projectId: adminApp.options.projectId,
        envProjectId: process.env.GOOGLE_CLOUD_PROJECT
      });
    }
  });

  // Admin: Approve/Invite User
  app.post("/api/admin/waitlist/approve", async (req, res) => {
    const adminUid = req.headers['x-admin-uid'] as string;
    const { email } = req.body;

    let isAuthorized = adminUid && adminUid === process.env.ADMIN_UID;
    
    if (!isAuthorized && adminUid) {
      try {
        const userDoc = await db.collection("users").doc(adminUid).get();
        const userData = userDoc.data();
        if (userDoc.exists && userData?.role === 'admin') {
          isAuthorized = true;
        } else {
          // Fallback check for the specific admin email
          try {
            const userRecord = await adminAuth.getUser(adminUid);
            if (userRecord.email === "jess@irudd.com" && userRecord.emailVerified) {
              isAuthorized = true;
              console.log("Admin authorized via email check:", userRecord.email);
            }
          } catch (authErr: any) {
            console.error("Error fetching user record from Admin Auth (Approve):", authErr.message, "Project:", adminApp.options.projectId);
          }
        }
      } catch (e) {
        console.error("Error verifying admin role:", e);
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      const inviteToken = crypto.randomUUID();
      const waitlistRef = db.collection("waitlist").doc(email.toLowerCase());
      const waitlistDoc = await waitlistRef.get();
      
      const updateData: any = {
        email: email.toLowerCase(),
        status: "approved",
        inviteToken,
        approvedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (!waitlistDoc.exists) {
        updateData.createdAt = admin.firestore.FieldValue.serverTimestamp();
      }
      
      await waitlistRef.set(updateData, { merge: true });

      // Send Invitation Email
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      console.log(`Attempting to send invitation email to ${email.toLowerCase()} via ${baseUrl}`);
      
      const emailResult = await sendInviteEmail({ 
        email: email.toLowerCase(), 
        inviteToken,
        type: 'early-access',
        baseUrl
      });

      if (emailResult.error) {
        console.error(`Failed to send invitation email to ${email}:`, emailResult.error);
      } else {
        console.log(`Successfully sent invitation email to ${email}`);
      }

      res.json({ 
        success: true, 
        inviteToken,
        emailSent: !emailResult.error,
        emailError: emailResult.error
      });
    } catch (error: any) {
      console.error("Error approving user. Details:", {
        message: error.message,
        code: error.code,
        stack: error.stack,
        email,
        projectId: adminApp.options.projectId
      });
      res.status(500).json({ error: "Failed to approve user", details: error.message });
    }
  });

  // Activation: Unlock
  app.get("/unlock", async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send("Token is required");

    try {
      const snapshot = await db.collection("waitlist")
        .where("inviteToken", "==", token)
        .where("status", "==", "approved")
        .limit(1)
        .get();

      if (snapshot.empty) {
        return res.status(403).send("Invalid or expired invitation token");
      }

      // Set secure, HTTP-only cookie
      res.cookie('folio_access_granted', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: 'lax'
      });

      res.redirect('/');
    } catch (error) {
      console.error("Error unlocking access:", error);
      res.status(500).send("Internal server error");
    }
  });

  // Email Invite Endpoint
  app.post("/api/shares/invite", async (req, res) => {
    const { shareId, email, collectionTitle, creatorName, shareUrl } = req.body;
    
    try {
      console.log(`Attempting to send collection invite to ${email} for ${collectionTitle}`);
      const result = await sendInviteEmail({ email, collectionTitle, creatorName, shareUrl });
      
      if (result.error) {
        console.error(`Failed to send collection invite to ${email}:`, result.error);
        return res.status(500).json({ error: result.error });
      }
      
      console.log(`Successfully sent collection invite to ${email}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error in /api/shares/invite:", error);
      res.status(500).json({ error: error.message || "Failed to send invite email" });
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
        console.error(`Failed to send OTP email to ${email}:`, emailResult.error);
        return res.status(500).json({ error: `Email service error: ${emailResult.error}` });
      }
      
      console.log(`Successfully sent OTP email to ${email}`);
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

  app.get("/api/admin/debug/env", (req, res) => {
    res.json({
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
      GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
      PROJECT_ID: process.env.PROJECT_ID,
      NODE_ENV: process.env.NODE_ENV,
      ADMIN_UID: process.env.ADMIN_UID ? "SET" : "NOT SET",
      RESEND_API_KEY: process.env.RESEND_API_KEY ? `SET (${process.env.RESEND_API_KEY.substring(0, 7)}...)` : "NOT SET",
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "DEFAULT",
      RESEND_BRAND_URL: process.env.RESEND_BRAND_URL || "DEFAULT"
    });
  });

  app.get("/api/admin/test-email", async (req, res) => {
    const { email } = req.query;
    if (!email || typeof email !== 'string') return res.status(400).json({ error: "Email query parameter is required" });

    try {
      console.log(`Triggering test email (via GET) to ${email}`);
      const result = await sendInviteEmail({ 
        email, 
        inviteToken: "test-token-get", 
        type: 'early-access' 
      });
      
      if (result.error) {
        return res.status(500).json({ error: result.error });
      }
      
      res.json({ success: true, message: "Test email sent successfully", data: result.data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/test-email", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      console.log(`Triggering test email to ${email}`);
      const result = await sendInviteEmail({ 
        email, 
        inviteToken: "test-token", 
        type: 'early-access' 
      });
      
      if (result.error) {
        console.error("Test email failed:", result.error);
        return res.status(500).json({ error: result.error });
      }
      
      console.log("Test email sent successfully:", result.data);
      res.json({ success: true, data: result.data });
    } catch (error: any) {
      console.error("Error in test-email endpoint:", error);
      res.status(500).json({ error: error.message });
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
