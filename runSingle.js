const { execSync } = require('child_process');

const url = process.argv[2];
const selector = process.argv[3];
const name = process.argv[4] || 'Ad-hoc Product Check';
const expected = process.argv[5] || '';

if (!url || !selector) {
  console.log('\n==================================================');
  console.log('    WOODENSTREET SINGLE VIDEO VALIDATOR CLI       ');
  console.log('==================================================');
  console.log('Usage: node runSingle.js <ProductURL> <VideoSelector> [ProductName] [ExpectedVideo]');
  console.log('\nExample:');
  console.log('  node runSingle.js "https://www.woodenstreet.com/product/lorenz-3-seater-sofa-cotton-jade-ivory" ".videoSlider .cursor-pointer" "Lorenz Sofa" "wsyt1"');
  console.log('==================================================\n');
  process.exit(1);
}

console.log(`\nStarting validation for: "${name}"`);
console.log(`URL: ${url}`);
console.log(`Selector: ${selector}`);
if (expected) {
  console.log(`Expected Video Identifier: ${expected}`);
}
console.log('');

try {
  // Execute Playwright test with injected env variables
  execSync('npx playwright test tests/videoValidation.spec.js --headed', {
    env: {
      ...process.env,
      PRODUCT_URL: url,
      VIDEO_SELECTOR: selector,
      PRODUCT_NAME: name,
      EXPECTED_VIDEO: expected
    },
    stdio: 'inherit'
  });
} catch (err) {
  // Exit with failure code if test execution fails
  process.exit(1);
}
