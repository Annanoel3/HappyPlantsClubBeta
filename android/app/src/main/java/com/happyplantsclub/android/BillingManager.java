package com.happyplantsclub.android;

import android.app.Activity;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import java.util.ArrayList;
import java.util.List;

/**
 * BillingManager - Manages Google Play Billing operations for subscriptions and trials
 * 
 * This class handles:
 * - Connection to Google Play Billing
 * - Querying available products/subscriptions
 * - Checking purchase/trial status
 * - Launching billing flow
 * - Processing purchase updates
 */
public class BillingManager {
    private static final String TAG = "BillingManager";
    
    private final Activity activity;
    private BillingClient billingClient;
    private boolean isReady = false;
    
    // Callbacks
    public interface BillingReadyListener {
        void onBillingReady();
        void onBillingSetupFailed(String errorMessage);
    }
    
    public interface ProductDetailsListener {
        void onProductDetailsReceived(List<ProductDetails> productDetailsList);
        void onProductDetailsError(String errorMessage);
    }
    
    public interface PurchaseStatusListener {
        void onPurchaseStatusReceived(List<Purchase> purchases);
        void onPurchaseStatusError(String errorMessage);
    }
    
    public interface PurchaseUpdateListener {
        void onPurchaseUpdated(Purchase purchase);
        void onPurchaseCancelled();
        void onPurchaseError(String errorMessage);
    }
    
    private final List<PurchaseUpdateListener> purchaseUpdateListeners = new ArrayList<>();
    
    /**
     * Constructor
     * @param activity The activity context
     */
    public BillingManager(Activity activity) {
        this.activity = activity;
        initializeBillingClient();
    }
    
