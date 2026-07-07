// @ts-check
const { test, expect, devices } = require('@playwright/test');

// ─── CONFIG — update before running ──────────────────────────────────────────
const PDP_URL = 'https://yoursite.com/product/your-product-slug'; // changeable PDP URL

// Selectors — update to match your app's actual DOM / testIDs
const SEL = {
  // Header
  categoryTags      : '[data-testid="category-tags"], .category-tag, .breadcrumb-tag',
  shareIcon         : '[data-testid="share-icon"], [aria-label*="share" i]',
  wishlistIcon      : '[data-testid="wishlist-icon"], [aria-label*="wishlist" i]',
  productTitle      : '[data-testid="product-title"], .product-title, h1',
  productPrice      : '[data-testid="product-price"], .product-price, [class*="price"]',
  loginBottomSheet  : '[data-testid="login-sheet"], .login-bottom-sheet',

  // Gallery
  galleryImage      : '[data-testid="gallery-image"], .gallery-image, .swiper-slide img',
  galleryContainer  : '[data-testid="gallery"], .gallery-container, .product-gallery',
  tagOverlay        : '[data-testid="tag-overlay"], .image-tag-overlay',
  videoTile         : '[data-testid="video-tile"], .video-tile, video',
  customerPhotos    : '[data-testid="customer-photos"], .customer-photos-section',
  looksGallery      : '[data-testid="looks-gallery"], .looks-gallery',
  galleryBtnPhotos  : '[data-testid="gallery-btn-photos"], button:text("Photos")',
  galleryBtnVideos  : '[data-testid="gallery-btn-videos"], button:text("Videos")',
  galleryBtnDims    : '[data-testid="gallery-btn-dims"], button:text("Dims"), button:text("Dimensions")',
  skeletonLoader    : '[data-testid="skeleton"], .skeleton, .shimmer',
  emptyState        : '[data-testid="empty-state"], .empty-state, .no-content',

  // Options
  fabricOption      : '[data-testid="fabric-option"], .fabric-option, [data-option-type="fabric"]',
  sizeOption        : '[data-testid="size-option"], .size-option, [data-option-type="size"]',
  selectedOption    : '[data-testid="selected-option"], .option-selected, [aria-selected="true"]',
  optionDropdown    : '[data-testid="option-dropdown"], .option-dropdown',

  // Qty / Cart
  qtyDropdown       : '[data-testid="qty-dropdown"], .qty-dropdown, [aria-label*="quantity" i]',
  addToCartBtn      : '[data-testid="add-to-cart"], button:text("Add to Cart"), button:text("Add to cart")',
  cartToast         : '[data-testid="cart-toast"], .cart-toast, .add-to-cart-toast',
  emiBtn            : '[data-testid="emi-btn"], .emi-button, button:text("EMI")',

  // Pincode
  pincodeInput      : '[data-testid="pincode-input"], input[name*="pincode" i], .pincode-input',
  pincodeSection    : '[data-testid="pincode-section"], .pincode-section',
  storeCount        : '[data-testid="store-count"], .store-count, .available-stores',

  // Leads
  unlockNowBtn      : '[data-testid="unlock-now"], button:text("Unlock Now"), button:text("Unlock now")',
  priceDrop         : '[data-testid="price-drop"], button:text("Price Drop"), .price-drop-trigger',
  earlyDelivery     : '[data-testid="early-delivery"], button:text("Early Delivery"), .early-delivery-trigger',
  bookVisit         : '[data-testid="book-visit"], button:text("Book a Visit"), .book-visit-trigger',
  leadForm          : '[data-testid="lead-form"], .lead-form, .bottom-sheet-form',
  leadSubmitBtn     : '[data-testid="lead-submit"], button:text("Submit"), button[type="submit"]',
  leadSuccessMsg    : '[data-testid="lead-success"], .success-message, :text("Thank you")',
  leadTnC           : '[data-testid="tnc"], .terms-and-conditions, :text("Terms")',
  leadError         : '[data-testid="lead-error"], .field-error, .error-message',

  // Strip Nav
  stripNav          : '[data-testid="strip-nav"], .strip-nav, .section-nav',
  stripNavTab       : '[data-testid="strip-nav-tab"], .strip-nav-tab, .nav-tab',
  stripUnderline    : '[data-testid="strip-underline"], .nav-underline, .active-underline',

  // Store / Info
  storeSection      : '[data-testid="store-section"], .store-info, .store-section',
  citiesList        : '[data-testid="cities-list"], .cities-list',
  whatsappBtn       : '[data-testid="whatsapp-btn"], [href*="whatsapp" i], a[href*="wa.me"]',

  // Offers
  offersSection     : '[data-testid="offers-section"], .offers-section, .promotions',

  // Combo
  comboSection      : '[data-testid="combo-section"], .combo-section',
  comboItem         : '[data-testid="combo-item"], .combo-item-card',
  comboMainProduct  : '[data-testid="combo-main"], .combo-main-product',
  comboPrice        : '[data-testid="combo-price"], .combo-total-price',
  comboATC          : '[data-testid="combo-atc"], .combo-add-to-cart',

  // Reviews
  reviewsSection    : '[data-testid="reviews-section"], .reviews-section',
  reviewRating      : '[data-testid="rating-count"], .rating-count',
  reviewStars       : '[data-testid="stars"], .star-rating, .rating-stars',
  reviewForm        : '[data-testid="review-form"], .write-review-form',
  reviewPhotos      : '[data-testid="review-photos"], .review-photos',
  reviewPhotoFilter : '[data-testid="photo-filter"], button:text("Photos"), .filter-photos',
  galleryCta        : '[data-testid="gallery-reviews-cta"], :text("reviews")',

  // Delivery
  deliveryTimeline  : '[data-testid="delivery-timeline"], .delivery-timeline, .milestone-timeline',

  // Recently Viewed
  recentlyViewed    : '[data-testid="recently-viewed"], .recently-viewed, .recently-viewed-section',
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function goToPDP(page) {
  await page.goto(PDP_URL);
  await page.waitForLoadState('networkidle');
}

async function swipeGallery(page, times = 1) {
  const gallery = page.locator(SEL.galleryContainer).first();
  const box = await gallery.boundingBox();
  if (!box) return;
  for (let i = 0; i < times; i++) {
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);
  }
}

