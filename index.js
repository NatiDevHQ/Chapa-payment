/* CHAPA API PAYMENT INTEGRATION - BLACK & WHITE MODERN UI */
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
  const { plan, amount, features, email } = req.body;
  const sessionId = Date.now().toString();

  userSelections.set(sessionId, {
    plan,
    amount,
    email: email || "test@gmail.com",
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
    email: selection.email,
    sessionId: sessionId,
  });
});

// Payment endpoint
app.post("/api/pay", async (req, res) => {
  const { amount, plan, sessionId } = req.body;

  const CALLBACK_URL = "http://localhost:4400/api/verify-payment/";
  const RETURN_URL = `http://localhost:4400/api/payment-success?session=${sessionId}`;

  const TEXT_REF = `tx-${plan}-${Date.now()}`;

  const selection = userSelections.get(sessionId);
  if (selection) {
    selection.tx_ref = TEXT_REF;
    userSelections.set(sessionId, selection);
  }

  const customerEmail = selection?.email || "test@gmail.com";

  const data = {
    amount: amount || "100",
    currency: "ETB",
    email: customerEmail,
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
    email: selection.email,
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
      "Payment initialization failed. Please check your email and try again.",
  });
});

// Enhanced PDF receipt endpoint
app.get("/api/generate-receipt", (req, res) => {
  const sessionId = req.query.session;
  const selection = userSelections.get(sessionId);

  if (!selection) {
    return res.status(404).send("Transaction not found");
  }

  // Generate HTML for PDF receipt
  const receiptHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      
      * { 
        margin: 0; 
        padding: 0; 
        box-sizing: border-box; 
      }
      
      body { 
        font-family: 'Inter', sans-serif; 
        background: #ffffff; 
        color: #000000; 
        line-height: 1.6; 
        padding: 40px; 
      }
      
      .receipt-container { 
        max-width: 800px; 
        margin: 0 auto; 
        background: #ffffff; 
        border: 2px solid #000000; 
        position: relative;
      }
      
      .header { 
        background: #000000; 
        color: #ffffff; 
        padding: 40px; 
        text-align: center; 
        border-bottom: 2px solid #000000;
      }
      
      .company-info { 
        padding: 30px 40px; 
        background: #f8f8f8; 
        border-bottom: 1px solid #e5e5e5;
      }
      
      .bill-to { 
        padding: 30px 40px; 
        border-bottom: 1px solid #e5e5e5;
      }
      
      .items-table { 
        width: 100%; 
        border-collapse: collapse; 
        margin: 0; 
      }
      
      .items-table th { 
        background: #000000; 
        color: #ffffff; 
        padding: 20px; 
        text-align: left; 
        font-weight: 600;
        border: 1px solid #000000;
      }
      
      .items-table td { 
        padding: 20px; 
        border: 1px solid #e5e5e5; 
        text-align: left;
      }
      
      .total-section { 
        padding: 30px 40px; 
        background: #f8f8f8; 
        border-top: 2px solid #000000;
        text-align: right;
      }
      
      .footer { 
        padding: 30px 40px; 
        background: #000000; 
        color: #ffffff; 
        text-align: center; 
        border-top: 2px solid #000000;
      }
      
      h1 { 
        font-size: 36px; 
        font-weight: 700; 
        margin-bottom: 10px; 
        letter-spacing: 2px;
      }
      
      h2 { 
        font-size: 24px; 
        font-weight: 600; 
        margin-bottom: 20px; 
        color: #000000;
      }
      
      h3 { 
        font-size: 18px; 
        font-weight: 600; 
        margin-bottom: 15px; 
        color: #000000;
      }
      
      .text-lg { 
        font-size: 16px; 
      }
      
      .text-xl { 
        font-size: 20px; 
      }
      
      .text-2xl { 
        font-size: 24px; 
      }
      
      .text-3xl { 
        font-size: 30px; 
      }
      
      .font-bold { 
        font-weight: 700; 
      }
      
      .font-semibold { 
        font-weight: 600; 
      }
      
      .mb-4 { 
        margin-bottom: 20px; 
      }
      
      .mb-6 { 
        margin-bottom: 30px; 
      }
      
      .mt-6 { 
        margin-top: 30px; 
      }
      
      .border-b { 
        border-bottom: 1px solid #e5e5e5; 
      }
      
      .receipt-number {
        font-size: 18px;
        font-weight: 600;
        background: #ffffff;
        color: #000000;
        padding: 10px 20px;
        border: 2px solid #000000;
        display: inline-block;
        margin-top: 10px;
      }
      
      .watermark {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 120px;
        color: rgba(0, 0, 0, 0.03);
        font-weight: 900;
        pointer-events: none;
        z-index: 1;
      }
    </style>
  </head>
  <body>
    <div class="receipt-container">
      <div class="watermark">PAID</div>
      
      <div class="header">
        <h1>PAYMENT RECEIPT</h1>
        <div class="receipt-number">Receipt #${selection.tx_ref || "N/A"}</div>
      </div>
      
      <div class="company-info">
        <h2>ALX Foundation and ALX Holdings Limited</h2>
        <p class="text-lg">5th Floor, The CORE Building, No. 62, ICT Avenue, Cybercity, Ebene, Mauritius</p>
      </div>
      
      <div class="bill-to">
        <h3>Bill to</h3>
        <p class="text-lg font-semibold">${selection.email}</p>
        <p class="text-lg">Customer Name</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
          <div>
            <p class="font-semibold">Receipt Date</p>
            <p class="text-lg">${new Date().toISOString().split("T")[0]}</p>
          </div>
          <div>
            <p class="font-semibold">Due Date</p>
            <p class="text-lg">${
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0]
            }</p>
          </div>
        </div>
      </div>
      
      <div style="padding: 40px;">
        <h3 class="mb-6">Item Details</h3>
        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${selection.plan} Plan - Monthly Subscription</td>
              <td>1</td>
              <td>ETB ${selection.amount}</td>
              <td>ETB ${selection.amount}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="total-section">
        <p class="text-2xl font-bold">TOTAL: ETB ${selection.amount}</p>
        <p class="text-lg mt-6">Payment Method: Chapa Pay</p>
        <p class="text-lg">Status: <strong>PAID</strong></p>
      </div>
      
      <div class="footer">
        <p class="text-lg">Thank you for your business!</p>
        <p class="text-lg">For any inquiries, please contact support@alxfoundation.com</p>
      </div>
    </div>
  </body>
  </html>
  `;

  // Set headers for PDF download
  res.setHeader("Content-Type", "text/html");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="receipt-${selection.tx_ref || "unknown"}.html"`
  );
  res.send(receiptHtml);
});

app.listen(PORT, () => console.log("🚀 Server running on port:", PORT));
