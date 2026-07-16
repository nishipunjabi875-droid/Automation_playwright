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
    title: "Order Tracking & Delivery",
    ariaLabel: "Order tracking and delivery assistance",
    icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
    questions: [
      {
        q: "How to Track my Order?",
        a: "<p>Go to My Orders (<a href='https://www.woodenstreet.com/order-history' target='_blank'>Track Order</a>) in your WoodenStreet account to track your order.</p>"
      },
      {
        q: "My item has already reached the distribution center, what happens next?",
        a: "<p>Once your order has reached the DC, you will receive a call prior from our delivery team to schedule your delivery.</p>"
      },
      {
        q: "What should I do if I am relocating or out of town?",
        a: "<p>Congratulations on your relocation! We can help you with that. You can raise a ticket (<a href='https://www.woodenstreet.com/tickets' target='_blank'>Raise Ticket</a>) for the same and our team will coordinate.</p>"
      },
      {
        q: "What should I do if I missed the delivery of my order today?",
        a: "<p>In case you missed the delivery, the logistics partner will try to deliver the product on the next business day. You will receive a call prior from our delivery team to schedule it.</p>"
      },
      {
        q: "What should I do if the delivery of my order is delayed?",
        a: "<p>We try our best to deliver your order on time. In rare cases where a delay occurs, our support team will keep you updated through emails or tickets. A new delivery timeframe will be shared, and you can track status under My Orders.</p>"
      },
      {
        q: "What is the estimated delivery time?",
        a: "<p>The delivery time differs from product to product based on in-stock availability or made-to-order status and your location. Please check the product details tab on individual product pages for estimated delivery timelines.</p>"
      },
      {
        q: "How do I check the current status of my product?",
        a: "<p>To check the current status of your product, log into your WoodenStreet Account and go to My Orders to see the milestones.</p>"
      },
      {
        q: "How can I change my delivery address?",
        a: "<p>Kindly raise a support ticket for that order within 24 hours of placing the order. Our support desk will update the shipping details before dispatch.</p>"
      },
      {
        q: "I am unable to check my order status or tracking, what should I do?",
        a: "<p>If you are not able to check order status or tracking details, kindly raise a support ticket or contact our customer support line directly.</p>"
      },
      {
        q: "Why does the promised Delivery date vary from one item to another?",
        a: "<p>Key reasons are: non-availability of items in stock and products sourced from different sellers. In these cases, separate vendors dispatch items independently as per their manufacturing warehouse locations.</p>"
      },
      {
        q: "What are the reasons behind late delivery or missed expected delivery date?",
        a: "<p>Unlike other marketplaces, Woodenstreet does in-house manufacturing with a stringent quality check process. Production checks, seasoning delays, or transit clearances can occasionally cause delivery adjustments.</p>"
      },
      {
        q: "Can woodenstreet give me free home delivery for my order?",
        a: "<p>Yes, WoodenStreet provides free home delivery across major cities in India. However, in selective high-logistics zones, a nominal delivery and installation charge may be computed at checkout.</p>"
      },
      {
        q: "Will my product deliver in apartments?",
        a: "<p>Yes. However, in the absence of a service lift, our delivery partner shall only make a delivery to the ground floor. Extra doorstep carry charges may apply on request if delivery to upper floors is required without a lift.</p>"
      },
      {
        q: "Can I take my delivery later than the date specified?",
        a: "<p>Before dispatch from local distribution centers, our delivery executive calls you to schedule slots. You can request them to reschedule or hold the shipment for up to 7 days free of charge.</p>"
      },
      {
        q: "Can I get all my products in one single delivery?",
        a: "<p>If all items are of WoodenStreet brand and sourced from the same warehouse, they are consolidated. Items from separate vendors or different manufacturing hubs will be delivered on different dates.</p>"
      },
      {
        q: "Can my security guard or neighbor receive my shipment if I am not available?",
        a: "<p>Yes, they can. They will need to show a valid photo ID or connect with the delivery agent through a telephone verification call.</p>"
      },
      {
        q: "How can I get the contact number of my delivery agent?",
        a: "<p>As per company policy, direct contact numbers of field delivery representatives are not shared. Rest assured they will call you prior to arrival or in case of routing queries.</p>"
      }
    ]
  },
  {
    id: "payments",
    title: "Payment & Invoice",
    ariaLabel: "Payment methods and invoice instructions",
    icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`,
    questions: [
      {
        q: "What payment options do you support?",
        a: "<p>We support Credit/Debit Cards, Net Banking, UPI (Google Pay, PhonePe, Paytm), No-Cost EMIs, and Cash on Delivery (COD) for selected orders.</p>"
      },
      {
        q: "Is No-Cost EMI available?",
        a: "<p>Yes, we offer No-Cost EMI plans for 3-month and 6-month tenures on credit cards from partner banks. The interest charge is deducted as an upfront discount at checkout.</p>"
      },
      {
        q: "How can I download my GST invoice?",
        a: "<p>Log in to your account, visit My Orders, select the completed order, and click 'Download Invoice'. The GST registration detail will be listed.</p>"
      },
      {
        q: "Can I change the billing or shipping name in the invoice?",
        a: "<p>Invoice detail updates are permitted only before the product is dispatched. Please raise a support ticket immediately for corrections.</p>"
      }
    ]
  },
  {
    id: "account",
    title: "Manage Account",
    ariaLabel: "Account settings and profile help",
    icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    questions: [
      {
        q: "How do I create a Wooden Street account?",
        a: "<p>Click 'Sign In' in the header and register manually with your email/phone number, or use Google or Facebook quick login options.</p>"
      },
      {
        q: "How can I update my profile mobile number or email?",
        a: "<p>Go to Profile Settings in your dashboard, or raise a support ticket for assistance if authentication fails.</p>"
      }
    ]
  },
  {
    id: "warranty",
    title: "Warranty Information",
    ariaLabel: "Product warranty specifications",
    icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
    questions: [
      {
        q: "What is the warranty period on solid wood furniture?",
        a: "<p>All Wooden Street manufactured solid wood products carry a comprehensive 1-Year Warranty covering termite issues, wood splitting, and manufacturing defects.</p>"
      },
      {
        q: "How do I claim product warranty?",
        a: "<p>Please raise a support ticket under the Warranty Category, uploading clear images and invoice copies of the damaged segment. Our technical inspectors will review it within 48 hours.</p>"
      }
    ]
  },
  {
    id: "damage",
    title: "Damaged Or Defective Item",
    ariaLabel: "Report damage or returns",
    icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    questions: [
      {
        q: "What should I do if my furniture arrives damaged?",
        a: "<p>Note the physical damage details on the Proof of Delivery receipt and capture pictures of the unit. Raise a support ticket within 48 hours, and we will initiate a repair or replacement.</p>"
      },
      {
        q: "What is your return window for defective furniture?",
        a: "<p>Defective or damaged items can be reported for return or replacement within 7 days of delivery.</p>"
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
