/**
 * Wooden Street FAQ & Conversational Support System
 * Production-Grade Frontend Component Logic
 * Features: Modular structure, keyboard navigation, fuzzy chatbot matching, text highlighting.
 */

// ==========================================
// 1. FAQ Structural Dataset
// ==========================================
const FAQ_DATABASE = [
    {
        id: "orders",
        title: "Order & Tracking",
        ariaLabel: "Order and tracking category",
        icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
        questions: [
            {
                q: "How can I check my order status?",
                a: "<p>You can track your order status in real time by clicking on the <strong>'Track My Order'</strong> quick card at the top of this page and entering your Order ID.</p><p>Alternatively, you can log into your Wooden Street Account, head to the 'My Orders' section, and check the current transit milestone. You will also receive automatic SMS updates at every stage of dispatch.</p>"
            },
            {
                q: "Can I change my delivery address after placing an order?",
                a: "<p>Yes, address changes are permitted if the order has not yet been dispatched from our central warehouse.</p><p>To update your delivery address, please contact our support team immediately via chat or raise a service ticket with the new address details. Once dispatched, routing changes are not possible.</p>"
            },
            {
                q: "How do I cancel my order?",
                a: "<p>You can request cancellation within 24 hours of placing the order for a full refund. Cancellations after 24 hours are subject to a processing charge of 10% since production on solid wood furniture starts immediately.</p><p>Please raise a support ticket or ping our chatbot assistant with your Order ID to initiate cancellation.</p>"
            },
            {
                q: "Why has my delivery been delayed?",
                a: "<p>Solid wood furniture crafting goes through rigorous seasoning, manufacturing, and polishing stages. Sometimes a batch check might require extra polishing or quality audit, resulting in a short delay.</p><p>Other reasons include weather anomalies, logistics congestion, or octroi checks. We promise to communicate any changes to your delivery window proactively via email and SMS.</p>"
            }
        ]
    },
    {
        id: "payments",
        title: "Payments & Refunds",
        ariaLabel: "Payments and refunds category",
        icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`,
        questions: [
            {
                q: "What payment options do you support?",
                a: "<p>Wooden Street supports a wide variety of secure payment channels:</p><ul><li>All major Credit & Debit cards (Visa, Mastercard, RuPay, Amex)</li><li>Net Banking across all major banks</li><li>UPI Payments (Google Pay, PhonePe, Paytm, BHIM)</li><li>No-Cost EMI plans on selected credit cards and finance partners</li><li>Cash on Delivery (COD) for orders up to ₹15,000</li></ul>"
            },
            {
                q: "How long does a refund take to process?",
                a: "<p>Once our quality team confirms the return or cancellation, the refund is initiated within 48 business hours.</p><p>The amount will reflect back in your bank account or card balance within <strong>5 to 7 business days</strong>, depending on your card issuer or banking institution's standard transaction clearance cycles.</p>"
            },
            {
                q: "Is No-Cost EMI available?",
                a: "<p>Yes! We offer 3-month and 6-month No-Cost EMI options on credit cards from HDFC, ICICI, SBI, Axis Bank, and Kotak Mahindra. The interest charged by the bank is given as an upfront discount on your checkout total, making it interest-free for you.</p>"
            }
        ]
    },
    {
        id: "shipping",
        title: "Shipping & Assembly",
        ariaLabel: "Shipping and assembly category",
        icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="1" y="3" width="15" height="13" rx="2" ry="2"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`,
        questions: [
            {
                q: "Do you charge for shipping or delivery?",
                a: "<p>Shipping and delivery are <strong>absolutely free</strong> for all orders above ₹5,000 across major pin codes in India. For orders below ₹5,000, a nominal shipping charge of ₹299 is applicable at checkout.</p>"
            },
            {
                q: "Who will assemble my furniture?",
                a: "<p>Wooden Street provides <strong>free expert assembly services</strong> for all products that require installation (e.g., beds, wardrobes, study tables). Our professional technicians will visit your home within 24 to 48 hours of product delivery to complete the setup safely.</p>"
            },
            {
                q: "Can I schedule my delivery for a specific date?",
                a: "<p>Yes! Once your item reaches our local delivery hub, our logistics partner will call you to coordinate a delivery slot. You can request them to hold the shipment or schedule it for a specific date that suits you (up to 7 days of storage is free of charge).</p>"
            }
        ]
    },
    {
        id: "returns",
        title: "Returns & Warranty",
        ariaLabel: "Returns and warranty category",
        icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>`,
        questions: [
            {
                q: "What is your return policy?",
                a: "<p>We follow a <strong>7-day Replacement or Repair Policy</strong> in case the product arrives with manufacturing defects, structural damage, or incorrect dimensions.</p><p>Please raise a support ticket or contact customer care within 7 days of receipt, uploading clear images and video of the issue. We will schedule a technician inspection or arrange a replacement accordingly.</p>"
            },
            {
                q: "Is there a warranty on the furniture?",
                a: "<p>Yes, all Wooden Street solid wood furniture comes with a comprehensive <strong>1-Year Warranty</strong> covering manufacturing defects, wood splitting, termite issues, and structural integrity.</p><p>Warranty does not cover wear and tear, cuts or scratches caused by accidents, or damage due to exposure to direct sunlight or moisture.</p>"
            },
            {
                q: "What happens if a product is damaged during transit?",
                a: "<p>If you notice physical damage on the packaging box or the product during unboxing, please note it on the Proof of Delivery (POD) receipt and capture photos immediately.</p><p>Report the issue to us within 48 hours, and we will initiate a priority return and shipment of a fresh unit at no additional charge.</p>"
            }
        ]
    },
    {
        id: "customization",
        title: "Customization & Wood",
        ariaLabel: "Customization and wood details category",
        icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`,
        questions: [
            {
                q: "Can I customize the size or finish of a bed or sofa?",
                a: "<p>Absolutely! We are known as India's premier custom furniture brand. You can customize the wood finish (Honey, Walnut, Stone), fabric color/material (Velvet, Cotton, Linen), and size dimensions.</p><p>Look for the 'Customize This Product' button on the product detail page, or speak directly to a sales consultant using our Chatbot widget or local store.</p>"
            },
            {
                q: "What kind of wood do you use?",
                a: "<p>We source only premium quality <strong>Solid Wood</strong> including seasoned <strong>Sheesham Wood (Indian Rosewood)</strong> and high-grade <strong>Mango Wood</strong>. All our wood is chemically seasoned in kiln chambers and vacuum-treated for lifetime protection against termites, moisture, and warping.</p>"
            },
            {
                q: "Where can I see the wood finishes in person?",
                a: "<p>You can visit any of our 90+ Wooden Street Experience Stores across India to touch, feel, and see our wood finishes, fabrics, and structural quality. Use our Store Locator above to find the nearest experience studio.</p>"
            }
        ]
    }
];

