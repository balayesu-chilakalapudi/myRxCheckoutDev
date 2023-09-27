import { LightningElement, api, track } from "lwc";
import {loadStyle, loadScript} from 'lightning/platformResourceLoader';

import { FlowNavigationNextEvent } from "lightning/flowSupport";
import authorizePaymentProfile from "@salesforce/apex/PaymentComponentController.authorizePaymentProfile";
import { createMessageContext, releaseMessageContext, publish } from 'lightning/messageService';
import SAMPLEMC from "@salesforce/messageChannel/SampleMessageChannel__c"
import { CheckoutValidation } from "./checkoutValidation";
import { deepClone, logProxy } from "c/utils";
import checkoutStyling from '@salesforce/resourceUrl/checkoutCss';
import createDiscountLineItem from '@salesforce/apex/PaymentComponentController.createDiscountLineItem';
import closeExternalFacilityCart from "@salesforce/apex/CheckoutFacilitySelectorController.closeExternalFacilityCart";
import getFacilityContactPointAddress from '@salesforce/apex/CheckoutFacilitySelectorController.getFacilityContactPointAddress'
import { auraExceptionHandler } from "c/auraExceptionHandler";
import getCartDetails from '@salesforce/apex/FetchedItemController.getCartDetails';
import updateCardpaymentMethodFornetTermsPending from "@salesforce/apex/PaymentComponentController.updateCardpaymentMethodFornetTermsPending";


import JQ36 from '@salesforce/resourceUrl/JQ36';

export default class ImprimisRxCheckoutDev extends LightningElement {
    @api cart;
	@track cartState;
	@api finalCartState;
	@api cartFrequency;
	@api iscartRecurring;
	@api recordId;
	@api cartItemList;
	@api contactPointAddressList;
	@api contact;
	@api shippingMethodList;
	@api paymentMethods;
	@track _paymentMethods = [];
	@api buyerProfileName;
	@api orderDeliveryMethodsList;
	@api availableActions;
	@api buyerManagerProfileName;
	checkoutReview = false;
	loaded;

	effectiveShippingAmount = 0;

	@track coldShippingRequired;
	@track coldShippingItems = [];
	@track coldItemsWithMedia = [];
	@track coldItemCount;
	@track productMediaList;
	@track paymentMethodError = true;
	@track showSpinner = false;
	@track paymentMethodAccess = false;
	@track hasError = false;
	btnDisabled;
	buyerManager;
	paymentAuthRequest = {};
	paymentAuthorized = false;
	authError = false;
	authErrorMessage;
	managePayments = false;
    context = createMessageContext();
	navigating;
	@api accId;

	

	parentAccount;
	showSections;
    facility;
	initalLoad;
	@api addressType = 'Shipping';
	shippingType = 'Standard';

	errors;
	@track finalValue=0;
	

	constructor() {
		debugger;
		super();
		let u = this.handleCartUpdate.bind(this);
		this.template.addEventListener("cart_update", u);
		let s = this.handleShippingStateUpdate.bind(this);
		this.template.addEventListener("shipping_state_update", s);
		let m = this.setProductMedia.bind(this);
		this.template.addEventListener("set_product_media_results", m);
		let p = this.handlePlaceOrder.bind(this);
		this.template.addEventListener("place_order", p);
		let ci = this.handleCartItemUpdate.bind(this);
		this.template.addEventListener("cart_item_update", ci);
		let rpr = this.refreshPromoCodeCmp.bind(this);
		this.template.addEventListener("refre_promo", rpr);
		let cs = this.handleColdShipmentsUpdate.bind(this);
		this.template.addEventListener("cold_shippments", cs);
		let facilityUpdate = this.handleFacilityUpdate.bind(this);
		this.template.addEventListener("facilty_updated", facilityUpdate);

		let cartItemListUpdate = this.handleCartItemListUpdate.bind(this);
		this.template.addEventListener("cart_item_list_update", cartItemListUpdate);
		
		
	}

