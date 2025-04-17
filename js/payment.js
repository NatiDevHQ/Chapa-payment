const publicKey = CHAPA_PUBLIC_KEY;
// Product configuration
const product = {
  name: "Premium Subscription",
  price: 100, // in ETB
  description: "Monthly access to premium features",
};

// State management
let quantity = 1;
let totalAmount = product.price * quantity;

// DOM elements
const quantityValue = document.getElementById("quantity-value");
const decrementBtn = document.getElementById("decrement-qty");
const incrementBtn = document.getElementById("increment-qty");
const successMessage = document.getElementById("success-message");
const errorMessage = document.getElementById("error-message");

// Initialize product info
function initProductInfo() {
  document.getElementById("product-name").textContent = product.name;
  document.getElementById("unit-price").textContent = `${product.price} ETB`;
  updateTotalAmount();
}

// Update quantity
function updateQuantity(newQty) {
  if (newQty < 1) newQty = 1;
  if (newQty > 10) newQty = 10;

  quantity = newQty;
  quantityValue.textContent = quantity;
  totalAmount = product.price * quantity;
  updateTotalAmount();
  initializeChapa();
}

// Update total amount display
function updateTotalAmount() {
  document.getElementById("total-amount").textContent = `${totalAmount} ETB`;
}

// Generate transaction reference
function generateTxRef() {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substr(2, 8);
  return `tx_${randomString}_${timestamp}`;
}

// Initialize Chapa payment
function initializeChapa() {
  // Clear previous form
  const formContainer = document.getElementById("chapa-inline-form");
  formContainer.innerHTML = "";

  // Hide messages
  successMessage.style.display = "none";
  errorMessage.style.display = "none";

  try {
    const chapa = new ChapaCheckout({
      publicKey: publicKey,
      // Replace with your actual key
      amount: totalAmount.toString(),
      currency: "ETB",
      tx_ref: generateTxRef(),
      availablePaymentMethods: [
        "telebirr",
        "cbebirr",
        "ebirr",
        "mpesa",
        "chapa",
      ],
      customizations: {
        title: "Complete Payment",
        description: `${quantity} × ${product.name}`,
        buttonText: `Pay ${totalAmount} ETB`,
        styles: `
        .chapa-pay-button {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white;
          padding: 16px;
          border: none;
          border-radius: var(--radius);
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          width: 100%;
          transition: var(--transition);
          box-shadow: 0 4px 15px rgba(108, 92, 231, 0.3);
        }
        .chapa-pay-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(108, 92, 231, 0.4);
        }
        .chapa-pay-button:active {
          transform: translateY(0);
        }
        .chapa-payment-form {
          font-family: 'Poppins', sans-serif;
        }
        .chapa-phone-input, .chapa-payment-method {
          border-radius: var(--radius) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
          padding: 12px 15px !important;
        }
      `,
        successMessage: "Thank you for your payment!",
      },
      callbackUrl: `https://yourdomain.com/callback?product=${encodeURIComponent(
        product.name
      )}&quantity=${quantity}`,
      returnUrl: "https://yourdomain.com/success",
      onSuccessfulPayment: function (data) {
        successMessage.textContent = `Payment successful! Transaction ID: ${data.tx_ref}`;
        successMessage.style.display = "block";
        formContainer.classList.add("pulse");

        // You can redirect here or show a success page
        // setTimeout(() => {
        //   window.location.href = `/success?tx_ref=${data.tx_ref}`;
        // }, 2000);
      },
      onPaymentFailure: function (data) {
        errorMessage.textContent =
          "Payment failed. Please try again or contact support.";
        errorMessage.style.display = "block";
        console.error("Payment failed:", data);
      },
      onClose: function () {
        console.log("Payment popup closed by user");
      },
    });

    chapa.initialize("chapa-inline-form");
  } catch (error) {
    errorMessage.textContent =
      "Failed to initialize payment. Please refresh the page.";
    errorMessage.style.display = "block";
    console.error("Initialization error:", error);
  }
}

// Event listeners
decrementBtn.addEventListener("click", () => updateQuantity(quantity - 1));
incrementBtn.addEventListener("click", () => updateQuantity(quantity + 1));

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  initProductInfo();
  initializeChapa();
});