// ==========================================
// 2. Application Core State Management
// ==========================================
const appState = {
    currentCategoryIdx: 0,
    currentQuestionIdx: null,
    searchQuery: "",
    chatbotOpen: false,
    chatbotHistory: [],
    feedbackStates: {} // Maps query index to like/dislike choice
};

// ==========================================
// 3. UI Rendering & DOM Synchronization
// ==========================================
const DOM = {
    categoryList: document.getElementById("category-list-element"),
    questionList: document.getElementById("question-list-element"),
    categoryTitle: document.getElementById("active-category-title"),
    questionCount: document.getElementById("active-question-count"),
    placeholder: document.getElementById("answer-placeholder-element"),
    contentCard: document.getElementById("answer-content-card-element"),
    answerTitle: document.getElementById("displayed-answer-title"),
    answerBody: document.getElementById("displayed-answer-body"),
    searchInput: document.getElementById("faq-search-input"),
    searchClearBtn: document.getElementById("search-clear-btn"),
    feedbackYes: document.getElementById("btn-feedback-yes"),
    feedbackNo: document.getElementById("btn-feedback-no"),
    feedbackSuccess: document.getElementById("feedback-success-msg")
};

/**
 * Wraps matching query terms in text with highlighting tags.
 */
function highlightSearchTerms(text, query) {
    if (!query) return text;
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

/**
 * Render the L1 categories in the Left column.
 */
function renderSidebar() {
    if (!DOM.categoryList) return;
    DOM.categoryList.innerHTML = "";
    
    FAQ_DATABASE.forEach((category, idx) => {
        const item = document.createElement("li");
        item.className = `category-item ${idx === appState.currentCategoryIdx ? "active" : ""}`;
        item.setAttribute("role", "tab");
        item.setAttribute("aria-selected", idx === appState.currentCategoryIdx ? "true" : "false");
        item.setAttribute("tabindex", "0");
        item.setAttribute("aria-label", category.ariaLabel);
        
        item.innerHTML = `
            <div class="category-label">
                ${category.icon}
                <span>${category.title}</span>
            </div>
            <span class="category-badge" aria-label="${category.questions.length} questions">${category.questions.length}</span>
        `;
        
        // Clicks
        item.addEventListener("click", () => selectCategory(idx));
        // Keyboard (Space/Enter)
        item.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                selectCategory(idx);
            }
        });
        
        DOM.categoryList.appendChild(item);
    });
}

