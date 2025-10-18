/* CHAPA API PAYMENT INTEGRATION - ENHANCED */
const express = require("express");
const app = express();
const axios = require("axios").default;
require("dotenv").config();
const path = require("path");

const PORT = process.env.PORT || 4400;
const CHAPA_URL =
  process.env.CHAPA_URL || "https://api.chapa.co/v1/transaction/initialize";
const CHAPA_AUTH = process.env.CHAPA_AUTH;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Chapa configuration
const config = {
  headers: {
    Authorization: `Bearer ${CHAPA_AUTH}`,
  },
};

// Store selected plans temporarily (in production, use a proper session/database)
const userSelections = new Map();

// Enhanced Routes
app.get("/", (req, res) => {
  const paymentStatus = "pending"; // You can dynamically set this based on actual payment status
  res.render("index", { paymentStatus });
});

app.get("/plans", (req, res) => {
  res.render("plans");
});

app.post("/select-plan", (req, res) => {
  const { plan, amount, features } = req.body;
  const sessionId = Date.now().toString(); // Simple session simulation

  userSelections.set(sessionId, {
    plan,
    amount,
    features: features ? features.split(",") : [],
    selectedAt: new Date(),
  });

  res.redirect(`/payment-method?session=${sessionId}`);
});

app.get("/payment-method", (req, res) => {
  const sessionId = req.query.session;
  const selection = userSelections.get(sessionId);

  if (!selection) {
    return res.redirect("/plans");
  }

  res.render("payment-method", {
    plan: selection.plan,
    amount: selection.amount,
    sessionId: sessionId,
  });
});

// Updated payment endpoint with dynamic amounts
app.post("/api/pay", async (req, res) => {
  const { amount, plan, sessionId } = req.body;

  const CALLBACK_URL = "http://localhost:4400/api/verify-payment/";
  const RETURN_URL = `http://localhost:4400/api/payment-success?session=${sessionId}`;

  const TEXT_REF = `tx-${plan}-${Date.now()}`;

  // Store transaction reference with session
  const selection = userSelections.get(sessionId);
  if (selection) {
    selection.tx_ref = TEXT_REF;
    userSelections.set(sessionId, selection);
  }

  const data = {
    amount: amount || "100",
    currency: "ETB",
    email: "customer@example.com",
    first_name: "Customer",
    last_name: "User",
    tx_ref: TEXT_REF,
    callback_url: CALLBACK_URL + TEXT_REF,
    return_url: RETURN_URL,
    customization: {
      title: `Payment for ${plan} Plan`,
      description: `Subscription payment for ${plan} plan`,
    },
  };

  try {
    const response = await axios.post(CHAPA_URL, data, config);
    res.redirect(response.data.data.checkout_url);
  } catch (err) {
    console.error("Payment initialization error:", err);
    res.redirect("/payment-error");
  }
});

// Verification endpoint
app.get("/api/verify-payment/:id", async (req, res) => {
  try {
    await axios.get(
      "https://api.chapa.co/v1/transaction/verify/" + req.params.id,
      config
    );
    console.log("Payment was successfully verified");
    res.status(200).send("Verified");
  } catch (err) {
    console.log("Payment can't be verified", err);
    res.status(400).send("Verification failed");
  }
});

// Enhanced success page with transaction details
app.get("/api/payment-success", async (req, res) => {
  const sessionId = req.query.session;
  const selection = userSelections.get(sessionId);

  if (!selection) {
    return res.redirect("/");
  }

  // Simulate transaction details (in real app, get from Chapa verification)
  const transactionDetails = {
    transactionId: selection.tx_ref || `chapa-${Date.now()}`,
    plan: selection.plan,
    amount: selection.amount,
    method: "Chapa Pay",
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    status: "completed",
  };

  res.render("success", {
    transaction: transactionDetails,
    sessionId: sessionId,
  });
});

// PDF Receipt Generation endpoint
app.get("/api/generate-receipt", (req, res) => {
  const sessionId = req.query.session;
  const selection = userSelections.get(sessionId);

  if (!selection) {
    return res.status(404).send("Transaction not found");
  }

  // In a real application, you would use a PDF generation library like pdfkit
  // For now, we'll simulate with a simple response
  res.json({
    message: "PDF receipt generation endpoint",
    transaction: {
      id: selection.tx_ref,
      plan: selection.plan,
      amount: selection.amount,
      date: new Date().toISOString(),
    },
  });
});

app.listen(PORT, () => console.log("Enhanced server listening on port:", PORT));
