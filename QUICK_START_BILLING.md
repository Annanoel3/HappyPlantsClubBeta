# Quick Start: Google Play Billing

A quick reference guide for implementing Google Play Billing with free trials in Happy Plants Club.

## 🚀 Prerequisites

1. App published (or in testing) in Google Play Console
2. Subscription product created in Play Console with free trial offer
3. Test account added to license testers

## 📱 Web App Integration (5 Steps)

### Step 1: Initialize Billing

```javascript
// Call on app start or user login
async function initBilling() {
  try {
    await BillingBridge.initialize();
    console.log('Billing ready!');
  } catch (error) {
    console.error('Billing init failed:', error);
  }
}
```

### Step 2: Check Subscription Status

```javascript
async function checkSubscription() {
  const result = await BillingBridge.queryPurchases();
  
  if (result.purchases && result.purchases.length > 0) {
    const purchase = result.purchases[0];
    
    if (purchase.isInFreeTrial) {
      console.log('User in free trial ✅');
    } else if (purchase.isAutoRenewing) {
      console.log('User has paid subscription ✅');
    }
    
    return true; // Has subscription
  }
  
  return false; // No subscription
}
```

### Step 3: Show Subscription Options

```javascript
async function loadSubscriptionPlans() {
  const result = await BillingBridge.queryProducts({
    productIds: ['premium_monthly', 'premium_yearly']
  });
  
  result.products.forEach(product => {
    // Find the free trial offer
    const trialOffer = product.subscriptionOffers.find(offer => {
      return offer.pricingPhases.some(phase => 
        phase.priceAmountMicros === 0
      );
    });
    
    if (trialOffer) {
      console.log(`${product.name}:`);
      console.log(`  Trial: ${trialOffer.pricingPhases[0].formattedPrice}`);
      console.log(`  After: ${trialOffer.pricingPhases[1].formattedPrice}`);
      
      // Show to user with button
      showSubscriptionButton(product, trialOffer.offerToken);
    }
  });
}
```

### Step 4: Start Subscription

```javascript
async function subscribe(productId, offerToken) {
  // Listen for purchase result
  BillingBridge.addListener('purchaseUpdated', async (data) => {
    console.log('Purchase successful! 🎉');
    
    // IMPORTANT: Verify on backend
    await verifyOnBackend(data.purchaseToken);
    
    // Enable features
    enablePremiumFeatures();
  });
  
  BillingBridge.addListener('purchaseCancelled', () => {
    console.log('User cancelled');
  });
  
  // Launch billing
  await BillingBridge.purchase({
    productId: productId,
    offerToken: offerToken  // Include for free trial
  });
}
```

### Step 5: Verify on Backend (Required!)

```javascript
// Frontend sends to backend
async function verifyOnBackend(purchaseToken) {
  const response = await fetch('https://api.yourbackend.com/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ purchaseToken })
  });
  
  const result = await response.json();
  return result.verified;
}
```

```javascript
// Backend verifies with Google
const { google } = require('googleapis');

async function verifyPurchase(purchaseToken) {
  const androidpublisher = google.androidpublisher({
    version: 'v3',
    auth: serviceAccountAuth
  });
  
  const result = await androidpublisher.purchases.subscriptions.get({
    packageName: 'com.happyplantsclub.android',
    subscriptionId: 'premium_monthly',
    token: purchaseToken
  });
  
  // Check validity
  return result.data.paymentState === 1;
}
```

## 🧪 Testing

1. Add your Gmail account to **License testing** in Play Console
2. Install the app on a device with that account
3. Test subscriptions are free (no charge)
4. Test the free trial flow

## 📋 Play Console Setup Checklist

- [ ] Created subscription product (e.g., `premium_monthly`)
- [ ] Added base plan with price
- [ ] Created free trial offer (e.g., 7 days)
- [ ] Activated the subscription
- [ ] Added test account to license testers
- [ ] Set up Google Play Developer API for backend verification

## 🔐 Security Checklist

- [ ] ProGuard/R8 enabled (`minifyEnabled true` in build.gradle) ✅ Already done!
- [ ] Backend verification implemented for purchases
- [ ] No API keys hardcoded in app
- [ ] Using HTTPS for all backend calls

## 📚 Full Documentation

- **Complete guide**: [BILLING_SETUP.md](BILLING_SETUP.md)
- **Security guide**: [SECURITY.md](SECURITY.md)
- **App setup**: [README.md](README.md)

## ⚠️ Important Notes

1. **Always verify purchases on your backend** - Never trust client-side status
2. **Free trial status** - The `isInFreeTrial` flag is basic; verify with Google Play Developer API
3. **ProGuard is enabled** - Release builds are obfuscated for security
4. **Test before release** - Use license testers to test the flow

## 🆘 Common Issues

**"Billing client not ready"**
- Call `initialize()` first
- Check Google Play Services is installed

**"Product not found"**
- Verify product ID matches Play Console
- Ensure subscription is activated
- Check you're using a test account

**"Item already owned"**
- User already subscribed
- Call `queryPurchases()` to check status

## 🎯 Typical Flow

```
App Start
  ↓
Initialize Billing
  ↓
Check Subscription Status ────→ Has Subscription → Enable Features
  ↓                                     ↓
No Subscription                  Verify on Backend
  ↓
Show Subscription Offers
  ↓
User Taps Subscribe
  ↓
Launch Billing Flow
  ↓
Purchase Updated Event
  ↓
Verify on Backend
  ↓
Enable Features ✅
```

---

Need help? Check [BILLING_SETUP.md](BILLING_SETUP.md) for detailed explanations!