function selectCategory(idx) {
    appState.currentCategoryIdx = idx;
    appState.currentQuestionIdx = null;
    appState.searchQuery = "";
    if (DOM.searchInput) DOM.searchInput.value = "";
    if (DOM.searchClearBtn) DOM.searchClearBtn.style.display = "none";
    
    renderSidebar();
    renderQuestionsList();
    clearAnswerPanel();
}

/**
 * Render the questions under selected category or search results in the Middle column.
 */
function renderQuestionsList(customQuestions = null) {
    if (!DOM.questionList) return;
    DOM.questionList.innerHTML = "";
    
    const list = customQuestions || FAQ_DATABASE[appState.currentCategoryIdx].questions;
    
    if (customQuestions) {
        DOM.categoryTitle.textContent = "Search Results";
        DOM.questionCount.textContent = `${list.length} questions found`;
    } else {
        DOM.categoryTitle.textContent = FAQ_DATABASE[appState.currentCategoryIdx].title;
        DOM.questionCount.textContent = `${list.length} questions`;
    }
    
    if (list.length === 0) {
        DOM.questionList.innerHTML = `
            <li class="no-results-msg" style="padding: 30px; text-align: center; color: var(--text-muted); font-size: 13.5px;">
                No questions found. Try general keywords like "refund", "delivery" or "wood finish".
            </li>
        `;
        return;
    }
    
    list.forEach((item, idx) => {
        const itemEl = document.createElement("li");
        itemEl.className = `question-item ${idx === appState.currentQuestionIdx ? "active" : ""}`;
        itemEl.setAttribute("role", "button");
        itemEl.setAttribute("tabindex", "0");
        
        // Highlight terms if search is active
        const qTitle = highlightSearchTerms(item.q, appState.searchQuery);
        
        itemEl.innerHTML = `
            <span>${qTitle}</span>
            <svg class="question-chevron" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
        `;
        
        // Selection handlers
        const select = () => {
            appState.currentQuestionIdx = idx;
            const siblings = DOM.questionList.querySelectorAll(".question-item");
            siblings.forEach(el => el.classList.remove("active"));
            itemEl.classList.add("active");
            displayAnswer(item);
        };
        
        itemEl.addEventListener("click", select);
        itemEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                select();
            }
        });
        
        DOM.questionList.appendChild(itemEl);
    });
}

/**
 * Render selected Answer on the Right pane.
 */
