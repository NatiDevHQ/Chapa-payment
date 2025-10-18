/* CHAPA API PAYMENT INTEGRATION - TAILWIND VERSION */
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
    "Content-Type": "application/json",
  },
};

// Store selected plans temporarily
const userSelections = new Map();

// Routes
app.get("/", (req, res) => {
  const paymentStatus = "pending";
  res.render("index", { paymentStatus });
});

app.get("/plans", (req, res) => {
  res.render("plans");
});

app.post("/select-plan", (req, res) => {
  const { plan, amount, features } = req.body;
  const sessionId = Date.now().toString();

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

// Fixed Payment endpoint
app.post("/api/pay", async (req, res) => {
  const { amount, plan, sessionId } = req.body;

  const CALLBACK_URL = "http://localhost:4400/api/verify-payment/";
  const RETURN_URL = `http://localhost:4400/api/payment-success?session=${sessionId}`;

  const TEXT_REF = `tx-${plan}-${Date.now()}`;

  // Store transaction reference
  const selection = userSelections.get(sessionId);
  if (selection) {
    selection.tx_ref = TEXT_REF;
    userSelections.set(sessionId, selection);
  }

  // Correct Chapa data format
  const data = {
    amount: amount || "100",
    currency: "ETB",
    email: "abebech_bekele@gmail.com",
    first_name: "Customer",
    last_name: "User",
    tx_ref: TEXT_REF,
    callback_url: CALLBACK_URL + TEXT_REF,
    return_url: RETURN_URL,
    "customization[title]": `Payment for ${plan} Plan`,
    "customization[description]": `Subscription payment for ${plan} plan`,
  };

  console.log("Sending to Chapa:", data);

  try {
    const response = await axios.post(CHAPA_URL, data, config);

    if (response.data.status === "success") {
      res.redirect(response.data.data.checkout_url);
    } else {
      console.error("Chapa API error:", response.data);
      res.redirect("/payment-error");
    }
  } catch (err) {
    console.error("Payment initialization failed:");
    console.error("Status:", err.response?.status);
    console.error("Error Data:", err.response?.data);
    console.error("Message:", err.message);

    res.redirect("/payment-error");
  }
});

// Verification endpoint
app.get("/api/verify-payment/:id", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.chapa.co/v1/transaction/verify/" + req.params.id,
      config
    );
    console.log("Payment verified successfully:", response.data);
    res.status(200).send("Verified");
  } catch (err) {
    console.error(
      "Payment verification failed:",
      err.response?.data || err.message
    );
    res.status(400).send("Verification failed");
  }
});

// Success page
app.get("/api/payment-success", async (req, res) => {
  const sessionId = req.query.session;
  const selection = userSelections.get(sessionId);

  if (!selection) {
    return res.redirect("/");
  }

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

// Payment error page
app.get("/payment-error", (req, res) => {
  res.render("payment-error", {
    error:
      "Payment initialization failed. Please check your details and try again.",
  });
});

// PDF receipt endpoint
app.get("/api/generate-receipt", (req, res) => {
  const sessionId = req.query.session;
  const selection = userSelections.get(sessionId);

  if (!selection) {
    return res.status(404).send("Transaction not found");
  }

  res.json({
    message: "PDF receipt would be generated here",
    transaction: {
      id: selection.tx_ref,
      plan: selection.plan,
      amount: selection.amount,
      date: new Date().toISOString(),
    },
  });
});

app.listen(PORT, () => console.log("🚀 Server running on port:", PORT));
