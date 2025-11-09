package com.happyplantsclub.android;

import android.util.Log;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.BillingClient;

import java.util.ArrayList;
import java.util.List;

/**
 * BillingBridge - Capacitor plugin to expose Google Play Billing to web app
 * 
 * This plugin enables the web application to:
 * - Query available subscriptions with free trial offers
 * - Check user's purchase/subscription status
 * - Launch billing flow for subscriptions
 * - Determine if user is in free trial period
 */
@CapacitorPlugin(name = "BillingBridge")
public class BillingBridge extends Plugin implements BillingManager.PurchaseUpdateListener {
    
    private static final String TAG = "BillingBridge";
    private BillingManager billingManager;
    
    @Override
    public void load() {
        Log.d(TAG, "Loading BillingBridge plugin");
        billingManager = new BillingManager(getActivity());
        billingManager.addPurchaseUpdateListener(this);
    }
    
    /**
     * Initialize billing connection
     */
    @PluginMethod
    public void initialize(PluginCall call) {
        Log.d(TAG, "Initializing billing client");
        
        billingManager.connect(new BillingManager.BillingReadyListener() {
            @Override
            public void onBillingReady() {
                Log.d(TAG, "Billing ready");
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("message", "Billing client ready");
                call.resolve(result);
            }
            
            @Override
            public void onBillingSetupFailed(String errorMessage) {
                Log.e(TAG, "Billing setup failed: " + errorMessage);
                call.reject("Billing setup failed: " + errorMessage);
            }
        });
    }
    
    /**
     * Query available subscription products
     * @param call PluginCall with productIds array parameter
     */
    @PluginMethod
    public void queryProducts(PluginCall call) {
        JSArray productIdsArray = call.getArray("productIds");
        if (productIdsArray == null || productIdsArray.length() == 0) {
            call.reject("productIds parameter is required and must not be empty");
            return;
        }
        
        List<String> productIds = new ArrayList<>();
        try {
            for (int i = 0; i < productIdsArray.length(); i++) {
                productIds.add(productIdsArray.getString(i));
            }
        } catch (Exception e) {
            call.reject("Invalid productIds format: " + e.getMessage());
            return;
        }
        
        Log.d(TAG, "Querying products: " + productIds);
        
        billingManager.querySubscriptionProducts(productIds, new BillingManager.ProductDetailsListener() {
            @Override
            public void onProductDetailsReceived(List<ProductDetails> productDetailsList) {
                Log.d(TAG, "Received " + productDetailsList.size() + " product details");
                
                JSArray productsArray = new JSArray();
                for (ProductDetails details : productDetailsList) {
                    JSObject product = new JSObject();
                    product.put("productId", details.getProductId());
                    product.put("name", details.getName());
                    product.put("title", details.getTitle());
                    product.put("description", details.getDescription());
                    
                    // Get subscription offers (including free trial info)
                    if (details.getSubscriptionOfferDetails() != null) {
                        JSArray offersArray = new JSArray();
                        for (ProductDetails.SubscriptionOfferDetails offer : details.getSubscriptionOfferDetails()) {
                            JSObject offerObj = new JSObject();
                            offerObj.put("offerId", offer.getOfferId());
                            offerObj.put("offerToken", offer.getOfferToken());
                            offerObj.put("basePlanId", offer.getBasePlanId());
                            
                            // Get pricing phases (includes trial phase if available)
                            JSArray pricingPhasesArray = new JSArray();
                            if (offer.getPricingPhases() != null) {
                                for (ProductDetails.PricingPhase phase : offer.getPricingPhases().getPricingPhaseList()) {
                                    JSObject phaseObj = new JSObject();
                                    phaseObj.put("formattedPrice", phase.getFormattedPrice());
                                    phaseObj.put("priceAmountMicros", phase.getPriceAmountMicros());
                                    phaseObj.put("priceCurrencyCode", phase.getPriceCurrencyCode());
                                    phaseObj.put("billingPeriod", phase.getBillingPeriod());
                                    phaseObj.put("billingCycleCount", phase.getBillingCycleCount());
                                    phaseObj.put("recurrenceMode", phase.getRecurrenceMode());
                                    pricingPhasesArray.put(phaseObj);
                                }
                            }
                            offerObj.put("pricingPhases", pricingPhasesArray);
                            offersArray.put(offerObj);
                        }
                        product.put("subscriptionOffers", offersArray);
                    }
                    
                    productsArray.put(product);
                }
                
                JSObject result = new JSObject();
                result.put("products", productsArray);
                call.resolve(result);
            }
            
            @Override
            public void onProductDetailsError(String errorMessage) {
                Log.e(TAG, "Product details error: " + errorMessage);
                call.reject("Failed to query products: " + errorMessage);
            }
        });
    }
    