function displayAnswer(item) {
    if (!DOM.contentCard) return;
    DOM.placeholder.style.display = "none";
    DOM.contentCard.style.display = "flex";
    
    const highlightedQ = highlightSearchTerms(item.q, appState.searchQuery);
    const highlightedA = highlightSearchTerms(item.a, appState.searchQuery);
    
    DOM.answerTitle.innerHTML = highlightedQ;
    DOM.answerBody.innerHTML = highlightedA;
    
    // Reset feedback UI
    const feedbackKey = `${appState.currentCategoryIdx}-${appState.currentQuestionIdx}`;
    if (appState.feedbackStates[feedbackKey]) {
        DOM.feedbackYes.style.display = "none";
        DOM.feedbackNo.style.display = "none";
        DOM.feedbackSuccess.style.display = "block";
        DOM.feedbackSuccess.textContent = "Thank you for rating this answer!";
    } else {
        DOM.feedbackYes.style.display = "flex";
        DOM.feedbackNo.style.display = "flex";
        DOM.feedbackSuccess.style.display = "none";
    }
}

function clearAnswerPanel() {
    if (!DOM.contentCard) return;
    DOM.placeholder.style.display = "flex";
    DOM.contentCard.style.display = "none";
}

// Search Inputs
if (DOM.searchInput) {
    DOM.searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim();
        appState.searchQuery = query;
        
        if (query.length > 0) {
            if (DOM.searchClearBtn) DOM.searchClearBtn.style.display = "block";
            
            // Search across entire category tree
            let matchingQuestions = [];
            FAQ_DATABASE.forEach(cat => {
                cat.questions.forEach(qItem => {
                    const matchQ = qItem.q.toLowerCase().includes(query.toLowerCase());
                    const matchA = qItem.a.toLowerCase().includes(query.toLowerCase());
                    if (matchQ || matchA) {
                        matchingQuestions.push(qItem);
                    }
                });
            });
            appState.currentQuestionIdx = null;
            renderQuestionsList(matchingQuestions);
            clearAnswerPanel();
        } else {
            if (DOM.searchClearBtn) DOM.searchClearBtn.style.display = "none";
            renderSidebar();
            renderQuestionsList();
            clearAnswerPanel();
        }
    });
}

if (DOM.searchClearBtn) {
    DOM.searchClearBtn.addEventListener("click", () => {
        DOM.searchInput.value = "";
        appState.searchQuery = "";
        DOM.searchClearBtn.style.display = "none";
        renderSidebar();
        renderQuestionsList();
        clearAnswerPanel();
    });
}

// Popular Quick Tags
document.querySelectorAll(".trend-tag").forEach(tag => {
    tag.addEventListener("click", () => {
        const text = tag.textContent;
        if (DOM.searchInput) {
            DOM.searchInput.value = text;
            DOM.searchInput.dispatchEvent(new Event("input"));
        }
    });
});

// Feedback handlers
if (DOM.feedbackYes && DOM.feedbackNo) {
    DOM.feedbackYes.addEventListener("click", () => recordFeedback(true));
    DOM.feedbackNo.addEventListener("click", () => recordFeedback(false));
}

function recordFeedback(liked) {
    const key = `${appState.currentCategoryIdx}-${appState.currentQuestionIdx}`;
    appState.feedbackStates[key] = liked ? "liked" : "disliked";
    
    DOM.feedbackYes.style.display = "none";
    DOM.feedbackNo.style.display = "none";
    DOM.feedbackSuccess.style.display = "block";
    DOM.feedbackSuccess.textContent = liked 
        ? "Glad to help! Thanks for rating." 
        : "Thanks for reporting. We will update this answer.";
}

// ==========================================
// 4. Custom Support Modals (Ticket / Tracker)
// ==========================================
const modalTrack = document.getElementById("modal-track-order");
const modalTicket = document.getElementById("modal-raise-ticket");