	connectedCallback() {
		this.iscartRecurring = this.iscartRecurring.toString();
		this.buyerManager = this.buyerManagerProfileName.split(",").includes(this.buyerProfileName);
		this.cartState = deepClone(this.cart);
		this.parentAccount = this.cartState.AccountId;
		this.determineIfColdItemsInCart();
		this.determineIfNarcoticsPresent();
		this.setCartStateDefaults();
		this.loaded = true;
		this.checkoutReview = false;
		this.initalLoad=true;
		this.showSections=false;
		this.btnDisabled=false;
		// if (this.paymentMethods) {
		// 	this._paymentMethods = this.paymentMethods;
		// }
		loadStyle(this, checkoutStyling);
		console.log(this.cartState);
		
	}

	determineIfNarcoticsPresent() {
		if (this.cartState.Contains_Narcotics__c && this.contactPointAddressList!=null && this.contactPointAddressList.length>0) {
			this.contactPointAddressList = this.contactPointAddressList.filter(a => {
				return a.AddressType === "Billing" || (a.AddressType === "Shipping" && a.DEA__c);
			});
		}
	}

	determineIfColdItemsInCart() {
		this.coldShippingItems = this.cartItemList.filter(i => {
			return i.Cold_Ship_Required__c;
		});
		this.coldItemCount = this.coldShippingItems.length;
		this.coldShippingRequired = this.coldItemCount > 0;;
	}

	setProductMedia(event) {
		this.productMediaList = event.detail;
		this.coldItemsWithMedia = event.detail?.filter(i => {
			return i.fields.Cold_Ship_Required__c;
		});
		console.log(this.coldItemsWithMedia);
	}

	handleCartItemUpdate(event){
		getCartDetails({
			cartId : this.cart.Id
		}).then(result=>{
			console.log(result);
			console.log('this.cartState<><>' ,this.cartState);
			//this.cartState.GrandTotalAmount=result.GrandTotalAmount;
			//this.cartState.TotalAmount=result.TotalAmount;
			this.cartState.Bulk_Discount_Total__c = result.Bulk_Discount_Total__c;
			this.cartState.Promo_Code_Discount_Total__c=0;
			if(result.Promo_Code_Discount_Total__c!==undefined){
			this.cartState.Promo_Code_Discount_Total__c = result.Promo_Code_Discount_Total__c;
			}
			this.cartState.Shipping_Discount__c = result.Shipping_Discount__c;
			this.cartState.TotalAmountAfterAllAdjustments=result.TotalAmountAfterAllAdjustments;
			this.cartState.TotalListAmount=result.TotalListAmount;
			this.cartState.TotalProductCount=result.TotalProductCount;
			this.cartState.TotalProductAmount=result.TotalProductAmount;
			this.cartState.Discounted_Product__c = result.Discounted_Product__c;
			this.cartState.Discount_Code__c = result.Discount_Code__c;
			this.finalValue = result.TotalProductAmount - this.cartState.Promo_Code_Discount_Total__c;
			// if(result.Promo_Code_Discount_Total__c!==undefined){
			// this.cartState.finalAmount = result.TotalProductAmount - result.Promo_Code_Discount_Total__c;
			// }
			// else{
			// 	this.cartState.finalAmount = result.TotalProductAmount
			// }
			if(result.Shipping_Discount__c===undefined){
				result.Shipping_Discount__c=0;
			}
			this.effectiveShippingAmount = this.cartState.TotalShippingAmount < result.Shipping_Discount__c ? 0 : this.cartState.TotalShippingAmount - result.Shipping_Discount__c;
			//this.effectiveShippingAmount=0;
			console.log("this.effectiveShippingAmount", this.effectiveShippingAmount);
			//this.refreshPromoCodeCmp();
		}).catch(error=>{ 
			console.log(error);
		})
	}

	handleFacilityUpdate(event){
		console.log('handleFacilityUpdate >>');
		//this.cartItemList={};
		console.log('this.cartItemList:'+JSON.stringify(this.cartItemList));
		debugger;
        this.showSections = false;
		// if((this.parentAccount!=event.detail.value && this.initalLoad) || (!this.initalLoad)){
			this.accId = event.detail.value
			console.log(this.accId);			
			getFacilityContactPointAddress({
				accId :  event.detail.value
			}).then(result=>{
				this.contactPointAddressList = result;
				this.cartState.AccountId=this.accId;
				this.showSections = true;
				this.initalLoad = false;
				this.determineIfNarcoticsPresent();
			}).catch(error=>{
				console.log(error)
			})
		// }else{
		// 	this.showSections = true;
		// 	this.determineIfNarcoticsPresent();
		// }
        
	}	

