/**
 * Configuration for page elements, selectors, and checked attributes.
 */
module.exports = {
  pages: {
    home: {
      name: 'Home Page',
      url: 'https://www.woodenstreet.com/',
      components: [
        {
          id: 'logo',
          name: 'Header Logo',
          selector: 'header img, .logo-box img, a.logo img, .style_headerLogo__r964U img, img[src*="mob-logo.svg"], img[src*="logo.svg"]',
          checkAttrs: ['src', 'alt']
        },
        {
          id: 'search-input',
          name: 'Search Input',
          selector: '#search, input[placeholder*="search" i], .search-box input, input[type="search"]',
          checkAttrs: ['placeholder', 'type']
        },
        {
          id: 'navigation',
          name: 'Navigation Bar',
          selector: 'nav.navigation, .menu-list, .navigation-menu, .style_headerSection___0VZL, #menutouch, .style_menu-mobile-btn__dfbgY, .style_menu-header__ILZYG',
          checkAttrs: ['innerText']
        },
        {
          id: 'hero-banner',
          name: 'Hero Banner Slider',
          selector: 'section.relative.w-full.pb-5, section.relative.pb-5, .slider-carousel, .hero-banner, .home-slider, #main-slider, .banner-section',
          checkAttrs: ['innerText'],
          optional: true
        },
        {
          id: 'deals',
          name: 'Deals Section',
          selector: 'div.bg-gray-100:has-text("sale ends in"), div[class*="bg-[#FFF2F2]"], .deal-section, .offers, [class*="deal" i], [class*="offer" i]',
          checkAttrs: ['innerText'],
          optional: true
        },
        {
          id: 'product-reels',
          name: 'Product Reel',
          selector: '.swiper, div[class*="swiper-container"]',
          multi: true,
          optional: true,
          checkAttrs: ['innerText']
        },
        {
          id: 'reel-images',
          name: 'Reel Image',
          selector: '.swiper img, div[class*="swiper-container"] img',
          multi: true,
          optional: true,
          checkAttrs: ['src', 'alt']
        },
        {
          id: 'category-banners',
          name: 'Category Banner Image',
          selector: 'img[src*="shop-by-categories"], img[src*="mid-banners"], img[src*="mid-banner"], img[src*="category-showcase"], img[src*="popular-"]',
          multi: true,
          optional: true,
          checkAttrs: ['src', 'alt']
        },
        {
          id: 'footer',
          name: 'Footer Section',
          selector: '.style_footerSection__KdicH, footer, #footer, [class*="footer" i], section.bg-white.py-5:has-text("Woodenstreet.com")',
          checkAttrs: ['innerText'],
          optional: true
        }
      ]
    },
    pdp: {
      name: 'Product Detail Page',
      url: 'https://www.woodenstreet.com/product/lorenz-3-seater-sofa-cotton-jade-ivory',
      components: [
        {
          id: 'logo',
          name: 'Header Logo',
          selector: 'header img, .logo-box img, a.logo img, .style_headerLogo__r964U img, img[src*="mob-logo.svg"], img[src*="logo.svg"]',
          checkAttrs: ['src', 'alt']
        },
        {
          id: 'search-input',
          name: 'Search Input',
          selector: '#search, input[placeholder*="search" i], .search-box input, input[type="search"]',
          checkAttrs: ['placeholder', 'type']
        },
        {
          id: 'navigation',
          name: 'Navigation Bar',
          selector: 'nav.navigation, .menu-list, .navigation-menu, .style_headerSection___0VZL, #menutouch, .style_menu-mobile-btn__dfbgY, .style_menu-header__ILZYG',
          checkAttrs: ['innerText']
        },
        {
          id: 'product-title',
          name: 'Product Title',
          selector: 'h1.style_productName__K1G0f, h1.product-title, h1, [itemprop="name"]',
          checkAttrs: ['innerText']
        },
        {
          id: 'product-price',
          name: 'Product Price',
          selector: '.offerprice, .style_sellingPrice__Vp0g6, .selling-price, [class*="sellingPrice" i]',
          checkAttrs: ['innerText']
        },
        {
          id: 'product-gallery',
          name: 'Product Gallery',
          selector: '.image-gallery, .image-gallery-content, .product-gallery, .style_mainSlider__zUa_l',
          checkAttrs: ['classList']
        },
        {
          id: 'variant-options',
          name: 'Variant Options Swatches',
          selector: '[class*="swatch" i], [class*="attributeGroup" i], .bg-lightgrayColor',
          multi: true,
          optional: true,
          checkAttrs: ['innerText']
        },
        {
          id: 'pincode-input',
          name: 'Pincode Check Input',
          selector: 'input[placeholder*="pincode" i], input[name*="pincode" i], #pincode',
          checkAttrs: ['placeholder']
        },
        {
          id: 'add-to-cart',
          name: 'Add to Cart Button',
          selector: 'button:has-text("ADD TO CART"), #button-cart, [class*="btnCart" i]',
          checkAttrs: ['innerText']
        },
        {
          id: 'reviews',
          name: 'Customer Reviews Section',
          selector: 'section:has-text("Customer Reviews"), div:has-text("Customer Reviews"), .style_reviewSection__c_Q4u',
          optional: true,
          checkAttrs: ['innerText']
        },
        {
          id: 'footer',
          name: 'Footer Section',
          selector: '.style_footerSection__KdicH, footer, #footer, [class*="footer" i], section.bg-white.py-5:has-text("Woodenstreet.com")',
          checkAttrs: ['innerText'],
          optional: true
        }
      ]
    },
    category: {
      name: 'Category Page',
      url: 'https://www.woodenstreet.com/wooden-sofa',
      components: [
        {
          id: 'logo',
          name: 'Header Logo',
          selector: 'header img, .logo-box img, a.logo img, .style_headerLogo__r964U img, img[src*="mob-logo.svg"], img[src*="logo.svg"]',
          checkAttrs: ['src', 'alt']
        },
        {
          id: 'search-input',
          name: 'Search Input',
          selector: '#search, input[placeholder*="search" i], .search-box input, input[type="search"]',
          checkAttrs: ['placeholder', 'type']
        },
        {
          id: 'navigation',
          name: 'Navigation Bar',
          selector: 'nav.navigation, .menu-list, .navigation-menu, .style_headerSection___0VZL, #menutouch, .style_menu-mobile-btn__dfbgY, .style_menu-header__ILZYG',
          checkAttrs: ['innerText']
        },
        {
          id: 'category-title',
          name: 'Category Title',
          selector: 'h1.style_categoryHeader__J_Xq9, h1, .category-header',
          checkAttrs: ['innerText']
        },
        {
          id: 'filter-panel',
          name: 'Filters Sidebar Panel',
          selector: 'section:has(div:has-text("Filters")), .filter-panel, [class*="filterContainer" i], .bg-white.shadow-md.rounded-radius4, .style_filter-links-bottom__SBa7h span:has-text("Filter"), span.style_filter_btn__ZDigM:has-text("Filter")',
          checkAttrs: ['innerText']
        },
        {
          id: 'sort-dropdown',
          name: 'Sort Dropdown Bar',
          selector: '.top-filters, div:has(span:has-text("Sort By")), [class*="sortBox" i], .style_filter-links-bottom__SBa7h span:has-text("Sort"), span.style_filter_btn__ZDigM:has-text("Sort")',
          checkAttrs: ['innerText']
        },
        {
          id: 'product-cards',
          name: 'Product Card Items',
          selector: '.productcard, .categ-card-grid, [class*="productcard" i]',
          multi: true,
          checkAttrs: ['innerText']
        },
        {
          id: 'footer',
          name: 'Footer Section',
          selector: '.style_footerSection__KdicH, footer, #footer, [class*="footer" i], section.bg-white.py-5:has-text("Woodenstreet.com")',
          checkAttrs: ['innerText'],
          optional: true
        }
      ]
    }
  }
};