function initModals() {
    const trackCard = document.getElementById("action-track-order");
    const ticketCard = document.getElementById("action-raise-ticket");
    const ticketBanner = document.getElementById("btn-raise-ticket-banner");
    const storeLocator = document.getElementById("action-store-locator");
    
    if (trackCard) trackCard.addEventListener("click", () => openModal(modalTrack));
    if (ticketCard) ticketCard.addEventListener("click", () => openModal(modalTicket));
    if (ticketBanner) ticketBanner.addEventListener("click", () => openModal(modalTicket));
    
    if (storeLocator) {
        storeLocator.addEventListener("click", () => {
            alert("Redirecting to Wooden Street Store Locator page...\nOver 90+ studios in Bangalore, Mumbai, Chennai, Pune, Jaipur, and more!");
        });
    }
    
    document.querySelectorAll(".modal-close-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            closeAllModals();
        });
    });
    
    // Close on overlay click
    window.addEventListener("click", (e) => {
        if (e.target === modalTrack) closeModal(modalTrack);
        if (e.target === modalTicket) closeModal(modalTicket);
    });

    // Close on ESC key
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeAllModals();
        }
    });
    
    // Submission - Track Order
    const trackSubmit = document.getElementById("btn-submit-track");
    if (trackSubmit) {
        trackSubmit.addEventListener("click", () => {
            const orderInput = document.getElementById("track-order-id").value.trim();
            const resultDiv = document.getElementById("track-result");
            
            if (!orderInput) {
                alert("Please enter a valid 6-digit Order ID.");
                return;
            }
            
            resultDiv.style.display = "block";
            resultDiv.innerHTML = `
                <div style="font-weight: 700; color: var(--primary-color); font-size: 13.5px; margin-bottom: 8px;">Order Tracker Info (#${orderInput})</div>
                <div style="font-size: 12.5px; line-height: 1.5; color: #444;">
                    <p>📦 <strong>Status:</strong> Seasoned & Polished (Kiln treatment complete)</p>
                    <p>🚚 <strong>Milestone:</strong> Out of Jodhpur factory, in Jaipur transit warehouse.</p>
                    <p>📅 <strong>Scheduled Delivery:</strong> 25-July-2026</p>
                    <div style="margin-top: 10px; height: 5px; background: #e5e5e5; border-radius: 4px; position: relative; overflow: hidden;">
                        <div style="position: absolute; top: 0; left: 0; width: 75%; height: 100%; background: var(--primary-color);"></div>
                    </div>
                </div>
            `;
        });
    }
    
    // Submission - Raise Ticket
    const ticketSubmit = document.getElementById("btn-submit-ticket");
    if (ticketSubmit) {
        ticketSubmit.addEventListener("click", () => {
            const type = document.getElementById("ticket-issue-type").value;
            const desc = document.getElementById("ticket-description").value.trim();
            
            if (!desc) {
                alert("Please enter a description of the issue.");
                return;
            }
            
            alert(`Complaint filed successfully!\nIssue: ${type}\nReference ID: WS-COMP-17849\nAn audit agent will reach out in 24 business hours.`);
            closeModal(modalTicket);
            document.getElementById("ticket-description").value = "";
        });
    }
}

function openModal(modal) {
    if (modal) modal.style.display = "flex";
}

function closeModal(modal) {
    if (modal) modal.style.display = "none";
}

function closeAllModals() {
    closeModal(modalTrack);
    closeModal(modalTicket);
}

// ==========================================
// 5. Intelligent Support Chatbot (Woody)
// ==========================================
const botState = {
    triggerBtn: document.getElementById("chatbot-trigger-btn"),
    windowPanel: document.getElementById("chat-window-element"),
    closeHeader: document.getElementById("chat-close-btn-header"),
    messagesContainer: document.getElementById("chat-messages-container"),
    textInput: document.getElementById("chat-text-input"),
    sendBtn: document.getElementById("chat-send-btn"),
    typingDots: document.getElementById("chat-typing-indicator-element"),
    replyContainer: document.getElementById("quick-reply-options-container")
};