	handleCartUpdate(event) {
		console.log(event.detail);
		let updateList = !!event.detail.length ? event.detail : [event.detail];
		updateList.forEach(item => {
			if (item.field == "TotalShippingAmount"){
				this.effectiveShippingAmount = item.value < this.cartState.Shipping_Discount__c ? 0 : item.value - this.cartState.Shipping_Discount__c
			}
			if (item.field == "ShippingType"){
				this.shippingType = item.value;
				return;
			}
			if (item.field == "PaymentMethodId"){
				this.paymentAuthorized = false;		
			}			
			this.cartState[item.field] = item.value;
			console.log(item.field);
			console.log(item.value)
		});
		console.log("effectiveShippingAmount",this.effectiveShippingAmount);
	}

	refreshPromoCodeCmp(){
		debugger;
		//alert('hi')
		this.template.querySelector("c-checkout-promo-code").getAppliedDiscounts();
	}

	handleColdShipmentsUpdate(event){
		console.log(event.detail.Id);
		console.log(this.coldShippingItems);
		let id = event.detail.Id;
		this.coldItemsWithMedia=this.coldItemsWithMedia.filter(
			(item) => !(item.fields.Id==id)
		  );
		console.log(this.coldItemsWithMedia);
		this.coldItemCount = this.coldItemsWithMedia.length;
		this.coldShippingRequired = this.coldItemCount > 0;;
		let coldState = {coldItemCount : this.coldItemCount,coldShippingRequired : this.coldShippingRequired};
		this.template.querySelector("c-checkout-shipping-options-dev").filterOnColdShippingRemove(coldState);
	}

	handleShippingStateUpdate(event) {
		console.log('a');
		console.log(event.detail);
		var shippingState = event.detail.toLowerCase();
		if (shippingState=='alabama' || shippingState=='mississippi' || shippingState=='arkansas' ||
		shippingState=='al' || shippingState=='ms' || shippingState=='ar'
        ){
            this.hasError = true;
        }else{
            this.hasError = false;
        }		
		this.template.querySelector("c-checkout-shipping-options-dev").reFilterShippingMethodsByState(event.detail);
	}

	showCheckoutSummary=false;
	
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

	setCartStateDefaults() {
		this.cartState.TotalShippingAmount = 0;;
		this.effectiveShippingAmount = 0;;
		console.log("this.effectiveShippingAmount", this.effectiveShippingAmount);
	}

	showAddPaymentModal() {
		this.template.querySelector("c-checkout-payment-method").showPaymentModal();

		Promise.all([
            loadScript(this,JQ36)
        ]).then(() => { 
            $("html").addClass("modalIsOpen");
            $("body").addClass("modalIsOpen");
        });
	}

	showAddAddressModal(event) {
		this.template.querySelector("c-checkout-addresses-dev").showAddressModal();
		console.log(event.detail.type)
		this.addressType = event.detail.type
		Promise.all([
            loadScript(this,JQ36)
        ]).then(() => { 
            $("html").addClass("modalIsOpen");
            $("body").addClass("modalIsOpen");
        });
	}

	goToCart() {
		publish(this.context, SAMPLEMC);
	}

	handlePlaceOrder() {
		let validationState = new CheckoutValidation(this.cartState,this._paymentMethods,this.cartItemList);
		this.errors = validationState.errors;
		console.log(validationState.isValid());
		if (validationState.isValid()) {
			this.handleReviewOrder();
		}
	}

	handleReviewOrder(){
		var divblock = this.template.querySelector('[data-id="checkoutBlock"]');
        if(divblock){
            this.template.querySelector('[data-id="checkoutBlock"]').className='slds-hide';
        }
		this.showSpinner = false;
		this.checkoutReview = true;
		const scrollOptions = {
			left: 0,
			top: 0,
			behavior: 'smooth'
		}
		window.scrollTo(scrollOptions);
		return;
	}


	placeOrder() {
		this.buildCartForOrderPlaceAction();				
	}