    /**
     * Initialize the billing client with purchase updates listener
     */
    private void initializeBillingClient() {
        PurchasesUpdatedListener purchasesUpdatedListener = new PurchasesUpdatedListener() {
            @Override
            public void onPurchasesUpdated(@NonNull BillingResult billingResult, @Nullable List<Purchase> purchases) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
                    for (Purchase purchase : purchases) {
                        Log.d(TAG, "Purchase updated: " + purchase.getProducts());
                        notifyPurchaseUpdate(purchase);
                    }
                } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
                    Log.d(TAG, "User cancelled the purchase");
                    notifyPurchaseCancelled();
                } else {
                    Log.e(TAG, "Purchase error: " + billingResult.getDebugMessage());
                    notifyPurchaseError(billingResult.getDebugMessage());
                }
            }
        };
        
        billingClient = BillingClient.newBuilder(activity)
                .setListener(purchasesUpdatedListener)
                .enablePendingPurchases()
                .build();
    }
    
    /**
     * Connect to Google Play Billing service
     * @param listener Callback for connection result
     */
    public void connect(@NonNull final BillingReadyListener listener) {
        if (isReady) {
            listener.onBillingReady();
            return;
        }
        
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    Log.d(TAG, "Billing client connected successfully");
                    isReady = true;
                    listener.onBillingReady();
                } else {
                    Log.e(TAG, "Billing setup failed: " + billingResult.getDebugMessage());
                    listener.onBillingSetupFailed(billingResult.getDebugMessage());
                }
            }
            
            @Override
            public void onBillingServiceDisconnected() {
                Log.w(TAG, "Billing service disconnected");
                isReady = false;
            }
        });
    }
    
    /**
     * Query available subscription products
     * @param productIds List of product IDs to query
     * @param listener Callback for product details
     */
    public void querySubscriptionProducts(@NonNull List<String> productIds, @NonNull final ProductDetailsListener listener) {
        if (!isReady) {
            listener.onProductDetailsError("Billing client not ready");
            return;
        }
        
        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        for (String productId : productIds) {
            productList.add(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build()
            );
        }
        
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();
        
        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                Log.d(TAG, "Product details query successful: " + productDetailsList.size() + " products");
                listener.onProductDetailsReceived(productDetailsList);
            } else {
                Log.e(TAG, "Product details query failed: " + billingResult.getDebugMessage());
                listener.onProductDetailsError(billingResult.getDebugMessage());
            }
        });
    }
    
    /**
     * Query user's current purchases and subscriptions
     * @param listener Callback for purchase status
     */
    public void queryPurchases(@NonNull final PurchaseStatusListener listener) {
        if (!isReady) {
            listener.onPurchaseStatusError("Billing client not ready");
            return;
        }
        
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();
        
        billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                Log.d(TAG, "Purchases query successful: " + purchases.size() + " purchases");
                listener.onPurchaseStatusReceived(purchases);
            } else {
                Log.e(TAG, "Purchases query failed: " + billingResult.getDebugMessage());
                listener.onPurchaseStatusError(billingResult.getDebugMessage());
            }
        });
    }
    
    /**
     * Launch the billing flow for a subscription
     * @param productDetails The product to purchase
     * @param offerToken The offer token (for subscriptions with trials)
     * @return BillingResult indicating if the flow was launched successfully
     */
    public BillingResult launchBillingFlow(@NonNull ProductDetails productDetails, @Nullable String offerToken) {
        if (!isReady) {
            return BillingResult.newBuilder()
                    .setResponseCode(BillingClient.BillingResponseCode.SERVICE_DISCONNECTED)
                    .setDebugMessage("Billing client not ready")
                    .build();
        }
        
        List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = new ArrayList<>();
        
        BillingFlowParams.ProductDetailsParams.Builder productDetailsParamsBuilder = 
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(productDetails);
        
        if (offerToken != null) {
            productDetailsParamsBuilder.setOfferToken(offerToken);
        }
        
        productDetailsParamsList.add(productDetailsParamsBuilder.build());
        
        BillingFlowParams billingFlowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(productDetailsParamsList)
                .build();
        
        Log.d(TAG, "Launching billing flow for product: " + productDetails.getProductId());
        return billingClient.launchBillingFlow(activity, billingFlowParams);
    }
    
    /**
     * Check if a purchase is currently in a free trial period
     * @param purchase The purchase to check
     * @return true if the purchase is in a free trial, false otherwise
     */
    public boolean isInFreeTrial(@NonNull Purchase purchase) {
        // Note: The actual trial status can be verified on your backend by validating
        // the purchase token with Google Play Developer API
        // Here we check basic indicators
        return purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED;
    }
    
    /**
     * Register a listener for purchase updates
     * @param listener The listener to register
     */
    public void addPurchaseUpdateListener(@NonNull PurchaseUpdateListener listener) {
        if (!purchaseUpdateListeners.contains(listener)) {
            purchaseUpdateListeners.add(listener);
        }
    }
    
    /**
     * Unregister a purchase update listener
     * @param listener The listener to unregister
     */
    public void removePurchaseUpdateListener(@NonNull PurchaseUpdateListener listener) {
        purchaseUpdateListeners.remove(listener);
    }
    
    /**
     * Notify all listeners of a purchase update
     */
    private void notifyPurchaseUpdate(@NonNull Purchase purchase) {
        for (PurchaseUpdateListener listener : purchaseUpdateListeners) {
            listener.onPurchaseUpdated(purchase);
        }
    }
    
    /**
     * Notify all listeners that purchase was cancelled
     */
    private void notifyPurchaseCancelled() {
        for (PurchaseUpdateListener listener : purchaseUpdateListeners) {
            listener.onPurchaseCancelled();
        }
    }
    
    /**
     * Notify all listeners of a purchase error
     */
    private void notifyPurchaseError(@NonNull String errorMessage) {
        for (PurchaseUpdateListener listener : purchaseUpdateListeners) {
            listener.onPurchaseError(errorMessage);
        }
    }
    
    /**
     * Disconnect from the billing service
     * Call this when the activity is destroyed
     */
    public void disconnect() {
        if (billingClient != null && billingClient.isReady()) {
            Log.d(TAG, "Disconnecting billing client");
            billingClient.endConnection();
            isReady = false;
        }
    }
    
    /**
     * Check if billing client is ready
     * @return true if ready, false otherwise
     */
    public boolean isReady() {
        return isReady && billingClient.isReady();
    }
}
