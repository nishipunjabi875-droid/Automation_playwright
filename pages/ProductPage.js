const BasePage = require('./BasePage');
const { expect } = require('@playwright/test');

class ProductPage extends BasePage {
  constructor(page) {
    super(page);
    // General Selectors
    this.productNameLocator = page.locator('h1, .product-title, .pdp-title, .product-name').first();
    this.priceLocator = page.locator('.offer-price, .price, .product-price, .pdp-price').first();
    this.discountLocator = page.locator('.discount, .discount-percent, .pdp-discount').first();
    this.ratingLocator = page.locator('.ratings, .pdp-rating, .rating-stars, .rating-star').first();
    this.reviewCountLocator = page.locator('.review-count, .review, a[href*="review"]').first();
    this.availabilityLocator = page.locator('.stock-status, .availability, .in-stock, .instock').first();
    this.pincodeInput = page.locator('#pincode, input[name="pincode"], input[placeholder*="pincode"], input[placeholder*="Pin"]').first();
    this.pincodeCheckBtn = page.locator('#pincode-check, .pincode-check-btn, .check-pincode, #button-pincode').first();
    this.pincodeStatusText = page.locator('.pincode-status, .pincode-response, .delivery-info, .delivery-status').first();
    this.addToCartBtn = page.locator('.add-to-cart, #button-cart, #add-cart-btn, .add-cart-btn').first();
    this.buyNowBtn = page.locator('.buy-now, #buy-now-btn, .buy-now-btn').first();
    this.variantSelector = page.locator('.variant-selection, .option-box, .size-selection, .color-selector').first();
  }

  async validateProductDetails() {
    const details = {
      name: '',
      price: '',
      discount: '',
      rating: '',
      reviews: '',
      availability: 'N/A',
      hasVariants: false,
      pincodeChecked: false,
      hasAddToCart: false,
      hasBuyNow: false,
      issues: []
    };

    try {
      // 1. Name Check
      if (await this.productNameLocator.isVisible({ timeout: 5000 })) {
        details.name = (await this.productNameLocator.innerText()).trim();
      } else {
        details.issues.push('Product name is not visible.');
      }

      // 2. Price Check
      if (await this.priceLocator.isVisible({ timeout: 2000 })) {
        details.price = (await this.priceLocator.innerText()).trim();
      } else {
        details.issues.push('Product price is not visible.');
      }

      // 3. Discount Check (optional, but check if visible)
      if (await this.discountLocator.isVisible({ timeout: 1000 })) {
        details.discount = (await this.discountLocator.innerText()).trim();
      }

      // 4. Rating & Reviews Check
      if (await this.ratingLocator.isVisible({ timeout: 1000 })) {
        details.rating = (await this.ratingLocator.innerText()).trim();
      }
      if (await this.reviewCountLocator.isVisible({ timeout: 1000 })) {
        details.reviews = (await this.reviewCountLocator.innerText()).trim();
      }

      // 5. Availability Check
      if (await this.availabilityLocator.isVisible({ timeout: 1000 })) {
        details.availability = (await this.availabilityLocator.innerText()).trim();
      } else {
        // Fallback check
        const bodyText = await this.page.innerText('body');
        if (bodyText.includes('In Stock') || bodyText.includes('in stock') || bodyText.includes('Available')) {
          details.availability = 'In Stock (text matched)';
        } else if (bodyText.includes('Out of Stock') || bodyText.includes('out of stock')) {
          details.availability = 'Out of Stock';
        }
      }

      // 6. Variants Check
      details.hasVariants = await this.variantSelector.isVisible({ timeout: 1000 });
      if (details.hasVariants) {
        // Attempt to select another variant if possible
        const option = this.variantSelector.locator('a, button, li, input[type="radio"]').first();
        if (await option.isVisible()) {
          await option.click({ force: true }).catch(() => {});
        }
      }

      // 7. Pincode Validation
      if (await this.pincodeInput.isVisible({ timeout: 2000 })) {
        await this.pincodeInput.fill('302015'); // Sample Indian pincode
        if (await this.pincodeCheckBtn.isVisible()) {
          await this.pincodeCheckBtn.click();
          await this.page.waitForTimeout(1000);
          details.pincodeChecked = true;
        }
      }

      // 8. Add to Cart & Buy Now buttons state
      details.hasAddToCart = await this.addToCartBtn.isVisible({ timeout: 2000 });
      details.hasBuyNow = await this.buyNowBtn.isVisible({ timeout: 2000 });

      if (!details.hasAddToCart) {
        details.issues.push('Add to Cart button missing.');
      }
      if (!details.hasBuyNow) {
        details.issues.push('Buy Now button missing.');
      }
    } catch (e) {
      details.issues.push(`Error during product details validation: ${e.message}`);
    }

    return details;
  }

