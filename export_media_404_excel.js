const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const media404Data = [
  {
    index: 1,
    elementText: "How the Right Furniture Pieces Improve Home Comfort (2026-02-19)",
    brokenUrl: "https://www.apnnews.com/how-the-right-furniture-pieces-improve-home-comfort/",
    status: 404
  },
  {
    index: 2,
    elementText: "Wooden Street launches 104th Store in Hyderabad (2025-04-02)",
    brokenUrl: "https://www.indiaretailing.com/2025/04/03/wooden-street-launches-104th-store-in-hyderabad/",
    status: 404
  },
  {
    index: 3,
    elementText: "Wooden Street Expands Its Presence with 101st Store in Lucknow (2024-10-14)",
    brokenUrl: "https://businessnewsmatters.com/news/wooden-street-expands-its-presence-with-101st-store-in-lucknow/",
    status: 404
  },
  {
    index: 4,
    elementText: "Beds Under 30,000 from WoodenStreet That You Can't Give a Miss (2024-03-17)",
    brokenUrl: "https://www.mid-day.com/brand-media/lifestyle/article/beds-under-30000-from-woodenstreet-that-you-cant-give-a-miss-70",
    status: 404
  },
  {
    index: 5,
    elementText: "Wooden Street Opens 7th Store in Pune, Marks 97th in India (2024-02-09)",
    brokenUrl: "https://www.mid-day.com/brand-media/article/wooden-street-opens-7th-store-in-pune-marks-97th-in-india-23334496",
    status: 404
  },
  {
    index: 6,
    elementText: "The Psychology of Furniture Shopping: How Consumer Behaviour Drives Industry Trends (2023-08-23)",
    brokenUrl: "https://www.apnnews.com/the-psychology-of-furniture-shopping-how-consumer-behaviour-drives-industry-trends/",
    status: 404
  },
  {
    index: 7,
    elementText: "WoodenStreet On Expansion Spree, Strengthen Retail Presence With 3 New Experience Stores in Mumbai (2023-02-10)",
    brokenUrl: "https://entrepreneurview.in/woodenstreet-on-expansion-spree-strengthen-retail-presence-with-3-new-experience-stores-in-mumbai/",
    status: 404
  },
  {
    index: 8,
    elementText: "Budget Reaction – Startup Sector - WoodenStreet (2023-01-31)",
    brokenUrl: "https://www.apnnews.com/budget-reaction-startup-sector-woodenstreet/",
    status: 404
  },
  {
    index: 9,
    elementText: "WoodenStreet Enters Himachal Pradesh, Opens its First Store in Shimla (2022-11-14)",
    brokenUrl: "https://www.indianretailer.com/amp/news/woodenstreet-enters-himachal-pradesh-opens-its-first-store-shimla",
    status: 404
  },
  {
    index: 10,
    elementText: "Furniture brand WoodenStreet launches its 2nd experience store in Goa (2023-01-02)",
    brokenUrl: "https://www.indiaretailing.com/2023/01/03/latest-news/furniture-brand-woodenstreet-launches-its-2nd-experience-store-in-goa/",
    status: 404
  },
  {
    index: 11,
    elementText: "These 5 E-commerce brands will be a game-changer in Indian E-Retail (2022-06-15)",
    brokenUrl: "https://www.mid-day.com/brand-media/article/these-5-e-commerce-brands-will-be-a-game-changer-in-indian-e-retail-23231890",
    status: 404
  },
  {
    index: 12,
    elementText: "How will Furniture Logistics Get Affected by Delhivery IPO? (2022-06-21)",
    brokenUrl: "https://www.telanganatribune.com/finance/how-will-furniture-logistics-get-affected-by-delhivery-ipo/",
    status: 404
  },
  {
    index: 13,
    elementText: "Furniture start-up WoodenStreet Announced 3 New Stores in Bangalore, Invests $1M! (2022-02-22)",
    brokenUrl: "https://www.apnnews.com/furniture-start-up-woodenstreet-announced-3-new-stores-in-bangalore-invests-1m/",
    status: 404
  },
  {
    index: 14,
    elementText: "WoodenStreet to launch three new stores in Bengaluru (2022-02-22)",
    brokenUrl: "https://www.indiaretailing.com/2022/02/23/retail/woodenstreet-to-launch-three-new-stores-in-bengaluru/",
    status: 404
  },
  {
    index: 15,
    elementText: "6 Interior Design Trends We’ll See In 2022 (2021-12-26)",
    brokenUrl: "https://www.apnnews.com/6-interior-design-trends-well-see-in-2022/",
    status: 404
  },
  {
    index: 16,
    elementText: "Home Decore Brand WoodenStreet Launches 4 New Stores in Bengaluru (2021-12-08)",
    brokenUrl: "https://www.indianretailer.com/amp/news/home-decore-brand-woodenstreet-launches-4-new-stores-in-bangalore.n12262",
    status: 404
  },
  {
    index: 17,
    elementText: "5 Things We All Need To Change In Our Home Decor Thanks To The Pandemic (2021-08-27)",
    brokenUrl: "https://www.apnnews.com/5-home-makeover-ideas-to-follow-in-2021/",
    status: 404
  },
  {
    index: 18,
    elementText: "Woodenstreet to invest $2 mn on expansion, strengthening network over 1 year (2021-01-27)",
    brokenUrl: "https://www.indiaretailing.com/2021/01/28/woodenstreet-to-invest-2-mn-on-expansion-strengthening-network-over-1-year/",
    status: 404
  },
  {
    index: 19,
    elementText: "Furniture Brand WoodenStreet to Invest about $2 Million on Expansion (2021-01-26)",
    brokenUrl: "https://textilevaluechain.in/news-insights/industry-cluster-news/textile-corporate-sme-news/furniture-brand-woodenstreet-to-invest-about-2-million-on-expansion-of-50-stores-strengthening-its-network-within-1-year",
    status: 404
  },
  {
    index: 20,
    elementText: "Lights & mirrors: A clutter-free home in a budget (2021-01-12)",
    brokenUrl: "https://www.newkerala.com/news/2021/7556.htm",
    status: 404
  },
  {
    index: 21,
    elementText: "Budget Expectation by Mr. Lokendra Ranawat, Co-Founder & CEO at WoodenStreet (2021-01-20)",
    brokenUrl: "https://textilevaluechain.in/news-insights/covid-19/budget-expectation-by-mr-lokendra-ranawat-co-founder-ceo-at-woodenstreet-startups",
    status: 404
  },
  {
    index: 22,
    elementText: "Retail Custom Furniture Brand WoodenStreet spends INR 7.4 Crores in physical Expansion (2020-08-16)",
    brokenUrl: "https://textilevaluechain.in/news-insights/industry-cluster-news/retail-custom-furniture-brand-woodenstreet-spends-inr-7-4-crores-in-physical-expansion",
    status: 404
  }
];