	authorizePayment() {
		return new Promise((resolve, reject) => {
		//Only Authorize credit card orders
			console.log(this.cartState.PaymentMethodId);
			console.log(this._paymentMethods);
			if ((this._paymentMethods).find(m => m.Id === this.cartState.PaymentMethodId).Net_Terms__c) {
				this.paymentAuthorized = true;
				updateCardpaymentMethodFornetTermsPending({PaymentMethodId: this.cartState.PaymentMethodId, accId: this.cartState.AccountId})
				.then(res => {
					console.log('success');
					resolve('true');
				})
				.catch(error => {
					auraExceptionHandler.logAuraException(error);
					this.showSpinner = false;
					this.authError = true;
					resolve('false');
				});
		
				this.closeExternalFacility();
			} else {
				this.buildAuthorizeRequest();
				this.showSpinner = true;

				authorizePaymentProfile({ authorizeRequest: this.paymentAuthRequest ,accId:this.cartState.AccountId})
					.then(res => {
						if (res.isSuccess) {
							this.finalCartState.Payment_Held_For_Review__c = res.paymentHeldForReview;
							this.authError = false;
							this.paymentAuthorized = true;
							this.closeExternalFacility();
							resolve('true');
						} else {
							this.showSpinner = false;
							this.authError = true;
							logProxy("ERROR: ", res);
							resolve('false');
						}
					})
					.catch(error => {
						auraExceptionHandler.logAuraException(error);
						this.showSpinner = false;
						this.authError = true;
						resolve('false');
					});
			}
		});
	}

	closeExternalFacility(){
		if(this.accId && this.accId!=this.parentAccount){
			console.log('Close External Facility Cart')
			closeExternalFacilityCart({
				selectedAcc : this.accId
			}).then(result=>{
				this.proceed();
			}).catch(error=>{
				console.log(error);
			})
		}
		else{
			this.proceed();
		}
	}

	proceed() {
		// var dis = this.cartState.Bulk_Discount_Total__c + this.cartState.Promo_Code_Discount_Total__c
		// console.log(dis);
		// createDiscountLineItem({
		// 	cartId : this.cartState.Id,
		// 	roundedDiscount : dis
		// }).then(result=>{
		// 	if (this.availableActions.find(action => action === "NEXT")) {
		// 		const navigateNextEvent = new FlowNavigationNextEvent();
		// 		this.dispatchEvent(navigateNextEvent);
		// 	}
		// })
		
		console.log(this.cartState);
		console.log(JSON.stringify(this.cartState));
		console.log(this._paymentMethods);
		console.log(JSON.stringify(this._paymentMethods));
		console.log(this.cartItemList);
		console.log(JSON.stringify(this.cartItemList));
		var divblock = this.template.querySelector('[data-id="checkoutBlock"]');
        if(divblock){
            this.template.querySelector('[data-id="checkoutBlock"]').className='slds-hide';
        }
		this.showSpinner = false;
		this.checkoutReview = true;
		const scrollOptions = {
			left: 0,
			top: 0,
			behavior: 'smooth'
		}
		window.scrollTo(scrollOptions);
		return;

		if (this.availableActions.find(action => action === "NEXT")) {
			const navigateNextEvent = new FlowNavigationNextEvent();
			this.dispatchEvent(navigateNextEvent);
		}
		
	}