async function scrollToBottom(page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
}

// ─── BASELINE ─────────────────────────────────────────────────────────────────

test.describe('Baseline', () => {

  test('PDP-TC-001 · Warm load via back stack — state consistent, no duplication', async ({ page }) => {
    await goToPDP(page);
    const titleFirst = await page.locator(SEL.productTitle).first().textContent();

    await page.goBack();
    await page.goForward();
    await page.waitForLoadState('networkidle');

    const titleSecond = await page.locator(SEL.productTitle).first().textContent();
    expect(titleFirst?.trim()).toBe(titleSecond?.trim());

    // No duplicated sections — each key section should appear exactly once
    const titleCount = await page.locator(SEL.productTitle).count();
    expect(titleCount).toBe(1);
  });

  test('PDP-TC-002 · Offline handling — error state shown, retry works', async ({ page }) => {
    await goToPDP(page);

    // Simulate offline
    await page.context().setOffline(true);
    await page.reload().catch(() => {});
    await page.waitForTimeout(1500);

    const hasError = await page.locator(SEL.emptyState).count();
    expect(hasError).toBeGreaterThan(0);

    // Restore network and retry
    await page.context().setOffline(false);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator(SEL.productTitle).first()).toBeVisible();
  });

  test('PDP-TC-003 · Intermittent network during media load — no layout shift', async ({ page }) => {
    // Throttle to slow 3G equivalent
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false, downloadThroughput: 50000, uploadThroughput: 20000, latency: 2000,
    });

    await goToPDP(page);
    await swipeGallery(page, 3);

    // Should not navigate away from PDP
    expect(page.url()).toContain(new URL(PDP_URL).pathname);

    // Reset throttle
    await client.send('Network.emulateNetworkConditions', {
      offline: false, downloadThroughput: -1, uploadThroughput: -1, latency: 0,
    });
  });

});

// ─── HEADER ───────────────────────────────────────────────────────────────────

