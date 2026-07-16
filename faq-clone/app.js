// Wooden Street FAQ & Support Assistant JavaScript Logic

// 1. FAQ Data Base
const faqData = [
    {
        id: "orders",
        title: "Order & Tracking",
        icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
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
        icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`,
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
        icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2" ry="2"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`,
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
        icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>`,
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
        icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`,
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

// 2. Global State variables
let currentCategoryIndex = 0;
let currentQuestionIndex = null;
let feedbackSubmitted = false;

// DOM Elements
const categoryListContainer = document.getElementById("category-list-element");
const questionListContainer = document.getElementById("question-list-element");
const activeCategoryTitle = document.getElementById("active-category-title");
const activeQuestionCount = document.getElementById("active-question-count");
const faqAnswerPane = document.getElementById("faq-answer-pane-element");
const answerPlaceholder = document.getElementById("answer-placeholder-element");
const answerContentCard = document.getElementById("answer-content-card-element");
const displayedAnswerTitle = document.getElementById("displayed-answer-title");
const displayedAnswerBody = document.getElementById("displayed-answer-body");
const searchInput = document.getElementById("faq-search-input");
const searchClearBtn = document.getElementById("search-clear-btn");

// 3. Render categories sidebar
function renderCategories() {
    categoryListContainer.innerHTML = "";
    faqData.forEach((category, index) => {
        const li = document.createElement("li");
        li.className = `category-item ${index === currentCategoryIndex ? "active" : ""}`;
        li.innerHTML = `
            <div class="category-label">
                ${category.icon}
                <span>${category.title}</span>
            </div>
            <span class="category-badge">${category.questions.length}</span>
        `;
        li.addEventListener("click", () => {
            currentCategoryIndex = index;
            currentQuestionIndex = null;
            renderCategories();
            renderQuestions();
            resetAnswerPane();
        });
        categoryListContainer.appendChild(li);
    });
}

// 4. Render questions in the middle column
function renderQuestions(customList = null) {
    questionListContainer.innerHTML = "";
    const listToRender = customList || faqData[currentCategoryIndex].questions;

    if (customList) {
        activeCategoryTitle.textContent = "Search Results";
        activeQuestionCount.textContent = `${customList.length} questions found`;
    } else {
        activeCategoryTitle.textContent = faqData[currentCategoryIndex].title;
        activeQuestionCount.textContent = `${listToRender.length} questions`;
    }

    if (listToRender.length === 0) {
        questionListContainer.innerHTML = `
            <div style="padding: 30px; text-align: center; color: var(--text-light); font-size: 14px;">
                No questions found matching your query.
            </div>
        `;
        return;
    }

    listToRender.forEach((item, index) => {
        const li = document.createElement("li");
        li.className = `question-item ${index === currentQuestionIndex ? "active" : ""}`;
        li.innerHTML = `
            <span>${item.q}</span>
            <svg class="question-chevron" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
        `;
        li.addEventListener("click", () => {
            currentQuestionIndex = index;
            // Unhighlight other list items
            const allItems = questionListContainer.querySelectorAll(".question-item");
            allItems.forEach(el => el.classList.remove("active"));
            li.classList.add("active");
            displayAnswer(item);
        });
        questionListContainer.appendChild(li);
    });
}

// Display selected answer details on the right panel
function displayAnswer(item) {
    answerPlaceholder.style.display = "none";
    answerContentCard.style.display = "flex";
    displayedAnswerTitle.textContent = item.q;
    displayedAnswerBody.innerHTML = item.a;

    // Reset feedback area
    feedbackSubmitted = false;
    document.getElementById("btn-feedback-yes").style.display = "flex";
    document.getElementById("btn-feedback-no").style.display = "flex";
    document.getElementById("feedback-success-msg").style.display = "none";
}

// Reset right answer panel when category changes
function resetAnswerPane() {
    answerPlaceholder.style.display = "flex";
    answerContentCard.style.display = "none";
}

// 5. Search Functionality
searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (query.length > 0) {
        searchClearBtn.style.display = "block";
        // Search across all categories
        let results = [];
        faqData.forEach(cat => {
            cat.questions.forEach(qItem => {
                if (qItem.q.toLowerCase().includes(query) || qItem.a.toLowerCase().includes(query)) {
                    results.push(qItem);
                }
            });
        });
        currentQuestionIndex = null;
        renderQuestions(results);
        resetAnswerPane();
    } else {
        searchClearBtn.style.display = "none";
        renderCategories();
        renderQuestions();
        resetAnswerPane();
    }
});

// Clear Search button
searchClearBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchClearBtn.style.display = "none";
    renderCategories();
    renderQuestions();
    resetAnswerPane();
});

