# myRxCheckoutDev
# Refresh child component from parent 
the statement if:true={showCheckoutSummary}, refreshes the child component when showCheckoutSummary is true
```
<template>
<c-checkout-section-dev step-title="Place Your Order" allow-overflow="true">
										<c-checkout-summary
											slot="body"
											available-actions={availableActions}
											if:true={showCheckoutSummary}
											cart-state={cartState}
											effective-shipping-amount={effectiveShippingAmount}
											auth-error={authError}
											auth-error-message={authErrorMessage}
											validation-errors={errors}
											has-error={hasError}
										></c-checkout-summary>
									</c-checkout-section-dev>
</template>
```
# Pass event from child component to parent component
There are two ways we can pass event details from child to parent, first one is to declare method name directly in child component like this,
```
<template>
<c-checkout-order-review-dev slot="body" if:true={showSections} cart-item-list={cartItemList} cart-state={cartState} final-value={finalValue} oncartitemdelete={handleCartUpdate} onrefresh_promo_code_cmp={refreshPromoCodeCmp} account-id={accId}></c-checkout-order-review-dev>
</template>
```
Here oncartitemdelete={handleCartUpdate}, calls the handleCartUpdate method of the parent component.
Second way of adding event to the parent is like below
```
let cartItemListUpdate = this.handleCartItemListUpdate.bind(this);
this.template.addEventListener("cart_item_list_update", cartItemListUpdate);
handleCartItemListUpdate(event) {
		debugger;
		console.log('handleCartItemListUpdate');
		console.log(event.detail);
		this.cartItemList = event.detail.val;
		console.log('cartData:'+JSON.stringify(event.detail.cartData));
		this.cartState.TotalAmount=event.detail.cartData.TotalAmount;	
		this.cartState.TotalProductAmount=event.detail.cartData.TotalProductAmount;
		this.cartState.GrandTotalAmount=event.detail.cartData.GrandTotalAmount;	
		this.showCheckoutSummary=true;
	}
```
from the child component, event firing is like this,
```
this.dispatchEvent(new CustomEvent("cart_item_update", {bubbles: true }));
this.dispatchEvent(new CustomEvent('cart_item_list_update', { detail : {val : item,cartData:this.cartData}, bubbles: true }));
this.dispatchEvent(new CustomEvent('refresh_promo_code_cmp')); 
```