	buildAuthorizeRequest() {
		let paymentMethod = this._paymentMethods.find(m => m.Id === this.cartState.PaymentMethodId);

		this.paymentAuthRequest.paymentMethodId = paymentMethod.Id;
		this.paymentAuthRequest.cardholderName = paymentMethod.CardHolderName;
		this.paymentAuthRequest.cardholderFirstName = paymentMethod.CardHolderFirstName;
		this.paymentAuthRequest.cardholderLastName = paymentMethod.CardHolderLastName;
		this.paymentAuthRequest.billingStreet = paymentMethod.PaymentMethodStreet;
		this.paymentAuthRequest.billingCity = paymentMethod.PaymentMethodCity;
		this.paymentAuthRequest.billingStateCode = paymentMethod.PaymentMethodState;
		this.paymentAuthRequest.billingCountryCode = paymentMethod.PaymentMethodCountry;
		this.paymentAuthRequest.billingPostalCode = paymentMethod.PaymentMethodPostalCode;
		this.paymentAuthRequest.billingPhone = paymentMethod.Phone;
		this.paymentAuthRequest.cartId = this.cartState.Id;
		// Add Delivery Charge
		this.paymentAuthRequest.cartTotal =  this.cartState.GrandTotalAmount + this.effectiveShippingAmount;
		//Add Potential Discounts
		this.paymentAuthRequest.cartTotal += -1 * (this.cartState.Bulk_Discount_Total__c?this.cartState.Bulk_Discount_Total__c:0 + this.cartState.Pharma_Pack_Discount_Total__c?this.cartState.Pharma_Pack_Discount_Total__c:0 + this.cartState.Promo_Code_Discount_Total__c?this.cartState.Promo_Code_Discount_Total__c:0);
	}

	buildCartForOrderPlaceAction() {
		this.finalCartState = deepClone(this.cartState);
		console.log(this.finalCartState)
		this.finalCartState.BillingStreet = this.finalCartState.BillingAddress.Street;
		this.finalCartState.BillingState = this.finalCartState.BillingAddress.state;
		this.finalCartState.BillingCountry = this.finalCartState.BillingAddress.Country;
		this.finalCartState.BillingPostalCode = this.finalCartState.BillingAddress.PostalCode;
		this.finalCartState.BillingCity = this.finalCartState.BillingAddress.City;
		//this.finalCartState.GrandTotalAmount = (this.finalCartState.GrandTotalAmount + this.effectiveShippingAmount) - this.finalCartState.Bulk_Discount_Total__c - this.finalCartState.Promo_Code_Discount_Total__c;

		this.trimDataModelForOrderPlace();
	}

	//Trim out the extra data only used for interface display in cartState
	trimDataModelForOrderPlace() {
		//ShippingAddress gets set in apex by the Shipping_Address__c Id field
		delete this.finalCartState.BillingAddress;
		delete this.finalCartState.ShippingAddress;
		//For interface display purposes only, real value comes from OrderDeliveryMethod
		delete this.finalCartState.TotalShippingAmount;
	}

	handlePaymentMethodResponse(event) {
		this.paymentMethodError = event.detail.hasError;
		this.paymentMethodAccess = !event.detail.paymentMethodAccess;
		
        console.log(event.detail.hasError)
		console.log(!event.detail.paymentMethodAccess)
	}

	handleGetPayments(event){
		console.log(event.detail.paymentMethods)
		let payments=[];
		for(var key in event.detail.paymentMethods){
			payments.push(event.detail.paymentMethods[key]);
		}
		this._paymentMethods=payments
		console.log(this._paymentMethods);
	}

	handleNewPaymentMethodEvent(event) {
		this._paymentMethods = [...this._paymentMethods, event.detail];
	}

	async placeOrderFromReview(){
		this.finalCartState = deepClone(this.cartState);
		await this.authorizePayment();
		if(this.authError){
			this.checkoutReview = false;
			var divblock = this.template.querySelector('[data-id="checkoutBlock"]');
			if(divblock){
				this.template.querySelector('[data-id="checkoutBlock"]').className='slds-show';
			}
			const scrollOptions = {
				left: 0,
				top: 0,
				behavior: 'smooth'
			}
			window.scrollTo(scrollOptions);
			return ;
		}
		this.placeOrder();
		const scrollOptions = {
			left: 0,
			top: 0,
			behavior: 'smooth'
		}
		window.scrollTo(scrollOptions);
		if (this.availableActions.find(action => action === "NEXT")) {
			const navigateNextEvent = new FlowNavigationNextEvent();
			this.dispatchEvent(navigateNextEvent);
		}
	}

	backToCheckout(){
		this.showSpinner = false;
		this.checkoutReview = false;
		var divblock = this.template.querySelector('[data-id="checkoutBlock"]');
        if(divblock){
            this.template.querySelector('[data-id="checkoutBlock"]').className='slds-show';
        }
		const scrollOptions = {
			left: 0,
			top: 0,
			behavior: 'smooth'
		}
		window.scrollTo(scrollOptions);
	}
}