// Keyword mapping for fuzzy replies
const BOT_KEYWORDS = {
    greetings: {
        keys: ["hi", "hello", "hey", "good morning", "good afternoon", "support"],
        reply: "Hello! 👋 I'm Woody, your Wooden Street helper. Ask me about your order, wood details, returns, or payment options!"
    },
    tracking: {
        keys: ["track", "status", "where is", "order id", "delivery status", "location"],
        reply: "📦 <strong>Track Order Status:</strong><br>You can input your Order ID inside the 'Track My Order' modal above. Alternatively, tell me your Order ID number here and I'll fetch itsजयपुर staging status."
    },
    refunds: {
        keys: ["refund", "cancel", "money", "returned money", "cancellation"],
        reply: "💰 <strong>Refund timeline:</strong><br>Refund approvals trigger within 48 hours of product pickup. Funds take 5-7 banking days to credit back to card balances or UPI accounts."
    },
    wood: {
        keys: ["wood", "quality", "material", "sheesham", "mango", "solid wood"],
        reply: "🪵 <strong>Solid Wood Quality:</strong><br>Our structures are crafted from chemical-seasoned, vacuum-treated <strong>Sheesham Wood (Rosewood)</strong> or durable <strong>Mango Wood</strong>, protected with structural warranty parameters."
    },
    delivery: {
        keys: ["delivery", "shipping", "charges", "charge", "free shipping", "assemble", "assembly"],
        reply: "🚚 <strong>Free Assembly & Delivery:</strong><br>We provide free delivery and assembly on orders exceeding ₹5,000. Setup technicians coordinate appointments within 24-48 hours of shipment arrival."
    },
    contact: {
        keys: ["agent", "human", "speak to", "phone", "number", "email", "customer care"],
        reply: "🧑 <strong>Support Team Contact:</strong><br>You can talk directly to an associate at <strong>+91-9314444747</strong> (9 AM to 9 PM) or email <strong>support@woodenstreet.com</strong>."
    }
};

function initChatbot() {
    if (!botState.triggerBtn) return;
    
    // Toggle Window panel
    botState.triggerBtn.addEventListener("click", () => {
        appState.chatbotOpen = !appState.chatbotOpen;
        botState.windowPanel.style.display = appState.chatbotOpen ? "flex" : "none";
        
        // Hide initial alert badge
        const badge = botState.triggerBtn.querySelector(".notification-badge");
        if (badge) badge.style.display = "none";
        
        // Switch trigger icon shapes
        botState.triggerBtn.querySelector(".icon-chat-open").style.display = appState.chatbotOpen ? "none" : "block";
        botState.triggerBtn.querySelector(".icon-chat-close").style.display = appState.chatbotOpen ? "block" : "none";
        
        if (appState.chatbotOpen) {
            scrollChatToBottom();
            botState.textInput.focus();
        }
    });
    
    // Close button
    if (botState.closeHeader) {
        botState.closeHeader.addEventListener("click", () => {
            appState.chatbotOpen = false;
            botState.windowPanel.style.display = "none";
            botState.triggerBtn.querySelector(".icon-chat-open").style.display = "block";
            botState.triggerBtn.querySelector(".icon-chat-close").style.display = "none";
        });
    }
    
    // Send actions
    if (botState.sendBtn) {
        botState.sendBtn.addEventListener("click", sendUserChatMessage);
    }
    if (botState.textInput) {
        botState.textInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                sendUserChatMessage();
            }
        });
    }
    
    // Quick replies binding
    bindQuickReplies();
}

function bindQuickReplies() {
    if (!botState.replyContainer) return;
    botState.replyContainer.querySelectorAll(".chip-reply").forEach(chip => {
        chip.addEventListener("click", (e) => {
            const rawText = e.target.textContent;
            // Clean emojis
            const cleanText = rawText.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "").trim();
            botState.textInput.value = cleanText;
            sendUserChatMessage();
        });
    });
}