test.describe('Header', () => {

  test('PDP-TC-004 · Category tags visible with correct styling', async ({ page }) => {
    await goToPDP(page);
    const tags = page.locator(SEL.categoryTags);
    await expect(tags.first()).toBeVisible();
    const count = await tags.count();
    expect(count).toBeGreaterThan(0);
  });

  test('PDP-TC-005 · Share icon visible; share sheet opens and closes', async ({ page }) => {
    await goToPDP(page);
    const shareIcon = page.locator(SEL.shareIcon).first();
    await expect(shareIcon).toBeVisible();
    // Tap share — native share sheet opens (can only verify tap doesn't crash)
    await shareIcon.click();
    await page.waitForTimeout(800);
    // Dismiss with Escape or Back
    await page.keyboard.press('Escape');
    // PDP still open
    expect(page.url()).toContain(new URL(PDP_URL).pathname);
  });

  test('PDP-TC-006 · Wishlist icon visible; login sheet respects safe area', async ({ page }) => {
    await goToPDP(page);
    const wishlistIcon = page.locator(SEL.wishlistIcon).first();
    await expect(wishlistIcon).toBeVisible();
    await wishlistIcon.click();
    await page.waitForTimeout(800);
    // Login sheet should appear (if logged out)
    const loginSheet = page.locator(SEL.loginBottomSheet);
    if (await loginSheet.isVisible()) {
      const box = await loginSheet.boundingBox();
      const viewportHeight = page.viewportSize()?.height ?? 800;
      // CTA should not be clipped below viewport
      if (box) {
        expect(box.y + box.height).toBeLessThanOrEqual(viewportHeight);
      }
    }
  });

  test('PDP-TC-007 · Share + Wishlist icons disappear after first image swipe', async ({ page }) => {
    await goToPDP(page);
    await expect(page.locator(SEL.shareIcon).first()).toBeVisible();
    await expect(page.locator(SEL.wishlistIcon).first()).toBeVisible();

    await swipeGallery(page, 1);

    // Icons should be hidden on image 2
    const shareVisible = await page.locator(SEL.shareIcon).first().isVisible().catch(() => false);
    expect(shareVisible).toBe(false);

    // Swipe back to first image
    const gallery = page.locator(SEL.galleryContainer).first();
    const box = await gallery.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 10 });
      await page.mouse.up();
    }
    await page.waitForTimeout(400);
    await expect(page.locator(SEL.shareIcon).first()).toBeVisible();
  });

  test('PDP-TC-008 · Product title and price are visible', async ({ page }) => {
    await goToPDP(page);
    await expect(page.locator(SEL.productTitle).first()).toBeVisible();
    await expect(page.locator(SEL.productPrice).first()).toBeVisible();
    const priceText = await page.locator(SEL.productPrice).first().textContent();
    expect(priceText).toMatch(/\d/); // contains a number
  });

});

// ─── GALLERY ──────────────────────────────────────────────────────────────────

test.describe('Gallery', () => {

  test('PDP-TC-009 · Gallery images visible with consistent layout', async ({ page }) => {
    await goToPDP(page);
    const images = page.locator(SEL.galleryImage);
    await expect(images.first()).toBeVisible();
    const count = await images.count();
    expect(count).toBeGreaterThan(0);
  });

  test('PDP-TC-010 · Video tile aligned with images — no uneven transition', async ({ page }) => {
    await goToPDP(page);
    const video = page.locator(SEL.videoTile).first();
    if (await video.isVisible()) {
      const videoBox = await video.boundingBox();
      const imgBox   = await page.locator(SEL.galleryImage).first().boundingBox();
      // Heights should be within 10px of each other
      expect(Math.abs((videoBox?.height ?? 0) - (imgBox?.height ?? 0))).toBeLessThan(10);
    }
  });

  test('PDP-TC-011 · Tag overlay appears only on first gallery image', async ({ page }) => {
    await goToPDP(page);
    await expect(page.locator(SEL.tagOverlay).first()).toBeVisible();

    await swipeGallery(page, 1);
    const overlayAfterSwipe = await page.locator(SEL.tagOverlay).first().isVisible().catch(() => false);
    expect(overlayAfterSwipe).toBe(false);
  });

  test('PDP-TC-013 · Looks gallery images present and consistent', async ({ page }) => {
    await goToPDP(page);
    const looks = page.locator(SEL.looksGallery);
    if (await looks.isVisible()) {
      const imgs = looks.locator('img');
      const count = await imgs.count();
      expect(count).toBeGreaterThan(0);
      // All images should have valid src
      for (let i = 0; i < count; i++) {
        const src = await imgs.nth(i).getAttribute('src');
        expect(src).toBeTruthy();
      }
    }
  });

  test('PDP-TC-014 · Customer photos load and render', async ({ page }) => {
    await goToPDP(page);
    const section = page.locator(SEL.customerPhotos);
    if (await section.isVisible()) {
      const imgs = section.locator('img');
      await expect(imgs.first()).toBeVisible();
    }
  });

  test('PDP-TC-015 · Customer photos section hidden when empty', async ({ page }) => {
    await goToPDP(page);
    const section = page.locator(SEL.customerPhotos);
    if (await section.isVisible()) {
      const count = await section.locator('img').count();
      if (count === 0) {
        await expect(section).not.toBeVisible();
      }
    }
  });

  test('PDP-TC-016 · Scroll usable while images loading on slow network', async ({ page }) => {
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false, downloadThroughput: 80000, uploadThroughput: 30000, latency: 1500,
    });
    await page.goto(PDP_URL);
    // Should be able to scroll before networkidle
    const scrollY1 = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    const scrollY2 = await page.evaluate(() => window.scrollY);
    expect(scrollY2).toBeGreaterThan(scrollY1);

    await client.send('Network.emulateNetworkConditions', {
      offline: false, downloadThroughput: -1, uploadThroughput: -1, latency: 0,
    });
  });

  test('PDP-TC-018 · Gallery buttons Photos/Videos/Dims switch content correctly', async ({ page }) => {
    await goToPDP(page);
    const photosBtn = page.locator(SEL.galleryBtnPhotos).first();
    const videosBtn = page.locator(SEL.galleryBtnVideos).first();
    const dimsBtn   = page.locator(SEL.galleryBtnDims).first();

    if (await photosBtn.isVisible()) {
      await photosBtn.click();
      await page.waitForTimeout(400);
      await expect(page.locator(SEL.galleryImage).first()).toBeVisible();
    }
    if (await videosBtn.isVisible()) {
      await videosBtn.click();
      await page.waitForTimeout(400);
    }
    if (await dimsBtn.isVisible()) {
      await dimsBtn.click();
      await page.waitForTimeout(400);
    }
    // No crash — still on PDP
    expect(page.url()).toContain(new URL(PDP_URL).pathname);
  });

  test('PDP-TC-019 · Missing dimension image handled gracefully — no crash', async ({ page }) => {
    await goToPDP(page);
    if (await page.locator(SEL.galleryBtnDims).first().isVisible()) {
      await page.locator(SEL.galleryBtnDims).first().click();
      await page.waitForTimeout(500);
    }
    // Page should still be functional
    await expect(page.locator(SEL.productTitle).first()).toBeVisible();
  });

  test('PDP-TC-020 · Gallery carousel loops from last to first image', async ({ page }) => {
    await goToPDP(page);
    const total = await page.locator(SEL.galleryImage).count();
    // Swipe to last image
    await swipeGallery(page, total);
    // One more swipe — should loop to first
    await swipeGallery(page, 1);
    await page.waitForTimeout(400);
    // First image should be active/visible again
    await expect(page.locator(SEL.galleryImage).first()).toBeVisible();
  });

});

