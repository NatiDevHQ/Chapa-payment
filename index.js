/* 
  CHAPA API PAYMENT INTEGRATION TEST
  Required: Chapa secret key || GET THE KEY BY REGISTERING @ https://dashboard.chapa.co/register
*/

const express = require("express");
const app = express();
const axios = require("axios").default;
require("dotenv").config();
const PORT = process.env.PORT || 4400;

const CHAPA_URL =
  process.env.CHAPA_URL || "https://api.chapa.co/v1/transaction/initialize";
const CHAPA_AUTH = process.env.CHAPA_AUTH; // Add your Chapa Secret Key in .env

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

// Chapa header config
const config = {
  headers: {
    Authorization: `Bearer ${CHAPA_AUTH}`,
  },
};

// ===== Routes ===== //

// Status Dashboard
app.get("/", (req, res) => {
  res.render("index");
});

// Plan Selection Page
app.get("/plans", (req, res) => {
  res.render("plans");
});

// Payment Method Page
app.get("/payment-method", (req, res) => {
  res.render("payment-method");
});

// Demo Payment Success Page
app.get("/success-demo", (req, res) => {
  const { plan, amount } = req.query;
  res.render("success-demo", { plan, amount });
});

// Real Chapa Payment Endpoint
app.post("/api/pay", async (req, res) => {
  const CALLBACK_URL = "http://localhost:4400/api/verify-payment/";
  const RETURN_URL = "http://localhost:4400/api/payment-success/";
  const TEXT_REF = "tx-myecommerce12345-" + Date.now();

  const data = {
    amount: "100",
    currency: "ETB",
    email: "ato@ekele.com",
    first_name: "Ato",
    last_name: "Ekele",
    tx_ref: TEXT_REF,
    callback_url: CALLBACK_URL + TEXT_REF,
    return_url: RETURN_URL,
  };

  try {
    const response = await axios.post(CHAPA_URL, data, config);
    res.redirect(response.data.data.checkout_url);
  } catch (err) {
    console.log(err);
    res.send("Payment initiation failed");
  }
});

// Chapa Verification Endpoint
app.get("/api/verify-payment/:id", async (req, res) => {
  try {
    await axios.get(
      "https://api.chapa.co/v1/transaction/verify/" + req.params.id,
      config
    );
    console.log("Payment was successfully verified");
    res.send("Verified successfully");
  } catch (err) {
    console.log("Payment can't be verified", err);
    res.send("Verification failed");
  }
});

// Real Chapa Payment Success Page
app.get("/api/payment-success", async (req, res) => {
  res.render("success");
});

app.listen(PORT, () => console.log("Server listening on port:", PORT));
