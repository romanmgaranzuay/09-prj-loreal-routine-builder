/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

// Array to hold selected products
let selectedProducts = [];

// Array to hold the full chat conversation history
let messages = [];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

// Function to generate a routine using Mistral's Chat Completion API
async function generateRoutineWithMistral(selectedProducts) {
  // The selectedProducts array comes from products.json and contains the user's chosen products.
  // We send the names of these products to the AI so it can recommend the best routine based on the user's selection.

  // Show a loading message in the chat window
  chatWindow.innerHTML = "<p>Generating your routine... Please wait.</p>";

  // Prepare the user prompt based on selected products
  const preferences = selectedProducts.map((p) => p.name).join(", ");
  const userPrompt = `Here are my favorite products: ${preferences}. Please generate a short skincare or haircare routine for me using these products.`;

  // Reset the messages array for a new routine
  messages = [];
  messages.push({ role: "user", content: userPrompt });

  // Prepare the API request body
  const requestBody = {
    model: "mistral-small-latest",
    messages: messages,
    max_tokens: 800,
  };

  try {
    // Make the fetch request to Cloudflare Worker (proxy for Mistral's API)
    const response = await fetch(
      "https://skincare-advice.romanmgaranzuay.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // No API key needed here, it's stored in the worker
        },
        body: JSON.stringify(requestBody),
      }
    );

    // Parse the response JSON
    const data = await response.json();

    // Display the routine in the chat window and add to messages
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const aiMessage = data.choices[0].message.content;
      // Convert Markdown to HTML for consistent formatting
      const formatted = markdownToHtml(aiMessage);
      chatWindow.innerHTML = formatted;
      messages.push({ role: "assistant", content: aiMessage });
    } else {
      chatWindow.innerHTML =
        "<p>Sorry, I could not generate a routine. Please try again.</p>";
    }
  } catch (error) {
    // Show an error message if something goes wrong
    chatWindow.innerHTML = `<p>Error: ${error.message}</p>`;
  }
}