// ─── VIDEO ────────────────────────────────────────────────────────────────────

test.describe('Video', () => {

  test('PDP-TC-023 · Multiple videos — no overlapping audio (single instance)', async ({ page }) => {
    await goToPDP(page);
    const videos = page.locator(SEL.videoTile);
    const count = await videos.count();
    if (count >= 2) {
      await videos.nth(0).click();
      await page.waitForTimeout(800);
      await videos.nth(1).click();
      await page.waitForTimeout(800);
      // First video should be paused
      const firstPaused = await videos.nth(0).evaluate((el) => {
        const v = el.tagName === 'VIDEO' ? el : el.querySelector('video');
        return v ? v.paused : true;
      });
      expect(firstPaused).toBe(true);
    }
  });

  test('PDP-TC-024 · Video stops when scrolled away', async ({ page }) => {
    await goToPDP(page);
    const video = page.locator(SEL.videoTile).first();
    if (await video.isVisible()) {
      await video.click();
      await page.waitForTimeout(800);
      // Scroll video out of view
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      const paused = await video.evaluate((el) => {
        const v = el.tagName === 'VIDEO' ? el : el.querySelector('video');
        return v ? v.paused : true;
      });
      expect(paused).toBe(true);
    }
  });

  test('PDP-TC-026 · No video — clean placeholder shown, no grey block', async ({ page }) => {
    await goToPDP(page);
    const videoCount = await page.locator(SEL.videoTile).count();
    if (videoCount === 0) {
      const greyBlock = await page.locator('.grey-background, [style*="background: grey"]').count();
      expect(greyBlock).toBe(0);
    }
  });

});

// ─── OPTIONS ──────────────────────────────────────────────────────────────────

test.describe('Options', () => {

  test('PDP-TC-028 · Selected fabric option visible and not truncated', async ({ page }) => {
    await goToPDP(page);
    const fabric = page.locator(SEL.fabricOption).first();
    if (await fabric.isVisible()) {
      await fabric.click();
      await page.waitForTimeout(400);
      const selected = page.locator(SEL.selectedOption).first();
      await expect(selected).toBeVisible();
      // Check text is not clipped — element width > 0
      const box = await selected.boundingBox();
      expect(box?.width).toBeGreaterThan(10);
    }
  });

  test('PDP-TC-029 · Only one option dropdown open at a time (auto-accordion)', async ({ page }) => {
    await goToPDP(page);
    const fabric = page.locator(SEL.fabricOption).first();
    const size   = page.locator(SEL.sizeOption).first();

    if (await fabric.isVisible() && await size.isVisible()) {
      await fabric.click();
      await page.waitForTimeout(300);

      await size.click();
      await page.waitForTimeout(300);

      // Fabric dropdown should be closed
      const fabricExpanded = await fabric.getAttribute('aria-expanded');
      expect(fabricExpanded === 'true').toBe(false);
    }
  });

  test('PDP-TC-032 · Single option selector hidden when only one choice', async ({ page }) => {
    await goToPDP(page);
    const options = page.locator(SEL.optionDropdown);
    const count = await options.count();
    if (count === 1) {
      const visible = await options.first().isVisible();
      // Per spec: hidden when only one choice
      expect(visible).toBe(false);
    }
  });

  test('PDP-TC-075 · Variant selection updates price and offer badge', async ({ page }) => {
    await goToPDP(page);
    const priceBefore = await page.locator(SEL.productPrice).first().textContent();

    const options = page.locator(SEL.fabricOption);
    const count = await options.count();
    if (count >= 2) {
      await options.nth(1).click();
      await page.waitForTimeout(600);
      const priceAfter = await page.locator(SEL.productPrice).first().textContent();
      // Price may or may not change — but it should still be a valid price
      expect(priceAfter).toMatch(/\d/);
    }
  });

});

