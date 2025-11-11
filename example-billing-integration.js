/**
 * Example Billing Integration for Happy Plants Club Web App
 * 
 * This file demonstrates how to integrate Google Play Billing with free trials
 * in your Base44 web application running inside the Capacitor wrapper.
 * 
 * Usage:
 * 1. Copy this code to your web app
 * 2. Modify product IDs to match your Play Console setup
 * 3. Implement backend verification endpoints
 * 4. Call initBillingSystem() when your app loads
 */

// ============================================
// Configuration
// ============================================
const BILLING_CONFIG = {
  // Replace with your product IDs from Play Console
  PRODUCT_IDS: {
    MONTHLY: 'premium_monthly',
    YEARLY: 'premium_yearly'
  },
  
  // Your backend API endpoint
  BACKEND_API: 'https://api.yourbackend.com',
  
  // Feature flags
  ENABLE_BILLING: true,
  LOG_DEBUG: true
};

// ============================================
// Billing State Management
// ============================================
const billingState = {
  initialized: false,
  hasSubscription: false,
  isInTrial: false,
  products: [],
  currentPurchase: null
};

// ============================================
// Initialization
// ============================================
async function initBillingSystem() {
  if (!BILLING_CONFIG.ENABLE_BILLING) {
    console.log('Billing disabled in config');
    return;
  }
  
  // Check if BillingBridge is available (only in mobile app)
  if (typeof BillingBridge === 'undefined') {
    console.log('Not running in mobile app - billing not available');
    return;
  }
  
  try {
    log('Initializing billing system...');
    await BillingBridge.initialize();
    billingState.initialized = true;
    log('Billing system initialized');
    
    // Set up event listeners
    setupBillingEventListeners();
    
    // Check current subscription status
    await checkSubscriptionStatus();
    
    // Load available products
    await loadProducts();
    
  } catch (error) {
    console.error('Failed to initialize billing:', error);
  }
}

// ============================================
// Event Listeners
// ============================================
function setupBillingEventListeners() {
  // Purchase successful
  BillingBridge.addListener('purchaseUpdated', async (data) => {
    log('Purchase updated:', data);
    
    try {
      // Verify the purchase on backend
      const verified = await verifyPurchaseOnBackend(data.purchaseToken);
      
      if (verified) {
        billingState.hasSubscription = true;
        billingState.currentPurchase = data;
        
        // Show success message
        showSuccessMessage('Subscription activated! 🎉');
        
        // Enable premium features
        enablePremiumFeatures();
        
        // Refresh UI
        updateUIForSubscriptionStatus();
      } else {
        showErrorMessage('Purchase verification failed. Please contact support.');
      }
    } catch (error) {
      console.error('Error processing purchase:', error);
      showErrorMessage('Error activating subscription. Please contact support.');
    }
  });
  
  // Purchase cancelled
  BillingBridge.addListener('purchaseCancelled', () => {
    log('Purchase cancelled by user');
    showInfoMessage('Subscription cancelled');
  });
  
  // Purchase error
  BillingBridge.addListener('purchaseError', (data) => {
    console.error('Purchase error:', data.error);
    showErrorMessage('Purchase failed: ' + data.error);
  });
}