// Function to handle chat follow-up questions
async function handleChatFollowUp(userInput) {
  // Add the user's question to the conversation history
  messages.push({ role: "user", content: userInput });

  // Show a loading message
  chatWindow.innerHTML += `<p><em>Thinking...</em></p>`;

  // Prepare the API request body with the full conversation
  const requestBody = {
    model: "mistral-small-latest",
    messages: messages,
    max_tokens: 800,
  };

  try {
    // Make the fetch request to Cloudflare Worker (proxy for Mistral's API)
    const response = await fetch(
      "https://skincare-advice.romanmgaranzuay.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // No API key needed here, it's stored in the worker
        },
        body: JSON.stringify(requestBody),
      }
    );

    // Parse the response JSON
    const data = await response.json();

    // Display the AI's answer and add to messages
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const aiMessage = data.choices[0].message.content;
      const formatted = markdownToHtml(aiMessage);
      chatWindow.innerHTML += formatted;
      messages.push({ role: "assistant", content: aiMessage });
    } else {
      chatWindow.innerHTML +=
        "<p>Sorry, I could not answer that. Please try again.</p>";
    }
  } catch (error) {
    chatWindow.innerHTML += `<p>Error: ${error.message}</p>`;
  }

  // Scroll to the bottom of the chat window
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Add event listener to the Generate Routine button
const generateRoutineBtn = document.getElementById("generateRoutine");
generateRoutineBtn.addEventListener("click", () => {
  // Only generate a routine if at least one product is selected
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML =
      "<p>Please select at least one product to generate a routine.</p>";
    return;
  }
  generateRoutineWithMistral(selectedProducts);
});

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card${
      selectedProducts.some((p) => p.id === product.id) ? " selected" : ""
    }" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
      <div class="product-overlay">
        <p>${product.description}</p>
      </div>
    </div>
  `
    )
    .join("");

  // Get all product cards and add click event listeners
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", () => {
      // Toggle the 'selected' class on click
      card.classList.toggle("selected");

      // Get the product id from the card
      const productId = Number(card.getAttribute("data-id"));
      // Find the product object by id
      const product = products.find((p) => p.id === productId);

      // If selected, add to selectedProducts; if deselected, remove
      if (card.classList.contains("selected")) {
        // Only add if not already in the list
        if (!selectedProducts.some((p) => p.id === productId)) {
          selectedProducts.push(product);
        }
      } else {
        // Remove from selectedProducts
        selectedProducts = selectedProducts.filter((p) => p.id !== productId);
      }

      // Save selected products to localStorage
      saveSelectedProducts();

      // Update the selected products list in the UI
      displaySelectedProducts();
    });
  });
}

/* Load selected products from localStorage (if any) when the page loads */
window.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    // Parse the saved products and display them
    selectedProducts = JSON.parse(saved);
    displaySelectedProducts();
  }
});

// Save selected products to localStorage
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

/* Display selected products in the selected-products list, with remove and clear all buttons */
function displaySelectedProducts() {
  const selectedProductsList = document.getElementById("selectedProductsList");
  // Add a Clear All button if there are any selected products
  const clearAllBtn = document.getElementById("clearAllBtn");
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = "<p>No products selected.</p>";
    if (clearAllBtn) clearAllBtn.style.display = "none";
    return;
  }
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product, idx) => `
      <div class="selected-product">
        <img src="${product.image}" alt="${product.name}" title="${product.name}" style="width:40px; height:40px; object-fit:contain; border-radius:4px;">
        <span>${product.name}</span>
        <button class="remove-btn" data-index="${idx}" title="Remove">&times;</button>
      </div>
    `
    )
    .join("");
  // Show or add the Clear All button
  let clearBtn = document.getElementById("clearAllBtn");
  if (!clearBtn) {
    clearBtn = document.createElement("button");
    clearBtn.id = "clearAllBtn";
    clearBtn.textContent = "Clear All";
    clearBtn.className = "generate-btn";
    clearBtn.style.marginTop = "10px";
    selectedProductsList.parentElement.appendChild(clearBtn);
    clearBtn.addEventListener("click", () => {
      selectedProducts = [];
      saveSelectedProducts();
      displaySelectedProducts();
      // Also update product cards if visible
      const cards = document.querySelectorAll(".product-card.selected");
      cards.forEach((card) => card.classList.remove("selected"));
    });
  }
  clearBtn.style.display = "block";
  // Add event listeners to remove buttons
  const removeBtns = document.querySelectorAll(".remove-btn");
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent card click
      const idx = Number(btn.getAttribute("data-index"));
      selectedProducts.splice(idx, 1);
      saveSelectedProducts();
      displaySelectedProducts();
      // Also update product cards if visible
      const cards = document.querySelectorAll(".product-card");
      cards.forEach((card) => {
        const cardId = Number(card.getAttribute("data-id"));
        if (!selectedProducts.some((p) => p.id === cardId)) {
          card.classList.remove("selected");
        }
      });
    });
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const userInput = document.getElementById("userInput").value;
  if (!userInput.trim()) return;
  // Show the user's question in the chat window
  chatWindow.innerHTML += `<p><strong>You:</strong> ${userInput}</p>`;
  document.getElementById("userInput").value = "";
  // Send the follow-up question to the AI
  handleChatFollowUp(userInput);
});

// Simple Markdown to HTML converter for headings, bold, and lists
function markdownToHtml(markdown) {
  // Convert headings (###, ##, #)
  let html = markdown
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>");
  // Convert bold (**text** or __text__)
  html = html.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/gim, "<strong>$1</strong>");
  // Convert unordered lists
  html = html.replace(/^- (.*$)/gim, "<li>$1</li>");
  // Wrap <li> items in <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>)/gim, "<ul>$1</ul>");
  // Convert line breaks
  html = html.replace(/\n/g, "<br>");
  return html.trim();
}