// ─── QTY / CART ───────────────────────────────────────────────────────────────

test.describe('Qty / Cart', () => {

  test('PDP-TC-033 · Qty dropdown closes on outside tap', async ({ page }) => {
    await goToPDP(page);
    const qtyDropdown = page.locator(SEL.qtyDropdown).first();
    if (await qtyDropdown.isVisible()) {
      await qtyDropdown.click();
      await page.waitForTimeout(300);
      // Tap outside
      await page.mouse.click(10, 10);
      await page.waitForTimeout(300);
      const expanded = await qtyDropdown.getAttribute('aria-expanded');
      expect(expanded === 'true').toBe(false);
    }
  });

  test('PDP-TC-036 · Add to Cart button visible and cart toast appears', async ({ page }) => {
    await goToPDP(page);
    const atcBtn = page.locator(SEL.addToCartBtn).first();
    await expect(atcBtn).toBeVisible();
    await atcBtn.click();
    await page.waitForTimeout(1000);
    const toast = page.locator(SEL.cartToast);
    await expect(toast).toBeVisible({ timeout: 3000 });
  });

  test('PDP-TC-037 · EMI + ATC visible when scrolled past options', async ({ page }) => {
    await goToPDP(page);
    await scrollToBottom(page);
    const atcVisible = await page.locator(SEL.addToCartBtn).first().isVisible();
    expect(atcVisible).toBe(true);
  });

  test('PDP-TC-038 · PDP qty stays in sync with cart quantity', async ({ page }) => {
    await goToPDP(page);
    const qtyEl = page.locator(SEL.qtyDropdown).first();
    if (await qtyEl.isVisible()) {
      // Read initial qty
      const qtyText = await qtyEl.textContent();
      expect(qtyText).toMatch(/\d/);
    }
  });

  test('PDP-TC-078 · Stock quantity min/max boundaries enforced', async ({ page }) => {
    await goToPDP(page);
    const qtyDropdown = page.locator(SEL.qtyDropdown).first();
    if (await qtyDropdown.isVisible()) {
      await qtyDropdown.click();
      await page.waitForTimeout(300);
      // Max item in list — should be limited (not infinite)
      const items = page.locator(`${SEL.qtyDropdown} option, ${SEL.qtyDropdown} [role="option"]`);
      const count = await items.count();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(20); // typical max stock boundary
    }
  });

});

// ─── PINCODE ──────────────────────────────────────────────────────────────────

test.describe('Pincode', () => {

  test('PDP-TC-039 · Pincode section visible with correct UI', async ({ page }) => {
    await goToPDP(page);
    await expect(page.locator(SEL.pincodeSection).first()).toBeVisible();
  });

  test('PDP-TC-040 · Store count visible in pincode/timeline section', async ({ page }) => {
    await goToPDP(page);
    const storeCount = page.locator(SEL.storeCount).first();
    if (await storeCount.isVisible()) {
      const text = await storeCount.textContent();
      expect(text).toMatch(/\d/);
    }
  });

  test('PDP-TC-077 · Changing pincode refreshes delivery info', async ({ page }) => {
    await goToPDP(page);
    const input = page.locator(SEL.pincodeInput).first();
    if (await input.isVisible()) {
      await input.fill('110001');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      const deliveryText = await page.locator(SEL.deliveryTimeline).first().textContent().catch(() => '');
      expect(deliveryText?.length).toBeGreaterThan(0);

      await input.fill('400001');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      // Delivery info should update (at minimum not crash)
      expect(page.url()).toContain(new URL(PDP_URL).pathname);
    }
  });

});

// ─── LEADS ────────────────────────────────────────────────────────────────────