function sendUserChatMessage() {
    const text = botState.textInput.value.trim();
    if (!text) return;
    
    // Add user bubble
    addChatBubble(text, "user");
    botState.textInput.value = "";
    scrollChatToBottom();
    
    // Show typing dots
    setTypingState(true);
    
    // Process response after delay
    setTimeout(() => {
        setTypingState(false);
        const replyText = matchBotResponse(text);
        addChatBubble(replyText, "bot");
        scrollChatToBottom();
    }, 1100);
}

function addChatBubble(text, sender) {
    const bubble = document.createElement("div");
    bubble.className = `message message-${sender}`;
    
    // Formatting timestamp
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nameLabel = sender === "bot" ? `Woody • ${timeStr}` : `You • ${timeStr}`;
    
    bubble.innerHTML = `
        <div class="msg-bubble">
            <span class="msg-author-meta" style="display: block; font-size: 10px; opacity: 0.6; margin-bottom: 4px; font-weight: 700;">${nameLabel}</span>
            <div class="msg-content">${text}</div>
            ${sender === "bot" ? `<div class="bot-bubble-rating" style="margin-top: 6px; display: flex; gap: 8px; justify-content: flex-end; opacity: 0.8;">
                <button class="btn-rate-bot" onclick="rateBotMsg(this, true)" style="border:none; background:none; cursor:pointer; font-size:10px;">👍</button>
                <button class="btn-rate-bot" onclick="rateBotMsg(this, false)" style="border:none; background:none; cursor:pointer; font-size:10px;">👎</button>
            </div>` : ""}
        </div>
    `;
    
    botState.messagesContainer.appendChild(bubble);
}

// Direct message bubble feedback callback
window.rateBotMsg = function(button, liked) {
    const parent = button.parentElement;
    parent.innerHTML = `<span style="font-size: 9px; color: var(--text-muted);">${liked ? "Liked!" : "Feedback recorded."}</span>`;
};

function setTypingState(typing) {
    if (!botState.typingDots) return;
    botState.typingDots.style.display = typing ? "flex" : "none";
    if (typing) scrollChatToBottom();
}

function scrollChatToBottom() {
    if (botState.messagesContainer) {
        botState.messagesContainer.scrollTop = botState.messagesContainer.scrollHeight;
    }
}

/**
 * Fuzzy Keyword Weighted Matcher
 */
function matchBotResponse(userInput) {
    const cleanInput = userInput.toLowerCase();
    
    let bestMatchKey = "default";
    let highestWeight = 0;
    
    for (const category in BOT_KEYWORDS) {
        const data = BOT_KEYWORDS[category];
        let weight = 0;
        
        data.keys.forEach(keyword => {
            if (cleanInput.includes(keyword)) {
                weight += keyword.length; // longer matching keywords yield higher weights
            }
        });
        
        if (weight > highestWeight) {
            highestWeight = weight;
            bestMatchKey = category;
        }
    }
    
    if (bestMatchKey !== "default") {
        return BOT_KEYWORDS[bestMatchKey].reply;
    }
    
    // Check if input contains a number (likely checking Order ID)
    if (/\d{5,8}/.test(cleanInput)) {
        const orderNum = cleanInput.match(/\d{5,8}/)[0];
        return `📦 Checking order <strong>#${orderNum}</strong>... Jaipur sorting updates confirm dispatch validation. Your package is scheduled for arrival on 25-July-2026.`;
    }
    
    return `I apologize, I didn't catch that. 🧐<br>Could you please rephrase, or choose one of our quick topics? Alternatively, raise a support ticket or call customer care at +91-9314444747.`;
}

// ==========================================
// 6. Application Initializer
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    renderSidebar();
    renderQuestionsList();
    initModals();
    initChatbot();
});