    /**
     * Query user's current purchases/subscriptions
     */
    @PluginMethod
    public void queryPurchases(PluginCall call) {
        Log.d(TAG, "Querying purchases");
        
        billingManager.queryPurchases(new BillingManager.PurchaseStatusListener() {
            @Override
            public void onPurchaseStatusReceived(List<Purchase> purchases) {
                Log.d(TAG, "Received " + purchases.size() + " purchases");
                
                JSArray purchasesArray = new JSArray();
                for (Purchase purchase : purchases) {
                    JSObject purchaseObj = new JSObject();
                    purchaseObj.put("orderId", purchase.getOrderId());
                    purchaseObj.put("packageName", purchase.getPackageName());
                    purchaseObj.put("purchaseToken", purchase.getPurchaseToken());
                    purchaseObj.put("purchaseTime", purchase.getPurchaseTime());
                    purchaseObj.put("purchaseState", purchase.getPurchaseState());
                    purchaseObj.put("isAcknowledged", purchase.isAcknowledged());
                    purchaseObj.put("isAutoRenewing", purchase.isAutoRenewing());
                    
                    // Convert products list to JSON array
                    JSArray productsArray = new JSArray();
                    for (String product : purchase.getProducts()) {
                        productsArray.put(product);
                    }
                    purchaseObj.put("products", productsArray);
                    
                    // Check if in free trial (backend validation recommended)
                    boolean isInTrial = billingManager.isInFreeTrial(purchase);
                    purchaseObj.put("isInFreeTrial", isInTrial);
                    
                    purchasesArray.put(purchaseObj);
                }
                
                JSObject result = new JSObject();
                result.put("purchases", purchasesArray);
                call.resolve(result);
            }
            
            @Override
            public void onPurchaseStatusError(String errorMessage) {
                Log.e(TAG, "Purchase status error: " + errorMessage);
                call.reject("Failed to query purchases: " + errorMessage);
            }
        });
    }
    
    /**
     * Launch billing flow for a subscription
     * @param call PluginCall with productId and optional offerToken
     */
    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId");
        String offerToken = call.getString("offerToken");
        
        if (productId == null || productId.isEmpty()) {
            call.reject("productId parameter is required");
            return;
        }
        
        Log.d(TAG, "Launching purchase flow for: " + productId);
        
        // First query the product details to get the ProductDetails object
        List<String> productIds = new ArrayList<>();
        productIds.add(productId);
        
        billingManager.querySubscriptionProducts(productIds, new BillingManager.ProductDetailsListener() {
            @Override
            public void onProductDetailsReceived(List<ProductDetails> productDetailsList) {
                if (productDetailsList.isEmpty()) {
                    call.reject("Product not found: " + productId);
                    return;
                }
                
                ProductDetails productDetails = productDetailsList.get(0);
                BillingResult result = billingManager.launchBillingFlow(productDetails, offerToken);
                
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    Log.d(TAG, "Billing flow launched successfully");
                    JSObject jsResult = new JSObject();
                    jsResult.put("success", true);
                    jsResult.put("message", "Billing flow launched");
                    call.resolve(jsResult);
                } else {
                    Log.e(TAG, "Failed to launch billing flow: " + result.getDebugMessage());
                    call.reject("Failed to launch billing flow: " + result.getDebugMessage());
                }
            }
            
            @Override
            public void onProductDetailsError(String errorMessage) {
                Log.e(TAG, "Failed to get product details: " + errorMessage);
                call.reject("Failed to get product details: " + errorMessage);
            }
        });
    }
    
    /**
     * Check billing client status
     */
    @PluginMethod
    public void isReady(PluginCall call) {
        boolean ready = billingManager.isReady();
        JSObject result = new JSObject();
        result.put("ready", ready);
        call.resolve(result);
    }
    
    // PurchaseUpdateListener implementation
    @Override
    public void onPurchaseUpdated(Purchase purchase) {
        Log.d(TAG, "Purchase updated, notifying web app");
        JSObject data = new JSObject();
        data.put("orderId", purchase.getOrderId());
        data.put("purchaseToken", purchase.getPurchaseToken());
        data.put("purchaseState", purchase.getPurchaseState());
        
        JSArray productsArray = new JSArray();
        for (String product : purchase.getProducts()) {
            productsArray.put(product);
        }
        data.put("products", productsArray);
        
        notifyListeners("purchaseUpdated", data);
    }
    
    @Override
    public void onPurchaseCancelled() {
        Log.d(TAG, "Purchase cancelled, notifying web app");
        JSObject data = new JSObject();
        data.put("cancelled", true);
        notifyListeners("purchaseCancelled", data);
    }
    
    @Override
    public void onPurchaseError(String errorMessage) {
        Log.e(TAG, "Purchase error: " + errorMessage);
        JSObject data = new JSObject();
        data.put("error", errorMessage);
        notifyListeners("purchaseError", data);
    }
    
    @Override
    protected void handleOnDestroy() {
        Log.d(TAG, "Cleaning up BillingBridge");
        if (billingManager != null) {
            billingManager.removePurchaseUpdateListener(this);
            billingManager.disconnect();
        }
        super.handleOnDestroy();
    }
}