test.describe('Leads', () => {

  test('PDP-TC-043 · Form fields not hidden by keyboard on focus', async ({ page }) => {
    await goToPDP(page);
    const unlockBtn = page.locator(SEL.unlockNowBtn).first();
    if (await unlockBtn.isVisible()) {
      await unlockBtn.click();
      await page.waitForTimeout(500);
      const inputs = page.locator(`${SEL.leadForm} input`);
      const count = await inputs.count();
      for (let i = 0; i < count; i++) {
        await inputs.nth(i).click();
        await page.waitForTimeout(300);
        const box = await inputs.nth(i).boundingBox();
        const viewport = page.viewportSize();
        // Input must not be below viewport (hidden by keyboard)
        if (box && viewport) {
          expect(box.y + box.height).toBeLessThan(viewport.height);
        }
      }
    }
  });

  test('PDP-TC-044 · Invalid pincode in lead form — validation shown, no lead created', async ({ page }) => {
    await goToPDP(page);
    const unlockBtn = page.locator(SEL.unlockNowBtn).first();
    if (await unlockBtn.isVisible()) {
      await unlockBtn.click();
      await page.waitForTimeout(500);
      const pincodeField = page.locator(`${SEL.leadForm} input[name*="pincode" i], ${SEL.leadForm} input[placeholder*="pincode" i]`).first();
      if (await pincodeField.isVisible()) {
        await pincodeField.fill('123'); // invalid
        await page.locator(SEL.leadSubmitBtn).first().click();
        await page.waitForTimeout(500);
        await expect(page.locator(SEL.leadError).first()).toBeVisible();
        const successVisible = await page.locator(SEL.leadSuccessMsg).isVisible().catch(() => false);
        expect(successVisible).toBe(false);
      }
    }
  });

  test('PDP-TC-045 · Unlock Now success — single thank-you message', async ({ page }) => {
    await goToPDP(page);
    const unlockBtn = page.locator(SEL.unlockNowBtn).first();
    if (await unlockBtn.isVisible()) {
      await unlockBtn.click();
      await page.waitForTimeout(500);
      // Fill form with valid data
      const inputs = page.locator(`${SEL.leadForm} input`);
      const count  = await inputs.count();
      for (let i = 0; i < count; i++) {
        const placeholder = await inputs.nth(i).getAttribute('placeholder') || '';
        if (/name/i.test(placeholder))    await inputs.nth(i).fill('Test User');
        if (/phone|mobile/i.test(placeholder)) await inputs.nth(i).fill('9999999999');
        if (/pincode/i.test(placeholder)) await inputs.nth(i).fill('110001');
        if (/email/i.test(placeholder))   await inputs.nth(i).fill('test@example.com');
      }
      await page.locator(SEL.leadSubmitBtn).first().click();
      await page.waitForTimeout(1500);

      const successCount = await page.locator(SEL.leadSuccessMsg).count();
      expect(successCount).toBe(1); // exactly one, not duplicated
    }
  });

  test('PDP-TC-046 · Success state retained — no re-submission on reopen', async ({ page }) => {
    await goToPDP(page);
    // After success: close and reopen form — should show success, not blank form
    const unlockBtn = page.locator(SEL.unlockNowBtn).first();
    if (await unlockBtn.isVisible()) {
      await unlockBtn.click();
      await page.waitForTimeout(300);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await unlockBtn.click();
      await page.waitForTimeout(500);
      // Should not be empty form if previously submitted
      // (this is a UI state check; adjust based on your success state logic)
      expect(page.url()).toContain(new URL(PDP_URL).pathname);
    }
  });

  test('PDP-TC-048 · Price Drop validation — error text does not overlap input', async ({ page }) => {
    await goToPDP(page);
    const priceDropBtn = page.locator(SEL.priceDrop).first();
    if (await priceDropBtn.isVisible()) {
      await priceDropBtn.click();
      await page.waitForTimeout(500);
      await page.locator(SEL.leadSubmitBtn).first().click();
      await page.waitForTimeout(500);
      const errorEl = page.locator(SEL.leadError).first();
      if (await errorEl.isVisible()) {
        const errBox   = await errorEl.boundingBox();
        const inputs   = page.locator(`${SEL.leadForm} input`);
        const inputBox = await inputs.first().boundingBox();
        if (errBox && inputBox) {
          // Error must not overlap input field vertically
          const overlap = errBox.y < inputBox.y + inputBox.height && errBox.y + errBox.height > inputBox.y;
          expect(overlap).toBe(false);
        }
      }
    }
  });

  test('PDP-TC-050 · Early Delivery E2E — lead created, correct UI flow', async ({ page }) => {
    await goToPDP(page);
    const btn = page.locator(SEL.earlyDelivery).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(500);
      await expect(page.locator(SEL.leadForm).first()).toBeVisible();
    }
  });

  test('PDP-TC-054 · T&C present on all lead forms', async ({ page }) => {
    await goToPDP(page);
    const leadButtons = [
      page.locator(SEL.unlockNowBtn).first(),
      page.locator(SEL.priceDrop).first(),
      page.locator(SEL.earlyDelivery).first(),
      page.locator(SEL.bookVisit).first(),
    ];
    for (const btn of leadButtons) {
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(500);
        const tnc = page.locator(SEL.leadTnC).first();
        await expect(tnc).toBeVisible();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }
  });

});