// Trending Topic buttons click handler
document.querySelectorAll(".trend-tag").forEach(tag => {
    tag.addEventListener("click", () => {
        const topic = tag.textContent;
        searchInput.value = topic;
        searchInput.dispatchEvent(new Event('input'));
    });
});

// 6. Feedback handlers
document.getElementById("btn-feedback-yes").addEventListener("click", submitFeedback);
document.getElementById("btn-feedback-no").addEventListener("click", submitFeedback);

function submitFeedback() {
    if (feedbackSubmitted) return;
    feedbackSubmitted = true;
    document.getElementById("btn-feedback-yes").style.display = "none";
    document.getElementById("btn-feedback-no").style.display = "none";
    document.getElementById("feedback-success-msg").style.display = "block";
}

// 7. Modals Logic
const modalTrack = document.getElementById("modal-track-order");
const modalTicket = document.getElementById("modal-raise-ticket");

function setupModals() {
    // Open Track Modal
    document.getElementById("action-track-order").addEventListener("click", () => {
        modalTrack.style.display = "flex";
    });
    // Open Ticket Modal
    document.getElementById("action-raise-ticket").addEventListener("click", () => {
        modalTicket.style.display = "flex";
    });
    
    const bannerTicketBtn = document.getElementById("btn-raise-ticket-banner");
    if (bannerTicketBtn) {
        bannerTicketBtn.addEventListener("click", () => {
            modalTicket.style.display = "flex";
        });
    }

    // Store Locator Action (Dummy redirect / Alert)
    document.getElementById("action-store-locator").addEventListener("click", () => {
        alert("Redirecting to Wooden Street Store Locator page...\nOver 90+ studios in Bangalore, Mumbai, Delhi, Hyderabad, and more!");
    });

    // Close Modals
    document.querySelectorAll(".modal-close-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            modalTrack.style.display = "none";
            modalTicket.style.display = "none";
        });
    });

    // Handle track submission
    document.getElementById("btn-submit-track").addEventListener("click", () => {
        const orderId = document.getElementById("track-order-id").value.trim();
        const resultDiv = document.getElementById("track-result");
        
        if (!orderId) {
            alert("Please enter a valid Order ID");
            return;
        }

        resultDiv.style.display = "block";
        resultDiv.innerHTML = `
            <div style="font-weight: 700; color: var(--primary-color); margin-bottom: 8px;">Order Status for #${orderId}</div>
            <div style="font-size: 13px; line-height: 1.5;">
                <p>🟢 <strong>Status:</strong> Dispatched from Jodhpur Warehouse</p>
                <p>📍 <strong>Current Location:</strong> Jaipur Sorting Facility</p>
                <p>📅 <strong>Expected Delivery:</strong> 22-July-2026</p>
                <div style="margin-top: 10px; height: 4px; background: #e5e5e5; border-radius: 2px; position: relative;">
                    <div style="position: absolute; top: 0; left: 0; width: 66%; height: 100%; background: var(--primary-color); border-radius: 2px;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 4px; color: var(--text-muted);">
                    <span>Ordered</span>
                    <span>Dispatched</span>
                    <span>Out for Delivery</span>
                </div>
            </div>
        `;
    });

    // Handle ticket submission
    document.getElementById("btn-submit-ticket").addEventListener("click", () => {
        alert("Your support ticket has been submitted successfully!\nTicket Ref ID: WS-TKT-92041\nOur executive team will contact you within 24 hours.");
        modalTicket.style.display = "none";
        document.getElementById("ticket-order-id").value = "";
        document.getElementById("ticket-description").value = "";
    });
}

// 8. Conversational Chatbot Logic
const chatbotTrigger = document.getElementById("chatbot-trigger-btn");
const chatWindow = document.getElementById("chat-window-element");
const chatCloseHeader = document.getElementById("chat-close-btn-header");
const chatMessagesContainer = document.getElementById("chat-messages-container");
const chatTextInput = document.getElementById("chat-text-input");
const chatSendBtn = document.getElementById("chat-send-btn");
const typingIndicator = document.getElementById("chat-typing-indicator-element");

