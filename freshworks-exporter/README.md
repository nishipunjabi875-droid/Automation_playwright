# Freshworks Omni Conversation Exporter

A production-grade, highly scalable Node.js application designed to extract customer conversations and messages from **Freshworks Omni (Freshchat / Freshdesk Messaging)** across all omni-channel messaging streams including:
- **WhatsApp**
- **Instagram**
- **Facebook Messenger**
- **Web Messaging & In-App Chat**

---

## 🌟 Key Features

1. **Multi-Format Export**: Generates structured output files in **Excel (`.xlsx`)**, **CSV (`.csv`)**, and **JSON (`.json`)**.
2. **Comprehensive Data Fields**: Extracts 18 granular fields including conversation status, channels, sender details, message body, timestamps, attachments, tags, and custom properties.
3. **Resilient Rate Limit Handling (HTTP 429)**: Implements exponential backoff and `Retry-After` header processing with up to 5 automatic retries.
4. **High Concurrency & Scalability**: Designed to handle over **100,000 conversations** concurrently without memory exhaustion.
5. **Interactive Progress Bar**: Real-time progress updates via `cli-progress`.
6. **Automatic Media Download**: Optionally downloads image and document attachments to a local `./output/attachments/` folder.
7. **Failure Recovery**: Saves unretrievable or errored conversation IDs into `failed.json` for audit and re-run capability.
8. **Custom Date Range Filtering**: Supports date-range filtering via `START_DATE` and `END_DATE`.
9. **Analytics & Summary Dashboard**: Generates key metrics including total conversations/messages, channel breakdowns, daily volume, top active agents, and top active customers.

---

## 🛠️ Architecture & Module Structure

```
freshworks-exporter/
├── .env                  # API credentials and settings (Do not commit to VCS)
├── .env.example          # Sample environment template
├── package.json          # Dependencies & scripts
├── auth.js               # Authentication & environment configuration loader
├── api.js                # Freshworks API client with retry and rate-limit handling
├── exporter.js           # Exporter engine for Excel (.xlsx), CSV, and JSON outputs
├── utils.js              # Helpers for stats, date handling, and concurrency mapping
├── index.js              # Main CLI execution orchestrator
└── README.md             # Project documentation
```

---

## ⚙️ Installation & Setup Instructions

### 1. Prerequisites
- **Node.js**: v18.x or v20.x (Latest LTS recommended)
- **npm**: v9.x or higher

### 2. Install Dependencies
Navigate to the application folder and run:
```bash
cd freshworks-exporter
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit your `.env` file with your Freshworks Omni API Key and domain:
```env
FRESHWORKS_DOMAIN=woodenstreet-891328299873931676-c5ea25deceb0b9417588176.freshchat.com/v2
FRESHWORKS_API_KEY=your_freshworks_bearer_token

# Optional Date Range (Format: YYYY-MM-DD)
START_DATE=
END_DATE=

# Performance Tuning
CONCURRENCY_LIMIT=5
MAX_RETRIES=5
DOWNLOAD_ATTACHMENTS=true
OUTPUT_DIR=./output
```

---

## 🚀 Execution

Run the extraction script using npm:
```bash
npm start
```

Or directly via Node.js:
```bash
node index.js
```

---

## 📊 Exported Fields

| Field Name | Description |
| :--- | :--- |
| `Conversation ID` | Unique Freshworks conversation identifier |
| `Channel` | Messaging source (WhatsApp, Instagram, Facebook, Web) |
| `Customer Name` | Customer full name |
| `Customer ID` | Freshworks User ID |
| `Customer Phone` | Customer phone number |
| `Customer Email` | Customer email address |
| `Agent Name` | Assigned agent name |
| `Agent ID` | Assigned agent ID |
| `Message ID` | Unique message identifier |
| `Sender Type` | `Customer`, `Agent`, or `Bot` |
| `Message Text` | Extracted message text content |
| `Message Type` | `text`, `image`, `file`, etc. |
| `Timestamp` | Message creation timestamp (ISO format) |
| `Attachments` | Local file paths or attachment URLs |
| `Media URLs` | Original media URLs from Freshworks CDN |
| `Conversation Status` | `Open`, `Assigned`, `Resolved`, etc. |
| `Tags` | Tags associated with the conversation |
| `Custom Properties` | Custom JSON key-value pairs |

---

## 📈 Generated Output Files

After completion, the `./output/` directory will contain:
- 📊 **`conversations_export.xlsx`**: Excel workbook featuring styled headers and a Summary Dashboard tab.
- 📄 **`conversations_export.csv`**: Raw CSV data format for database ingestion.
- 📁 **`conversations_export.json`**: Complete JSON array.
- 📈 **`summary_statistics.json`**: Analytics summary breakdown.
- 🖼️ **`attachments/`**: Local copies of downloaded images/files (if enabled).
- ⚠️ **`failed.json`**: Errored conversation IDs (created only if failures occur).

---

## 💡 Production Considerations

- **Rate Limits**: Freshworks API rate limits are dynamically respected using backoff algorithms. If rate limited (429), the application automatically sleeps according to the `Retry-After` header or exponential delay.
- **Large Dataset Handling**: Concurrency limits prevent memory overflow when processing 100k+ conversations.
- **Caching**: User and Agent details are cached in-memory during execution to minimize API requests.

---

## 📜 License
MIT License
