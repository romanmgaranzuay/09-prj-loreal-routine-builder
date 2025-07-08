/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const searchInput = document.createElement("input");
searchInput.type = "text";
searchInput.id = "productSearch";
searchInput.placeholder = "Search products by name or keyword...";
// Add some basic styling for the search box
searchInput.style.width = "100%";
searchInput.style.padding = "12px";
searchInput.style.margin = "10px 0";
searchInput.style.fontSize = "16px";
searchInput.style.border = "2px solid #ccc";
searchInput.style.borderRadius = "8px";

// Array to hold selected products
let selectedProducts = [];

// Array to hold the full chat conversation history
let messages = [];

// Store all loaded products for filtering
let allProducts = [];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

// Add code here
async function generateRoutineWithOpenAI(selectedProducts) {
  // Show a loading message while waiting for the AI response
  chatWindow.innerHTML = "<p>Generating your routine... Please wait.</p>";

  // Create a prompt using the selected product names
  const preferences = selectedProducts.map((p) => p.name).join(", ");
  const userPrompt = `Here are my favorite products: ${preferences}. Please generate a short skincare or haircare routine for me using these products.`;

  // Reset the messages array for a new routine
  messages = [];
  messages.push(
    // { role: "system", content: "You are a helpful skincare and haircare advisor. Only answer questions about routines, products, and beauty advice. Stay on topic and do not answer unrelated questions." },
    { role: "user", content: userPrompt }
  );

  // Prepare the request body with only the messages array
  const requestBody = {
    model: "gpt-4o-search-preview",
    messages: messages,
    max_tokens: 800,
  };

  try {
    // Send the request directly to the Mistral API with your API key
    const apiUrl = "https://lorealchatbot.romanmgaranzuay.workers.dev/";
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // Parse the response from the AI
    const data = await response.json();

    // Check if the response contains a valid AI message
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const aiMessage = data.choices[0].message.content;
      // Convert Markdown to HTML for display
      const formatted = markdownToHtml(aiMessage);
      chatWindow.innerHTML = formatted;
      messages.push({ role: "assistant", content: aiMessage });
    } else {
      // Show an error if the response is not as expected
      chatWindow.innerHTML = `
        <p>Sorry, I could not generate a routine. Please try again.</p>
        <p><small>Debug info: ${JSON.stringify(data)}</small></p>
      `;
    }
  } catch (error) {
    // Show an error message if something goes wrong
    chatWindow.innerHTML = `<p>Error: ${error.message}</p>`;
  }
}

async function handleChatFollowUp(userInput) {
  // Add the user's follow-up question to the messages array
  messages.push({ role: "user", content: userInput });

  // Show a loading message while waiting for the AI response
  chatWindow.innerHTML += `<p><em>AI is thinking...</em></p>`;

  // Prepare the request body with the updated messages array
  const requestBody = {
    model: "gpt-4o-search-preview",
    messages: messages,
    max_tokens: 800,
  };

  try {
    // Send the request to the API
    const apiUrl = "https://lorealchatbot.romanmgaranzuay.workers.dev/";
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // Parse the response from the AI
    const data = await response.json();

    // Check if the response contains a valid AI message
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const aiMessage = data.choices[0].message.content;
      // Convert Markdown to HTML for display
      const formatted = markdownToHtml(aiMessage);
      chatWindow.innerHTML += `<div>${formatted}</div>`;
      messages.push({ role: "assistant", content: aiMessage });
    } else {
      chatWindow.innerHTML += `
        <p>Sorry, I could not answer your question. Please try again.</p>
        <p><small>Debug info: ${JSON.stringify(data)}</small></p>
      `;
    }
  } catch (error) {
    chatWindow.innerHTML += `<p>Error: ${error.message}</p>`;
  }
}

/* 
  --- Product Search Feature ---
  This code adds a search box above the products grid.
  Users can type to filter products by name, brand, or description.
  The search works together with the category filter.
*/

// Insert the search input above the products grid
const productsSection = document.getElementById("productsContainer");
productsSection.parentNode.insertBefore(searchInput, productsSection);

// 5. Filter products by category and search input
async function filterAndDisplayProducts() {
  // If products haven't loaded yet, load them
  if (allProducts.length === 0) {
    allProducts = await loadProducts();
  }
  const selectedCategory = categoryFilter.value;
  const searchValue = searchInput.value.toLowerCase();

  // Start with all products
  let filtered = allProducts;

  // Filter by category if one is selected
  if (selectedCategory) {
    filtered = filtered.filter(
      (product) => product.category === selectedCategory
    );
  }

  // Further filter by search keyword
  if (searchValue) {
    filtered = filtered.filter(
      (product) =>
        product.name.toLowerCase().includes(searchValue) ||
        product.brand.toLowerCase().includes(searchValue) //||
    );
  }

  displayProducts(filtered);
}

// 6. Listen for changes in the category filter and search input
categoryFilter.addEventListener("change", filterAndDisplayProducts);
searchInput.addEventListener("input", filterAndDisplayProducts);

// Add event listener to the Generate Routine button
const generateRoutineBtn = document.getElementById("generateRoutine");
generateRoutineBtn.addEventListener("click", () => {
  // Only generate a routine if at least one product is selected
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML =
      "<p>Please select at least one product to generate a routine.</p>";
    return;
  }
  generateRoutineWithOpenAI(selectedProducts);
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
  // Convert Markdown links [text](url) to HTML <a> tags
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gim,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  // Convert unordered lists
  html = html.replace(/^- (.*$)/gim, "<li>$1</li>");
  // Wrap <li> items in <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>)/gim, "<ul>$1</ul>");
  // Convert line breaks
  html = html.replace(/\n/g, "<br>");
  return html.trim();
}
