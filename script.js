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

// Set initial message
chatWindow.textContent = "👋 Hello! How can I help you today?";

// Array to hold selected products
let selectedProducts = [];

// Array to hold the full chat conversation history
let messages = [
  {
    role: "system",
    content:
      "You are a helpful skincare and haircare advisor for L'Oréal products. You MUST only answer questions about beauty routines, skincare products, haircare products, and makeup advice. If someone asks about anything else (politics, sports, food, general topics, etc.), politely redirect them back to beauty topics by saying 'I can only help with skincare, haircare, and beauty advice. What would you like to know about your beauty routine?' Stay focused on beauty and L'Oréal product recommendations only.",
  },
];

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
  // Clear the initial greeting and show a loading message
  chatWindow.innerHTML =
    '<div class="msg ai loading">Generating your routine... Please wait.</div>';

  // Create a prompt using the selected product names
  const preferences = selectedProducts.map((p) => p.name).join(", ");
  const userPrompt = `Here are my favorite products: ${preferences}. Please generate a short skincare or haircare routine for me using these products.`;

  // Reset the messages array for a new routine but keep the system prompt
  messages = [
    {
      role: "system",
      content:
        "You are the personification of L'Oréal, who doubles as a helpful skincare and haircare advisor for L'Oréal products. You MUST only answer questions about beauty routines, skincare products, haircare products, and makeup advice. If someone asks about anything else (politics, sports, food, general topics, etc.), politely redirect them back to beauty topics by saying 'I can only help with skincare, haircare, and beauty advice. What would you like to know about your beauty routine?' Stay focused on beauty and L'Oréal product recommendations only. I want the user to feel as if they are speaking directly to a personification of L'Oréal, who simply wants their customers to have knowledge and access to the best skincare and haircare.",
    },
    { role: "user", content: userPrompt },
  ];

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
      chatWindow.innerHTML = `<div class="msg ai"><strong>L'Oréal:</strong> ${formatted}</div>`;
      messages.push({ role: "assistant", content: aiMessage });
    } else {
      // Show an error if the response is not as expected
      chatWindow.innerHTML = `
        <div class="msg ai"><strong>L'Oréal:</strong> Sorry, I could not generate a routine. Please try again.</div>
        <div class="msg ai"><small>Debug info: ${JSON.stringify(
          data
        )}</small></div>
      `;
    }
  } catch (error) {
    // Show an error message if something goes wrong
    chatWindow.innerHTML = `<div class="msg ai"><strong>L'Oréal:</strong> Error: ${error.message}</div>`;
  }
}

async function handleChatFollowUp(userInput) {
  // Add the user's follow-up question to the messages array
  messages.push({ role: "user", content: userInput });

  // Check if this is the first interaction and clear the greeting
  const hasGreeting = chatWindow.textContent.includes(
    "👋 Hello! How can I help you today?"
  );
  if (hasGreeting) {
    chatWindow.innerHTML = "";
  }

  // Show a loading message while waiting for the AI response
  chatWindow.innerHTML +=
    '<div class="msg ai loading">One moment while I think of a response...</div>';

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
      // Remove the loading message and add the AI response
      const loadingMsg = chatWindow.querySelector(".msg.ai.loading");
      if (loadingMsg) loadingMsg.remove();
      chatWindow.innerHTML += `<div class="msg ai"><strong>L'Oréal:</strong> ${formatted}</div>`;
      messages.push({ role: "assistant", content: aiMessage });
    } else {
      // Remove loading message and show error
      const loadingMsg = chatWindow.querySelector(".msg.ai.loading");
      if (loadingMsg) loadingMsg.remove();
      chatWindow.innerHTML += `
        <div class="msg ai"><strong>L'Oréal:</strong> Sorry, I could not answer your question. Please try again.</div>
        <div class="msg ai"><small>Debug info: ${JSON.stringify(
          data
        )}</small></div>
      `;
    }
  } catch (error) {
    // Remove loading message and show error
    const loadingMsg = chatWindow.querySelector(".msg.ai.loading");
    if (loadingMsg) loadingMsg.remove();
    chatWindow.innerHTML += `<div class="msg ai"><strong>L'Oréal:</strong> Error: ${error.message}</div>`;
  }
}

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

  // Show all products if "All" is selected or no category is selected
  if (selectedCategory && selectedCategory !== "all") {
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
  // Add "All" option if not already present
  if (!categoryFilter.querySelector('option[value="all"]')) {
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All";
    categoryFilter.insertBefore(allOption, categoryFilter.firstChild);
  }

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
    clearBtn.className = "clear-all-btn";
    // Remove margin and generate-btn class, position absolutely in parent
    const selectedProductsBox = selectedProductsList.parentElement;
    selectedProductsBox.style.position = "relative";
    selectedProductsBox.appendChild(clearBtn);
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

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const userInput = document.getElementById("userInput").value;
  if (!userInput.trim()) return;

  // Check if this is the first interaction and clear the greeting
  const hasGreeting = chatWindow.textContent.includes(
    "👋 Hello! How can I help you today?"
  );
  if (hasGreeting) {
    chatWindow.innerHTML = "";
  }

  // Show the user's question in the chat window with bubble styling and bold label
  chatWindow.innerHTML += `<div class="msg user"><strong>You:</strong> ${userInput}</div>`;
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
