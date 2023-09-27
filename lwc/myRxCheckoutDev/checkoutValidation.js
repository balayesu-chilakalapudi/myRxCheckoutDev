import { uuidv4 } from "c/utils";

export class CheckoutValidation {

    constructor(checkoutState,facilityPaymentMethods,cartItemList) {
        this.errors = [];
        this.state = checkoutState;
        this.cartItems = cartItemList;
        this.paymentMethods = facilityPaymentMethods;
        this.run();
    }

    run() {
        debugger;
        this.resetErrors();
        this.validatePaymentMethod();
        this.validateBillingAddress();
        this.validateShippingAddress();
        this.validateSelectedShippingMethod();
        this.selectRecurringFrequency();
        this.cartItemValidation();
    }

    resetErrors() {
        this.errors = [];
    }

    validatePaymentMethod() {
        if(!this.state.PaymentMethodId) {
            this.errors.push(new Error(message.paymentMethodError))
        }
    }

    validateShippingAddress() {
        if(!this.state.ShippingAddress?.Id) {
            this.errors.push(new Error(message.shippingAddressError))
        }
    }

    validateBillingAddress() {
        if(!this.state.BillingAddress?.Id) {
            this.errors.push(new Error(message.billingAddressError))
        }
    }

    validateSelectedShippingMethod() {
        if(!this.state.Order_Delivery_Method__c) {
            this.errors.push(new Error(message.shippingMethodError));
        }
    }

    selectRecurringFrequency() {
        if(this.state.Is_Recurring_Order__c && !this.state.Recurring_Order_Frequency_Number__c) {
            this.errors.push(new Error(message.selectRecurringFrequency));
        }
        
        if(this.state.Is_Recurring_Order__c && (this.paymentMethods).find(m => m.Id === this.state.PaymentMethodId).NickName==='Net terms Pending'){
            this.errors.push(new Error(message.selectRecurringNetTermsPending));
        }
    }

    cartItemValidation(){
        debugger;
     //  let customError;
        try{
        this.cartItems.forEach(item => {
            if(item.Is_Active__c==false || (item.Facility!==undefined && !item.Facility.includes('503B')) || (item.Is503B__c!=undefined && item.Is503B__c==false)){
                if(item.Product_Name__c!=undefined){
                    this.errors.push(new Error({name: 'Product is Inactive',message: item.Product_Name__c + ' is Inactive'}));

        //    customError = {name: 'Product is Inactive',message: item.Product_Name__c + ' is Inactive'};
                }
                else{
                    this.errors.push(new Error({name: 'Product is Inactive',message: item.name + ' is Inactive'}));
             //   customError = {name: 'Product is Inactive',message: item.name + ' is Inactive'};
                }
               // this.errors.push(new Error(customError));
            }
        })}
        catch(ex){
            console.log(ex);
        }
    }

    isValid() {
        return this.errors.length === 0;
    }

}

class Error {
    constructor(e) {
        this.id = uuidv4();
        this.name = e.name;
        this.message = e.message;
        this.type = e.type ?? 'Error';
    }
}

const message = {
    paymentMethodError: {
        name: 'Payment Method is Required',
        message: 'Select a payment method'
    },
    shippingAddressError: {
        name: 'Shipping Address Id Null',
        message: 'Shipping address is required'
    },
    billingAddressError: {
        name: 'Billing Address Id Null',
        message: 'Billing address is required'
    },
    shippingMethodError: {
        name: 'Order Delivery Method is Null',
        message: 'Select a shipping option'
    },
    selectRecurringFrequency: {
        name: 'Order Frequency Must Be Selected If Order is Marked Recurring',
        message: 'Select a recurring order frequency'
    },
    selectRecurringNetTermsPending: {
        name: 'Recurring Order Net terms pending',
        message: 'Recurring orders cannot be placed using pending Net Terms. Please select a different payment method to place a recurring order.'
    }
}