function setupChatbot() {
    // Toggle Chat window
    chatbotTrigger.addEventListener("click", () => {
        const isHidden = chatWindow.style.display === "none";
        chatWindow.style.display = isHidden ? "flex" : "none";
        
        // Hide badge on first click
        const badge = chatbotTrigger.querySelector(".notification-badge");
        if (badge) badge.style.display = "none";

        // Toggle Icons
        chatbotTrigger.querySelector(".icon-chat-open").style.display = isHidden ? "none" : "block";
        chatbotTrigger.querySelector(".icon-chat-close").style.display = isHidden ? "block" : "none";

        if (isHidden) {
            scrollToBottom();
            chatTextInput.focus();
        }
    });

    chatCloseHeader.addEventListener("click", () => {
        chatWindow.style.display = "none";
        chatbotTrigger.querySelector(".icon-chat-open").style.display = "block";
        chatbotTrigger.querySelector(".icon-chat-close").style.display = "none";
    });

    // Send on click or Enter
    chatSendBtn.addEventListener("click", handleUserMessage);
    chatTextInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            handleUserMessage();
        }
    });

    // Quick reply chips
    document.querySelectorAll(".chip-reply").forEach(chip => {
        chip.addEventListener("click", (e) => {
            const queryText = e.target.textContent.substring(2); // Strip emoji
            chatTextInput.value = queryText;
            handleUserMessage();
        });
    });
}

function handleUserMessage() {
    const text = chatTextInput.value.trim();
    if (!text) return;

    // 1. Add User bubble
    addMessageBubble(text, "user");
    chatTextInput.value = "";
    scrollToBottom();

    // 2. Simulate Bot response after delay
    showTyping(true);
    
    setTimeout(() => {
        showTyping(false);
        const reply = generateBotReply(text);
        addMessageBubble(reply, "bot");
        scrollToBottom();
    }, 1200);
}

function addMessageBubble(text, sender) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message message-${sender}`;
    msgDiv.innerHTML = `<div class="msg-bubble">${text}</div>`;
    chatMessagesContainer.appendChild(msgDiv);
}

function showTyping(show) {
    typingIndicator.style.display = show ? "flex" : "none";
    if (show) scrollToBottom();
}

function scrollToBottom() {
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

// Bot automated responses matching keywords
function generateBotReply(userInput) {
    const text = userInput.toLowerCase();

    if (text.includes("track") || text.includes("status") || text.includes("where is my")) {
        return `📦 <strong>Tracking your order:</strong><br>You can instantly look up your parcel. Let me fetch the options: Click the <strong>'Track My Order'</strong> button above, or reply with your 6-digit Order ID (e.g. 582910) to search Jaipur routing updates.`;
    }
    
    if (text.includes("refund") || text.includes("money back") || text.includes("reimburse")) {
        return `💰 <strong>Refund Policy:</strong><br>Once our QC team approves cancellations or returns, refunds are initiated within 48 business hours. The funds typically credit back to your account in 5-7 business days depending on your bank.`;
    }

    if (text.includes("store") || text.includes("locate") || text.includes("showroom") || text.includes("nearest")) {
        return `🏬 <strong>Wooden Street Experience Stores:</strong><br>We have over 90+ studios in India! Visitors can inspect wood textures and fabric finishes. You can check the nearest studio via Jaipur, Bangalore, Mumbai, or Delhi guides. Click the <strong>Store Locator</strong> above for directions.`;
    }

    if (text.includes("agent") || text.includes("human") || text.includes("speak") || text.includes("contact") || text.includes("number")) {
        return `🧑 <strong>Customer Care Team:</strong><br>You can call us directly at <strong>+91-9314444747</strong> (9 AM - 9 PM) or email us at <b>support@woodenstreet.com</b>. If you wish, click the <strong>'Raise Ticket'</strong> button above to report structural issues.`;
    }

    if (text.includes("wood") || text.includes("material") || text.includes("sheesham") || text.includes("mango")) {
        return `🪵 <strong>Quality & Wood Specifications:</strong><br>We design using premium <strong>Sheesham Wood (Rosewood)</strong> and high-grade <strong>Mango Wood</strong>. All structural lumber undergoes chemical seasoning and kiln treatment for termite and wrap protection, backed by our 1-year structural warranty.`;
    }

    if (text.includes("delivery") || text.includes("ship") || text.includes("transit") || text.includes("charge")) {
        return `🚚 <strong>Shipping & Delivery Details:</strong><br>We provide free shipping and free professional home assembly for all purchases above ₹5,000 across India. Technicians generally schedule visits within 24-48 hours of packet delivery.`;
    }

    if (text.includes("hi") || text.includes("hello") || text.includes("hey") || text.includes("good morning")) {
        return `Hello! 😊 Nice to chat with you. How can I help you navigate your Wooden Street journey today? Ask me about order tracking, wood customization, refunds, or warranty details.`;
    }

    // Default Fallback
    return `I apologize, I didn't fully catch that. 🧐<br>Could you please rephrase, or use one of the quick options? You can also raise a support ticket or call our service desk at +91-9314444747 for assistance.`;
}

// 9. Initial Load Setup
window.addEventListener("DOMContentLoaded", () => {
    renderCategories();
    renderQuestions();
    setupModals();
    setupChatbot();
});