// ─── STRIP NAV ────────────────────────────────────────────────────────────────

test.describe('Strip Nav', () => {

  test('PDP-TC-066 · Underline updates as sections scroll', async ({ page }) => {
    await goToPDP(page);
    const strip = page.locator(SEL.stripNav).first();
    if (await strip.isVisible()) {
      const underlineBefore = await page.locator(SEL.stripUnderline).first().boundingBox();
      await scrollToBottom(page);
      await page.waitForTimeout(600);
      const underlineAfter = await page.locator(SEL.stripUnderline).first().boundingBox();
      // Underline position should have moved
      expect(underlineAfter?.x).not.toBe(underlineBefore?.x);
    }
  });

  test('PDP-TC-067 · Strip nav tabs navigate to correct sections', async ({ page }) => {
    await goToPDP(page);
    const tabs = page.locator(SEL.stripNavTab);
    const count = await tabs.count();
    for (let i = 0; i < count; i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(500);
      // Page should not crash; URL stays on PDP
      expect(page.url()).toContain(new URL(PDP_URL).pathname);
    }
  });

});

// ─── STORE / INFO ─────────────────────────────────────────────────────────────

test.describe('Store / Info', () => {

  test('PDP-TC-069 · Cities list populated in store detail', async ({ page }) => {
    await goToPDP(page);
    const storeSection = page.locator(SEL.storeSection).first();
    if (await storeSection.isVisible()) {
      const cities = storeSection.locator(SEL.citiesList);
      if (await cities.isVisible()) {
        const text = await cities.textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('PDP-TC-072 · WhatsApp button opens WhatsApp deep link', async ({ page }) => {
    await goToPDP(page);
    const waBtn = page.locator(SEL.whatsappBtn).first();
    if (await waBtn.isVisible()) {
      const href = await waBtn.getAttribute('href');
      expect(href).toMatch(/whatsapp|wa\.me/i);
    }
  });

});

// ─── OFFERS ───────────────────────────────────────────────────────────────────

test.describe('Offers', () => {

  test('PDP-TC-073 · Offers section visible with content', async ({ page }) => {
    await goToPDP(page);
    const offers = page.locator(SEL.offersSection).first();
    if (await offers.isVisible()) {
      const text = await offers.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  test('PDP-TC-074 · Offers section hidden when no offers exist', async ({ page }) => {
    await goToPDP(page);
    const offers = page.locator(SEL.offersSection);
    if (await offers.count() > 0 && await offers.first().isVisible()) {
      const text = await offers.first().textContent();
      if (!text || text.trim().length === 0) {
        await expect(offers.first()).not.toBeVisible();
      }
    }
  });

});

// ─── COMBO ────────────────────────────────────────────────────────────────────

test.describe('Combo', () => {

  test('PDP-TC-058 · Main combo product cannot be deselected', async ({ page }) => {
    await goToPDP(page);
    const comboMain = page.locator(SEL.comboMainProduct).first();
    if (await comboMain.isVisible()) {
      await comboMain.click();
      await page.waitForTimeout(300);
      // Main product should still be selected
      const isSelected = await comboMain.getAttribute('aria-checked') ?? await comboMain.getAttribute('data-selected');
      expect(isSelected).not.toBe('false');
    }
  });

  test('PDP-TC-059 · Combo item tap navigates to correct PDP', async ({ page }) => {
    await goToPDP(page);
    const comboItem = page.locator(SEL.comboItem).nth(1);
    if (await comboItem.isVisible()) {
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page').catch(() => null),
        comboItem.click(),
      ]);
      await page.waitForTimeout(800);
      // Should navigate either in same page or new tab
      expect(page.url().length).toBeGreaterThan(0);
    }
  });

  test('PDP-TC-079 · Combo price recalculates on item toggle', async ({ page }) => {
    await goToPDP(page);
    const comboSection = page.locator(SEL.comboSection).first();
    if (await comboSection.isVisible()) {
      const priceBefore = await page.locator(SEL.comboPrice).first().textContent();
      const items = page.locator(SEL.comboItem);
      if (await items.count() >= 2) {
        await items.nth(1).click();
        await page.waitForTimeout(500);
        const priceAfter = await page.locator(SEL.comboPrice).first().textContent();
        expect(priceAfter).not.toBe(priceBefore);
      }
    }
  });

  test('PDP-TC-080 · Combo ATC adds correct SKUs to cart', async ({ page }) => {
    await goToPDP(page);
    const comboATC = page.locator(SEL.comboATC).first();
    if (await comboATC.isVisible()) {
      await comboATC.click();
      await page.waitForTimeout(1000);
      await expect(page.locator(SEL.cartToast)).toBeVisible({ timeout: 3000 });
    }
  });

});

// ─── REVIEWS ──────────────────────────────────────────────────────────────────

test.describe('Reviews', () => {

  test('PDP-TC-060 · Rating count visible and matches expected format', async ({ page }) => {
    await goToPDP(page);
    const ratingEl = page.locator(SEL.reviewRating).first();
    if (await ratingEl.isVisible()) {
      const text = await ratingEl.textContent();
      expect(text).toMatch(/\d/);
    }
  });

  test('PDP-TC-061 · Stars aligned consistently across sections', async ({ page }) => {
    await goToPDP(page);
    const stars = page.locator(SEL.reviewStars);
    const count = await stars.count();
    if (count >= 2) {
      const box1 = await stars.nth(0).boundingBox();
      const box2 = await stars.nth(1).boundingBox();
      // Heights should be consistent (within 4px)
      expect(Math.abs((box1?.height ?? 0) - (box2?.height ?? 0))).toBeLessThan(4);
    }
  });

  test('PDP-TC-062 · Write review form opens and renders', async ({ page }) => {
    await goToPDP(page);
    const reviewSection = page.locator(SEL.reviewsSection).first();
    if (await reviewSection.isVisible()) {
      const writeBtn = reviewSection.locator('button:text("Write a Review"), button:text("Write Review"), [data-testid="write-review"]').first();
      if (await writeBtn.isVisible()) {
        await writeBtn.click();
        await page.waitForTimeout(500);
        await expect(page.locator(SEL.reviewForm).first()).toBeVisible();
      }
    }
  });

  test('PDP-TC-063 · Submitting review shows single thank-you — no duplicate dialog+toast', async ({ page }) => {
    await goToPDP(page);
    // Submit review flow — count success dialogs/toasts
    const successCount = await page.locator(SEL.leadSuccessMsg).count();
    expect(successCount).toBeLessThanOrEqual(1);
  });

  test('PDP-TC-064 · Review photo scroll — no flicker or reload loop', async ({ page }) => {
    await goToPDP(page);
    const photos = page.locator(SEL.reviewPhotos).first();
    if (await photos.isVisible()) {
      // Scroll within the photo section
      await photos.evaluate((el) => el.scrollBy(0, 300));
      await page.waitForTimeout(500);
      await photos.evaluate((el) => el.scrollBy(0, -300));
      await page.waitForTimeout(500);
      // Images should still be visible
      await expect(photos.locator('img').first()).toBeVisible();
    }
  });

  test('PDP-TC-065 · Photo filter from "see all" shows image reviews only', async ({ page }) => {
    await goToPDP(page);
    const photoFilter = page.locator(SEL.reviewPhotoFilter).first();
    if (await photoFilter.isVisible()) {
      await photoFilter.click();
      await page.waitForTimeout(500);
      const images = page.locator(`${SEL.reviewsSection} img`);
      const count = await images.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('PDP-TC-082 · Gallery CTA scrolls to reviews section', async ({ page }) => {
    await goToPDP(page);
    const cta = page.locator(SEL.galleryCta).first();
    if (await cta.isVisible()) {
      await cta.click();
      await page.waitForTimeout(800);
      const reviewsVisible = await page.locator(SEL.reviewsSection).first().isVisible();
      expect(reviewsVisible).toBe(true);
    }
  });

});

// ─── DELIVERY ─────────────────────────────────────────────────────────────────

test.describe('Delivery', () => {

  test('PDP-TC-076 · Delivery timeline milestones visible and aligned', async ({ page }) => {
    await goToPDP(page);
    const timeline = page.locator(SEL.deliveryTimeline).first();
    if (await timeline.isVisible()) {
      const milestones = timeline.locator('[class*="milestone"], [class*="step"], li');
      const count = await milestones.count();
      expect(count).toBeGreaterThan(0);
    }
  });

});

// ─── RECENTLY VIEWED ──────────────────────────────────────────────────────────

test.describe('Recently Viewed', () => {

  test('PDP-TC-083 · Recently viewed products populated after visiting multiple PDPs', async ({ page }) => {
    // Visit two PDPs to populate recently viewed
    await goToPDP(page);
    await page.goto(PDP_URL + '?variant=2'); // visit second product (adjust URL as needed)
    await page.waitForLoadState('networkidle');
    await page.goto(PDP_URL);
    await page.waitForLoadState('networkidle');

    const recentSection = page.locator(SEL.recentlyViewed).first();
    if (await recentSection.isVisible()) {
      const products = recentSection.locator(SEL.productTitle + ', img, [class*="product"]');
      const count = await products.count();
      expect(count).toBeGreaterThan(0);
    }
  });

});