// ============================================
// Check Subscription Status
// ============================================
async function checkSubscriptionStatus() {
  if (!billingState.initialized) return false;
  
  try {
    log('Checking subscription status...');
    const result = await BillingBridge.queryPurchases();
    
    if (result.purchases && result.purchases.length > 0) {
      const purchase = result.purchases[0];
      
      billingState.hasSubscription = true;
      billingState.isInTrial = purchase.isInFreeTrial;
      billingState.currentPurchase = purchase;
      
      log('Subscription found:', {
        isInTrial: purchase.isInFreeTrial,
        isAutoRenewing: purchase.isAutoRenewing,
        products: purchase.products
      });
      
      // Verify with backend (important!)
      const verified = await verifyPurchaseOnBackend(purchase.purchaseToken);
      
      if (verified) {
        enablePremiumFeatures();
        updateUIForSubscriptionStatus();
        return true;
      }
    } else {
      log('No active subscription found');
      billingState.hasSubscription = false;
      billingState.isInTrial = false;
    }
    
    return billingState.hasSubscription;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

// ============================================
// Load Products
// ============================================
async function loadProducts() {
  if (!billingState.initialized) return;
  
  try {
    log('Loading products...');
    const result = await BillingBridge.queryProducts({
      productIds: Object.values(BILLING_CONFIG.PRODUCT_IDS)
    });
    
    billingState.products = result.products;
    log('Products loaded:', billingState.products.length);
    
    // Display products to user
    displayProductsUI(result.products);
    
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

// ============================================
// Display Products UI
// ============================================
function displayProductsUI(products) {
  // Example: Create subscription cards
  products.forEach(product => {
    log('Product:', product.name);
    
    // Find offer with free trial
    const trialOffer = product.subscriptionOffers?.find(offer => {
      return offer.pricingPhases?.some(phase => 
        phase.priceAmountMicros === 0
      );
    });
    
    if (trialOffer) {
      const phases = trialOffer.pricingPhases;
      const trialPhase = phases[0];
      const paidPhase = phases[1];
      
      // Example UI (modify to match your design)
      console.log(`
        Product: ${product.name}
        Trial: ${trialPhase.billingPeriod} (${trialPhase.formattedPrice})
        Then: ${paidPhase.formattedPrice}/${paidPhase.billingPeriod}
      `);
      
      // Store offer token for purchase
      createSubscriptionButton(
        product.productId,
        product.name,
        trialOffer.offerToken,
        trialPhase,
        paidPhase
      );
    }
  });
}

// ============================================
// Create Subscription Button
// ============================================
function createSubscriptionButton(productId, productName, offerToken, trialPhase, paidPhase) {
  // Example button creation (modify for your framework/design)
  
  /* Example HTML structure:
  const button = document.createElement('button');
  button.className = 'subscription-button';
  button.innerHTML = `
    <div class="subscription-card">
      <h3>${productName}</h3>
      <p class="trial">Free for ${getBillingPeriodText(trialPhase.billingPeriod)}</p>
      <p class="price">Then ${paidPhase.formattedPrice}</p>
      <button onclick="startSubscription('${productId}', '${offerToken}')">
        Start Free Trial
      </button>
    </div>
  `;
  document.getElementById('subscription-container').appendChild(button);
  */
  
  // For now, just log the data
  log('Subscription option:', { productId, productName, offerToken });
}

// ============================================
// Start Subscription
// ============================================
async function startSubscription(productId, offerToken) {
  if (!billingState.initialized) {
    showErrorMessage('Billing not initialized');
    return;
  }
  
  try {
    log('Starting subscription:', productId);
    
    await BillingBridge.purchase({
      productId: productId,
      offerToken: offerToken  // Required for free trial
    });
    
    // Purchase result will be delivered via event listeners
    log('Billing flow launched');
    
  } catch (error) {
    console.error('Error starting subscription:', error);
    showErrorMessage('Failed to start subscription: ' + error);
  }
}

// ============================================
// Backend Verification
// ============================================
async function verifyPurchaseOnBackend(purchaseToken) {
  try {
    log('Verifying purchase with backend...');
    
    const response = await fetch(`${BILLING_CONFIG.BACKEND_API}/verify-purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getUserAuthToken()}`
      },
      body: JSON.stringify({
        purchaseToken: purchaseToken,
        packageName: 'com.happyplantsclub.android'
      })
    });
    
    const result = await response.json();
    log('Backend verification result:', result);
    
    return result.verified === true;
  } catch (error) {
    console.error('Backend verification error:', error);
    return false;
  }
}

// ============================================
// Feature Management
// ============================================
function enablePremiumFeatures() {
  log('Enabling premium features');
  
  // Example: Enable features based on subscription
  // Modify these to match your app's features
  
  // Remove ads
  if (typeof removeAds === 'function') {
    removeAds();
  }
  
  // Unlock premium content
  if (typeof unlockPremiumContent === 'function') {
    unlockPremiumContent();
  }
  
  // Update UI
  document.body.classList.add('premium-user');
  
  // Store subscription status (optional)
  localStorage.setItem('has_subscription', 'true');
}

function disablePremiumFeatures() {
  log('Disabling premium features');
  
  // Reverse of enablePremiumFeatures
  document.body.classList.remove('premium-user');
  localStorage.removeItem('has_subscription');
}

// ============================================
// UI Updates
// ============================================
function updateUIForSubscriptionStatus() {
  if (billingState.hasSubscription) {
    if (billingState.isInTrial) {
      showTrialBadge();
    } else {
      showPremiumBadge();
    }
    hideSubscriptionOffers();
  } else {
    showSubscriptionOffers();
  }
}

function showTrialBadge() {
  log('Showing trial badge');
  // Example: Add badge to UI
  // const badge = document.getElementById('subscription-badge');
  // badge.textContent = 'Free Trial Active';
  // badge.className = 'badge trial';
}

function showPremiumBadge() {
  log('Showing premium badge');
  // Example: Add badge to UI
  // const badge = document.getElementById('subscription-badge');
  // badge.textContent = 'Premium Member';
  // badge.className = 'badge premium';
}

function showSubscriptionOffers() {
  log('Showing subscription offers');
  // Example: Show subscription page
  // document.getElementById('subscription-offers').style.display = 'block';
}

function hideSubscriptionOffers() {
  log('Hiding subscription offers');
  // Example: Hide subscription page
  // document.getElementById('subscription-offers').style.display = 'none';
}

// ============================================
// User Messages
// ============================================
function showSuccessMessage(message) {
  console.log('✅ Success:', message);
  // Implement your notification system
  // alert(message);
}

function showErrorMessage(message) {
  console.error('❌ Error:', message);
  // Implement your notification system
  // alert(message);
}

function showInfoMessage(message) {
  console.log('ℹ️ Info:', message);
  // Implement your notification system
}

// ============================================
// Utilities
// ============================================
function getBillingPeriodText(period) {
  // Convert ISO 8601 duration to human-readable text
  // P7D = 7 days, P1M = 1 month, P1Y = 1 year
  const map = {
    'P7D': '7 days',
    'P1W': '1 week',
    'P2W': '2 weeks',
    'P1M': '1 month',
    'P3M': '3 months',
    'P6M': '6 months',
    'P1Y': '1 year'
  };
  return map[period] || period;
}

function getUserAuthToken() {
  // Get user authentication token from your auth system
  return localStorage.getItem('auth_token') || '';
}

function log(...args) {
  if (BILLING_CONFIG.LOG_DEBUG) {
    console.log('[Billing]', ...args);
  }
}

// ============================================
// Export Functions (if using modules)
// ============================================
// export {
//   initBillingSystem,
//   checkSubscriptionStatus,
//   startSubscription,
//   billingState
// };

// ============================================
// Auto-initialize (if not using modules)
// ============================================
// Call this when your app loads
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBillingSystem);
  } else {
    initBillingSystem();
  }
}