  async validateVideo(videoSelector = '.image-gallery-thumbnail.hasvideo, .videoSlider .cursor-pointer, .video-tile, #videos-tab, .isvideo img', expectedVideo = '') {
    const videoResult = {
      videoFound: false,
      playerOpened: false,
      videoLoaded: false,
      videoUrl: '',
      failureReason: ''
    };

    try {
      // Escape modals/popups
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.evaluate(() => {
        const closeButtons = document.querySelectorAll('button[aria-label="Close"], button[class*="close"], button[class*="Close"]');
        closeButtons.forEach(btn => { try { btn.click(); } catch(e){} });
        const dialogs = document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="popup"]');
        dialogs.forEach(d => { try { d.remove(); } catch(e){} });
        if (document.body) {
          document.body.style.pointerEvents = 'auto';
          document.body.style.overflow = 'auto';
        }
      }).catch(() => {});
      await this.page.waitForTimeout(500);

      // Check for "+ More" button in gallery and click
      const moreButton = this.page.locator('.image-gallery-thumbnail', { hasText: /\+\d+\s+More/i }).first();
      if (await moreButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await moreButton.click({ force: true }).catch(() => {});
        await this.page.waitForTimeout(1000);
      }

      // Split and resolve selector
      const selectors = videoSelector.split(',').map(s => s.trim());
      let videoElement = null;
      for (const sel of selectors) {
        let normalized = sel;
        if (sel.startsWith('//') || sel.startsWith('/') || sel.includes('[@')) {
          normalized = `xpath=${sel}`;
        }
        const loc = this.page.locator(normalized);
        const count = await loc.count().catch(() => 0);
        for (let i = 0; i < count; i++) {
          const el = loc.nth(i);
          if (await el.isVisible().catch(() => false)) {
            videoElement = el;
            break;
          }
        }
        if (videoElement) break;
      }

      if (!videoElement) {
        videoResult.failureReason = 'Video thumbnail trigger selector not visible.';
        return videoResult;
      }

      videoResult.videoFound = true;

      // Click video thumbnail
      await videoElement.click({ force: true, timeout: 5000 }).catch(async () => {
        await videoElement.evaluate(el => el.click());
      });
      await this.page.waitForTimeout(1000);

      // Active slide resolution for lazy loaded galleries
      const activeSlide = this.page.locator('.image-gallery-slide.image-gallery-center');
      if (await activeSlide.first().isVisible().catch(() => false)) {
        const videoInSlide = activeSlide.locator('video, iframe');
        if (await videoInSlide.count() === 0) {
          await activeSlide.first().click({ force: true, timeout: 5000 }).catch(async () => {
            await activeSlide.first().evaluate(el => el.click());
          });
          await this.page.waitForTimeout(1000);
        }
      }

      // Check player
      try {
        await Promise.any([
          this.page.waitForSelector('video', { state: 'attached', timeout: 5000 }),
          this.page.waitForSelector('iframe[src*="youtube.com"], iframe[src*="youtu.be"]', { state: 'attached', timeout: 5000 }),
          this.page.waitForSelector('.video-player, .modal-body, #movie_player', { state: 'visible', timeout: 5000 })
        ]);
      } catch (e) {
        // Wait timeout
      }

      const playerIndicators = ['iframe[src*="youtube.com"]', 'iframe[src*="youtu.be"]', 'video', '.video-player', '#movie_player'];
      let foundPlayer = false;
      for (const ind of playerIndicators) {
        if (await this.page.locator(ind).count() > 0) {
          foundPlayer = true;
          break;
        }
      }

      if (!foundPlayer) {
        videoResult.failureReason = 'Video player/popup failed to render.';
        return videoResult;
      }

      videoResult.playerOpened = true;

      const iframeLocator = this.page.locator('iframe[src*="youtube.com"], iframe[src*="youtu.be"]').first();
      const html5VideoLocator = this.page.locator('video').first();
      let isYouTube = await iframeLocator.isVisible().catch(() => false);
      let isHTML5 = !isYouTube && (await html5VideoLocator.isVisible().catch(() => false));

      if (isYouTube) {
        const src = await iframeLocator.getAttribute('src').catch(() => '');
        videoResult.videoUrl = src;
        const frame = iframeLocator.contentFrame();
        if (frame) {
          const errorOverlay = frame.locator('.ytp-error-content-wrap-reason');
          if (await errorOverlay.isVisible({ timeout: 1000 }).catch(() => false)) {
            videoResult.failureReason = `YouTube error: ${(await errorOverlay.innerText())}`;
          } else {
            videoResult.videoLoaded = true;
          }
        } else {
          videoResult.videoLoaded = true; // Treated as loaded if iframe is present but cross-origin restricted
        }
      } else if (isHTML5) {
        let src = await html5VideoLocator.getAttribute('src').catch(() => '');
        if (!src) {
          const sourceTag = html5VideoLocator.locator('source').first();
          if (await sourceTag.count() > 0) {
            src = await sourceTag.getAttribute('src').catch(() => '');
          }
        }
        videoResult.videoUrl = src;

        const duration = await html5VideoLocator.evaluate(el => {
          return new Promise(resolve => {
            if (el.readyState >= 1) resolve(el.duration);
            else {
              el.addEventListener('loadedmetadata', () => resolve(el.duration), { once: true });
              setTimeout(() => resolve(el.duration || 0), 10000);
            }
          });
        }).catch(() => 0);

        if (duration > 0) {
          videoResult.videoLoaded = true;
        } else {
          videoResult.failureReason = 'HTML5 video duration is zero or failed metadata load.';
        }
      } else {
        videoResult.failureReason = 'Unrecognized video player type.';
      }
    } catch (e) {
      videoResult.failureReason = `Video validation failed: ${e.message}`;
    }

    return videoResult;
  }
}

module.exports = ProductPage;
