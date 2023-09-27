/* Copyright (c) 2021 ForeFront, Inc. All Rights Reserved. Subject to ForeFront, Inc. licensing. */


import {LightningElement, api, track} from 'lwc';
import { NavigationMixin } from "lightning/navigation";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { FlowAttributeChangeEvent, FlowNavigationNextEvent } from 'lightning/flowSupport';
import { logProxy } from "c/utils";

export default class CheckoutSummary extends NavigationMixin(LightningElement) {

    @api cartState;
    shippingAmount = 0;
    total =0 ;
    // @api get effectiveShippingAmount(){
    //     return this.shippingAmount;
    // }
    // set effectiveShippingAmount(value){
    //     this.shippingAmount = value;
    //     this.grandTotal();
    // }
    @api effectiveShippingAmount;
    @api availableActions;
 
    @api validationErrors;
    @api authError;
    @api isDisabled;
    @api authErrorMessage;

    @api hasError;
    @api errorNotification;
    termsNotAccepted;

    connectedCallback() {
        this.errorNotification = false;
        debugger;
        //this.termsNotAccepted = true;
        // this.cartState.Bulk_Discount_Total__c = Math.floor(this.cartState.Bulk_Discount_Total__c)
        // this.cartState.GrandTotalAmount = Math.floor(this.cartState.GrandTotalAmount)
        // this.effectiveShippingAmount = Math.floor(this.effectiveShippingAmount);
    }

    handleTermsAccept() {
        this.termsNotAccepted = !this.termsNotAccepted;
    }

    get hasBulkDiscount() {
        return this.cartState?.Bulk_Discount_Total__c > 0;
    }

    get hasPharmaPackDiscount() {
        return !this.cartState.Exclude_Pharma_Pack__c && this.cartState?.Pharma_Pack_Discount_Total__c > 0;
    }

    get discountInfo(){
        return this.cartState.TotalProductAmount>=5000 && this.cartState.TotalProductAmount<10000?'Over $5k, 5%':this.cartState.TotalProductAmount>=10000?'Over $10k, 7.5%':'';
    }

    get hasPromoCodeDiscount(){
        return this.cartState.Promo_Code_Discount_Total__c != 0;
    }

    get subtotal(){
        return this.cartState.GrandTotalAmount;
    }

    get grandTotal() {
        let bulkDiscount = this.cartState.Bulk_Discount_Total__c !== null
          ? this.cartState.Bulk_Discount_Total__c
          : 0;
        let pharmaPackDiscount = this.cartState.Pharma_Pack_Discount_Total__c !== null 
          ? this.cartState.Pharma_Pack_Discount_Total__c
          : 0;
        pharmaPackDiscount=pharmaPackDiscount?pharmaPackDiscount:0;
        bulkDiscount=bulkDiscount?bulkDiscount:0;
        bulkDiscount = bulkDiscount;

        let promoCodeDiscount = this.cartState.Promo_Code_Discount_Total__c !==null 
            ? this.cartState.Promo_Code_Discount_Total__c
            : 0;
        let total = this.cartState.GrandTotalAmount
            + this.effectiveShippingAmount
            - pharmaPackDiscount
            - bulkDiscount
            - promoCodeDiscount;
        return  total<0?0:total
    }

    goToTermsPage(event) {
        this[NavigationMixin.GenerateUrl]({
            type: "comm__namedPage",
            attributes: {
                name: 'TermsAndConditions__c'
            }
        }).then(url => {
            window.open(url, '_blank');
        });
    }

    placeOrder() {
        if(!this.termsNotAccepted){
            const evt = new ShowToastEvent({
                message : "Please read and accept our Terms and Conditions",
                variant : "error"
            });
            this.dispatchEvent(evt);
        }
        else{
            let details = { bubbles: true, composed: true };
            this.dispatchEvent(new CustomEvent("place_order", details));
        }
        
    }

    logProxy(msg, data) {
    }

    showErrorNotification(){
        if(this.errorNotification==true){
            this.errorNotification = false;
        }else{
            this.errorNotification = true;
        }

    }

    showErrorNotificationonblur(){
        this.errorNotification = false;        
    }

}