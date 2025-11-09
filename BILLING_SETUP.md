# Google Play Billing Setup Guide

This guide explains how to implement Google Play In-App Subscriptions with free trials in the Happy Plants Club app.

## Table of Contents
1. [Google Play Console Setup](#google-play-console-setup)
2. [BillingBridge Plugin API](#billingbridge-plugin-api)
3. [Web App Integration](#web-app-integration)
4. [Testing](#testing)
5. [Backend Verification](#backend-verification)

---

## Google Play Console Setup

### 1. Create Your App in Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to your app (or create a new one)
3. Complete the app setup (app details, content rating, etc.)

### 2. Set Up a Subscription Product

1. In Play Console, go to **Monetization** > **Products** > **Subscriptions**
2. Click **Create subscription**
3. Fill in the required fields:
   - **Product ID**: e.g., `premium_monthly` or `premium_yearly`
   - **Name**: Display name for the subscription
   - **Description**: What users get with the subscription

### 3. Configure Free Trial

1. In your subscription configuration, find **Base plans and offers**
2. Create a new **Base plan**:
   - Set the billing period (e.g., 1 month, 1 year)
   - Set the price
3. Add an **Offer** for free trial:
   - Click **Add offer**
   - Select **Free trial**
   - Set the trial duration (e.g., 7 days, 30 days)
   - Set eligibility rules (e.g., new subscribers only)

### 4. Activate the Subscription

1. Review your subscription settings
2. Click **Activate** to make it available

---

## BillingBridge Plugin API

The `BillingBridge` Capacitor plugin exposes Google Play Billing functionality to your web app.

### Available Methods

#### 1. Initialize Billing Client

```javascript
await BillingBridge.initialize();
```

**Description**: Initializes the connection to Google Play Billing. Call this when your app starts or when the user logs in.

**Returns**: 
```javascript
{
  success: true,
  message: "Billing client ready"
}
```

**Error**: Throws if billing setup fails.

---

#### 2. Query Available Products

```javascript
const result = await BillingBridge.queryProducts({
  productIds: ['premium_monthly', 'premium_yearly']
});
```

**Parameters**:
- `productIds` (string[]): Array of subscription product IDs from Play Console

**Returns**: 
```javascript
{
  products: [
    {
      productId: "premium_monthly",
      name: "Premium Monthly",
      title: "Premium Monthly (Happy Plants Club)",
      description: "Access to all premium features",
      subscriptionOffers: [
        {
          offerId: "free-trial-offer",
          offerToken: "abc123...",
          basePlanId: "monthly-base",
          pricingPhases: [
            {
              formattedPrice: "$0.00",
              priceAmountMicros: 0,
              priceCurrencyCode: "USD",
              billingPeriod: "P7D",  // 7-day trial
              billingCycleCount: 1,
              recurrenceMode: 2
            },
            {
              formattedPrice: "$9.99",
              priceAmountMicros: 9990000,
              priceCurrencyCode: "USD",
              billingPeriod: "P1M",  // Monthly after trial
              billingCycleCount: 0,  // Recurring
              recurrenceMode: 1
            }
          ]
        }
      ]
    }
  ]
}
```

---

#### 3. Check User's Purchase Status

```javascript
const result = await BillingBridge.queryPurchases();
```

**Description**: Retrieves the user's current active purchases and subscriptions.

**Returns**: 
```javascript
{
  purchases: [
    {
      orderId: "GPA.1234-5678-9012-34567",
      packageName: "com.happyplantsclub.android",
      purchaseToken: "abc123def456...",
      purchaseTime: 1234567890000,
      purchaseState: 1,  // 1 = PURCHASED, 0 = UNSPECIFIED_STATE, 2 = PENDING
      isAcknowledged: true,
      isAutoRenewing: true,
      products: ["premium_monthly"],
      isInFreeTrial: true  // Indicates if currently in trial
    }
  ]
}
```

**Note**: `isInFreeTrial` is a basic indicator. For accurate trial status verification, validate the purchase token on your backend using the Google Play Developer API.

---

#### 4. Launch Purchase Flow

```javascript
await BillingBridge.purchase({
  productId: 'premium_monthly',
  offerToken: 'abc123...'  // Optional: for specific offer with trial
});
```

**Parameters**:
- `productId` (string): The product ID to purchase
- `offerToken` (string, optional): The offer token for a specific subscription offer (e.g., with free trial)

**Returns**: 
```javascript
{
  success: true,
  message: "Billing flow launched"
}
```

**Note**: The actual purchase result will be delivered via event listeners (see below).

---

#### 5. Check if Billing is Ready

```javascript
const result = await BillingBridge.isReady();
console.log(result.ready);  // true or false
```

---

### Event Listeners

Listen for purchase updates:

```javascript
// Purchase completed successfully
BillingBridge.addListener('purchaseUpdated', (data) => {
  console.log('Purchase updated:', data);
  // {
  //   orderId: "...",
  //   purchaseToken: "...",
  //   purchaseState: 1,
  //   products: ["premium_monthly"]
  // }
  
  // Grant access to premium features
  enablePremiumFeatures();
});

// Purchase cancelled by user
BillingBridge.addListener('purchaseCancelled', (data) => {
  console.log('Purchase cancelled');
});

// Purchase error
BillingBridge.addListener('purchaseError', (data) => {
  console.error('Purchase error:', data.error);
});
```

---

## Web App Integration

### Complete Example

```javascript
// Initialize billing when app starts
async function initializeBilling() {
  try {
    await BillingBridge.initialize();
    console.log('Billing initialized');
    
    // Check if user already has a subscription
    await checkSubscriptionStatus();
  } catch (error) {
    console.error('Failed to initialize billing:', error);
  }
}

// Query subscription status
async function checkSubscriptionStatus() {
  try {
    const result = await BillingBridge.queryPurchases();
    
    if (result.purchases && result.purchases.length > 0) {
      const purchase = result.purchases[0];
      
      if (purchase.isInFreeTrial) {
        console.log('User is in free trial');
        showTrialUI();
      } else if (purchase.isAutoRenewing) {
        console.log('User has active subscription');
        enablePremiumFeatures();
      }
    } else {
      console.log('No active subscription');
      showSubscriptionOffer();
    }
  } catch (error) {
    console.error('Failed to check subscription status:', error);
  }
}

// Show available subscription options
async function showSubscriptionOptions() {
  try {
    const result = await BillingBridge.queryProducts({
      productIds: ['premium_monthly', 'premium_yearly']
    });
    
    // Display products to user
    result.products.forEach(product => {
      console.log(`${product.name}: ${product.description}`);
      
      // Find offer with free trial
      const trialOffer = product.subscriptionOffers.find(offer => {
        return offer.pricingPhases.some(phase => 
          phase.priceAmountMicros === 0
        );
      });
      
      if (trialOffer) {
        const trialPhase = trialOffer.pricingPhases[0];
        const paidPhase = trialOffer.pricingPhases[1];
        
        console.log(`Free trial: ${trialPhase.billingPeriod}`);
        console.log(`Then: ${paidPhase.formattedPrice}/${paidPhase.billingPeriod}`);
        
        // Store offer token for purchase
        displaySubscriptionButton(product.productId, trialOffer.offerToken);
      }
    });
  } catch (error) {
    console.error('Failed to load products:', error);
  }
}

// Start subscription purchase
async function startSubscription(productId, offerToken) {
  try {
    // Set up event listeners first
    BillingBridge.addListener('purchaseUpdated', async (data) => {
      console.log('Purchase successful!');
      
      // Verify purchase on your backend
      await verifyPurchaseOnBackend(data.purchaseToken);
      
      // Grant access
      enablePremiumFeatures();
    });
    
    BillingBridge.addListener('purchaseCancelled', () => {
      console.log('User cancelled');
    });
    
    // Launch billing flow
    await BillingBridge.purchase({
      productId: productId,
      offerToken: offerToken  // Include for free trial offer
    });
  } catch (error) {
    console.error('Purchase failed:', error);
  }
}

// Call on app start
initializeBilling();
```

---

## Testing

### 1. Test with License Testers

1. In Play Console, go to **Setup** > **License testing**
2. Add test Gmail accounts
3. Build and install your app on a test device signed in with a test account
4. Test the subscription flow

### 2. Test Purchases

- Test accounts can make purchases without being charged
- Test the free trial flow
- Test subscription renewal
- Test subscription cancellation

### 3. Test States

Test these scenarios:
- New user starts free trial
- Trial expires and converts to paid subscription
- User cancels during trial
- User cancels paid subscription
- User resubscribes after cancellation

---

## Backend Verification

**IMPORTANT**: Always verify purchases on your backend server for security.

### Why Backend Verification?

- Prevents fraud
- Ensures accurate subscription status
- Enables server-side features based on subscription

### Google Play Developer API

Use the [Google Play Developer API](https://developers.google.com/android-publisher) to verify purchases:

```javascript
// Backend example (Node.js)
const { google } = require('googleapis');

async function verifySubscription(packageName, subscriptionId, purchaseToken) {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'path/to/service-account-key.json',
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  
  const androidpublisher = google.androidpublisher({ version: 'v3', auth });
  
  const result = await androidpublisher.purchases.subscriptions.get({
    packageName: packageName,
    subscriptionId: subscriptionId,
    token: purchaseToken,
  });
  
  // Check subscription status
  const isActive = result.data.paymentState === 1;  // Payment received
  const expiryTimeMillis = result.data.expiryTimeMillis;
  const autoRenewing = result.data.autoRenewing;
  
  // Check if in trial
  const inTrial = result.data.paymentState === 0 && 
                  result.data.priceAmountMicros === '0';
  
  return {
    isActive,
    expiryTimeMillis,
    autoRenewing,
    inTrial
  };
}
```

### Backend Integration Flow

1. **App** → Calls `BillingBridge.queryPurchases()` and gets `purchaseToken`
2. **App** → Sends `purchaseToken` to your backend API
3. **Backend** → Verifies token with Google Play Developer API
4. **Backend** → Returns verified subscription status to app
5. **App** → Grants/denies access based on verified status

---

## Billing Period Format

The `billingPeriod` field uses ISO 8601 duration format:

- `P7D` = 7 days
- `P1M` = 1 month
- `P3M` = 3 months
- `P1Y` = 1 year
- `P1W` = 1 week

---

## Security Best Practices

1. **Never store subscription status locally without server verification**
2. **Verify all purchase tokens on your backend**
3. **Use ProGuard/R8 obfuscation** (already configured in this project)
4. **Don't hardcode product IDs in code** - load from backend configuration
5. **Implement proper error handling** for billing failures
6. **Monitor subscription events** with Real-time Developer Notifications (RTDN)

---

## Troubleshooting

### "Billing client not ready"
- Call `initialize()` before other methods
- Check that Google Play Services is installed on the device
- Ensure the app is properly configured in Play Console

### "Product not found"
- Verify product ID matches exactly in Play Console
- Ensure the subscription is activated
- Check that you're signed in with a test account (for testing)

### "Item already owned"
- User already has an active subscription
- Call `queryPurchases()` to check existing subscriptions

### Free trial not showing
- Ensure the offer is properly configured in Play Console
- Check eligibility rules (user must be eligible for the trial)
- Verify the `offerToken` is being passed correctly

---

## Additional Resources

- [Google Play Billing Library Documentation](https://developer.android.com/google/play/billing)
- [Subscriptions Documentation](https://developer.android.com/google/play/billing/subscriptions)
- [Google Play Developer API](https://developers.google.com/android-publisher)
- [Real-time Developer Notifications](https://developer.android.com/google/play/billing/rtdn-reference)
- [Test Purchases](https://developer.android.com/google/play/billing/test)

---

## License

ISC