const wb = xlsx.utils.book_new();

// Sheet 1: 404 Broken Links
const headers = ["#", "Element Text / Headline", "Broken Target URL", "HTTP Status"];
const rows = media404Data.map(item => [item.index, item.elementText, item.brokenUrl, item.status]);

const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
ws["!cols"] = [
  { wch: 5 },
  { wch: 85 },
  { wch: 110 },
  { wch: 15 }
];
xlsx.utils.book_append_sheet(wb, ws, "Media 404 Broken Links");

// Sheet 2: Audit Summary
const summaryRows = [
  ["Media Page 404 Link Audit Report", ""],
  ["Scanned Page URL", "https://www.woodenstreet.com/media"],
  ["Audit Date", new Date().toLocaleString()],
  ["Total Links Scanned", 1138],
  ["Total 404 Broken Links Found", 22],
  ["Status", "FAILURE - 22 broken links detected"]
];
const wsSummary = xlsx.utils.aoa_to_sheet(summaryRows);
wsSummary["!cols"] = [{ wch: 35 }, { wch: 60 }];
xlsx.utils.book_append_sheet(wb, wsSummary, "Audit Summary");

const outputPath = path.resolve(__dirname, "Media_Page_404_Report.xlsx");
xlsx.writeFile(wb, outputPath);
console.log(`Excel report successfully generated at: ${outputPath}`);
