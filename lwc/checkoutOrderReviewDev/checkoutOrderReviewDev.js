import { LightningElement, api, track } from "lwc";

import getProductDetails from "@salesforce/apex/CheckoutOrderReviewController.getProductDetails";
import { auraExceptionHandler } from "c/auraExceptionHandler";
import { deepClone } from "c/utils";
import { NavigationMixin } from "lightning/navigation";
import icoArrowDown_SR from "@salesforce/resourceUrl/icoArrowDown";
import icoArrowUp_SR from "@salesforce/resourceUrl/icoArrowUp";
import deleteCart from '@salesforce/apex/CartItemController.deleteCartItem';
import icoRemoveCircle_SR from "@salesforce/resourceUrl/icoRemoveCircle";
import getCartItemData from '@salesforce/apex/FetchedItemController.getCartItemData'
import updateCartItem from '@salesforce/apex/FetchedItemController.updateCartItem'
import updateCartItemFields from '@salesforce/apex/CartItemController.updateCartItemFields'
import SiteFooterURL from '@salesforce/label/c.ImprimisrxSiteFooterURl';
import basePath from '@salesforce/community/basePath';

export default class CheckoutOrderReviewDev extends NavigationMixin(LightningElement)  {
    @track cartItemState;

	@api cartState;
	@api cartItemList;
	@api accountId;

	accId;	
  @api
  get accIdval() {
    return this.accountId;
  }

  set accIdval(value) {
    this.accId = this.accountId;
  }
	

	productList;
	cartItemsLoaded;
	productIds;
	icoArrowDown = icoArrowDown_SR;
	icoArrowUp = icoArrowUp_SR;
	icoRemoveCircle = icoRemoveCircle_SR;
	total;
    allColdShippedProducts;
	allNarcoticProducts;
	initialLoad;
	previousOtherClinicalDiffVal='';

	get cartItemsExist() {
		return this.cartItemList.length > 0;
	}

	cartData={"TotalAmount":0,"TotalProductAmount":0,"GrandTotalAmount":0};

	connectedCallback() {
		//alert('In')
		console.log('connectedcallback > accId:'+this.accountId);
		if (this.cartItemsExist) {
			this.cartItemState = deepClone(this.cartItemList);
			getProductDetails({ productIdList: this.extractProductIds(),accountId:this.accountId })
				.then(result => {
					result.forEach((item, i) => {
						item.medicalNecessity = this.convertMedicalNecessityToOptions(item.medicalNecessity,item.Medical_Necessity__c);						
						item.otherMed = false;						
					});	
					this.productList = result;	
					console.log('productList:'+JSON.stringify(this.productList));		
					this.mapMediaToCartItems(result);
					this.sendProductMediaListToParent();
					this.mapQuantityPerBoxToCartItems();
					this.mapMedicalNecessityToCartItems();
					this.mapNameToCartItems();
					//this.mapMedicalNecessityDefaultValue();
					this.extractColdShippingProducts();
					this.extractNarcoticProducts();
					this.initialLoad=true;
					this.cartItemsLoaded = true;
					this.getCartItems();
				})
				.catch(error => {
					auraExceptionHandler.logAuraException(error);
				});
		}
	}

	// renderedCallback(){
	// 	if(this.initialLoad){
	// 		this.mapMedicalNecessityDataId();
	// 		this.initialLoad=false;
	// 	}
	// }

	convertMedicalNecessityToOptions(medicalNecessity,selectedValue) {
		var medicalNecessityOption = [];
		medicalNecessity.forEach((item, i) => {
			if(item==selectedValue){
				medicalNecessityOption.push({ label: item, value: item ,selected: true });
			}else{
				medicalNecessityOption.push({ label: item, value: item ,selected: false});
			}
		});
		return medicalNecessityOption;
	}

	sendProductMediaListToParent() {
		this.dispatchEvent(new CustomEvent("set_product_media_results", { detail: this.productList, bubbles: true }));
	}

	extractColdShippingProducts(){
		let qpbMap = {};
		this.productList.forEach(p => {
			qpbMap[p.fields.Id] = p.fields.Cold_Ship_Required__c;
		});
		this.allColdShippedProducts = qpbMap;
		
	}

	extractNarcoticProducts(){
		let qpbMap = {};
		this.productList.forEach(p => {
			qpbMap[p.fields.Id] = p.fields.DEA_Narcotic__c;
		});
		this.allNarcoticProducts = qpbMap;
		
	}

	extractProductIds() {
		const productIdList = [];
		this.cartItemList.forEach(item => {
			productIdList.push(item.Product2Id);
		});
		this.productIds = productIdList; 
		return productIdList;
	}

	mapMediaToCartItems() {
		let imageMapById = this.buildIdToImageMap();
		this.cartItemState.forEach((item, i) => {
			item.imageUrl = imageMapById[item.Product2Id];
		});
	}

	mapMedicalNecessityDefaultValue(){
		let medic=''
		let index;
		this.cartItemState.forEach((item, i) => {
			item.medicalNecessity.forEach((med,j) =>{
				if(med==item.Medical_Necessity__c){
					medic=med;
					index=j
					if(med == 'Other Medical Necessity'){
						item.otherMed = true;
					}
				}
			});
			if(medic!=''){
				item.medicalNecessity.splice(index, 1);
				item.medicalNecessity.splice(0, 0, medic);	
			}
			if((item.medicalNecessity[0]=='Other Medical Necessity' || item.medicalNecessity[0] == 'Other Clinical Difference') && item.otherMed != true){
				item.otherMed = true;
			}
			if(item.Medical_Necessity__c==null){
				item.Medical_Necessity__c = item.medicalNecessity[0];
			}
		//	this.handleCartItemUpdate(item.Medical_Necessity__c,'',item.id);

		});
		
	}

	handleNecessityChange(event){
		let medic='';
		let index;
		this.cartItemState.forEach((item, i) => {
			if(item.Id==event.currentTarget.dataset.id){
				item.Medical_Necessity__c = event.target.value;
				item.medicalNecessity.forEach((med,j) =>{
					if(med==item.Medical_Necessity__c){
						medic=med;
						index=j
						if(med == 'Other Medical Necessity'){
							item.otherMed = true;
						}
					}
				});
				if(medic!=''){
					item.medicalNecessity.splice(index, 1);
					item.medicalNecessity.splice(0, 0, medic);	
				}
				this.handleCartItemUpdate(event.target.value,'',event.currentTarget.dataset.id);
				if(event.target.value == 'Other Medical Necessity' || event.target.value == 'Other Clinical Difference'){
					item.otherMed = true
				}
				else{
					item.otherMed = false
				}
			}
			
		});
	}

	handleCartItemUpdate(medical,otherclinical,cartItemId){
	//	this.cartItemsLoaded=false;
		updateCartItemFields({
			cartItemId : cartItemId,
			medicalNecessity : medical,
			otherClinical :otherclinical
		}).then(result=>{
			this.cartItemsLoaded=true;
		}).catch(error=>{
			this.cartItemsLoaded=true;
			
		})
	}

	handleClinicalDiff(event){
		
		//if(event.keyCode == 13){
			if(this.cartItemState!==undefined){
			this.cartItemState.forEach((item, i) => {
				if(item.Id==event.currentTarget.dataset.id){
					item.Other_Clinical_Options__c = event.target.value;
					this.handleCartItemUpdate(item.Medical_Necessity__c,event.target.value,event.currentTarget.dataset.id);
				}
				
			});
		//}
			}
	}

	mapNameToCartItems(){
		let qpbMap = {};
		let qpbMap1 = {};
		let qpbMap2 = {};
		this.productList.forEach(p => {
			//console.log('p:'+JSON.stringify(p.fields.PricebookEntries));
			qpbMap[p.fields.Id] = p.name;
			qpbMap1[p.fields.Id] = p.ProductCode;
			try{
				qpbMap2[p.fields.Id] = p.fields.PricebookEntries.records[0].UnitPrice;
			}catch(err){
				console.log(err.stack);
			}
		});
		this.cartItemState.forEach((item, index) => {
			item.name = qpbMap[item.Product2Id];
			item.ProductCode = qpbMap1[item.Product2Id];
			item.UnitAdjustedPrice=qpbMap2[item.Product2Id];
			item.TotalPrice=item.UnitAdjustedPrice*item.Quantity;
			this.total=item.TotalPrice;
		});
	}

	buildIdToImageMap() {
		let imageMapById = {};
		this.productList.forEach(p => {
			var pImg = p.imageUrl;
			pImg = pImg.replace("/imprimisrx","");
			imageMapById[p.fields.Id] = pImg;
		});
		return imageMapById;
	}

	buildIdToQuantityPerBoxMap() {
		let qpbMap = {};
		this.productList.forEach(p => {
			qpbMap[p.fields.Id] = p.fields.Quantity_Per_Box__c;
		});
		return qpbMap;
	}

	buildIdToQuantityUnitMeasureMap() {
		let qpbMap = {};
		this.productList.forEach(p => {
			qpbMap[p.fields.Id] = p.fields.QuantityUnitOfMeasure;
		});
		return qpbMap;
	}

	buildIdToUnitAdjustedPrice() {
		let qpbMap = {};
		this.productList.forEach(p => {
			qpbMap[p.fields.Id] = p.fields.PricebookEntries.records[0].UnitPrice;
		});
		return qpbMap;
	}
	
	mapMedicalNecessityToCartItems(){
		let qpbMap = {};
		let qpbOtherMap = {};
		let index =0;
		this.productList.forEach(p => {
			qpbMap[p.fields.Id] = p.medicalNecessity;
			qpbOtherMap[p.fields.Id] = p.otherMed;
			/*for(let i=0;i<p.medicalNecessity.length;i++){
				if(p.defaultClinical==p.medicalNecessity[i]){
					this.template.querySelector(`[data-id="${p.Product2Id}"]`).selectedIndex  =i;
				}
			}*/
		});
		this.cartItemState.forEach((item, index) => {
			item.medicalNecessity = qpbMap[item.Product2Id];
			item.otherMed = qpbOtherMap[item.Product2Id];
			if(item.Medical_Necessity__c == null){
				item.Medical_Necessity__c = item.medicalNecessity[0].label;
				this.handleCartItemUpdate(item.Medical_Necessity__c,'',item.Id);
			}
			if((item.Medical_Necessity__c=='Other Medical Necessity' || item.Medical_Necessity__c == 'Other Clinical Difference') && item.otherMed != true){
				item.otherMed = true;
			}
			item.medicalNecessity.forEach((option, i) => {
				if(option.label==item.Medical_Necessity__c){
					option.selected = true;
				}
			});
		});

	}

	mapQuantityPerBoxToCartItems() {
		let qpbMap = this.buildIdToQuantityPerBoxMap();
		let qpbMap2 = this.buildIdToQuantityUnitMeasureMap();
		this.cartItemState.forEach((item, index) => {
			item.Quantity_Per_Box__c = qpbMap[item.Product2Id];
			item.QuantityUnitOfMeasure = qpbMap2[item.Product2Id];
		});
        
	}

	goToPDP(event) {
		var proId = event.currentTarget.dataset.id;
		let prodName;
		this.cartItemState.forEach(item=>{
			if(item.Id==event.currentTarget.dataset.id){
				prodName=item.name;
			}
		})
        // this[NavigationMixin.Navigate]({
        //     type: 'comm__namedPage',
        //     attributes: {
        //         pageName: 'productdetails'
        //     },
        //     state: {
        //         'ProId': proId
        //     }
        // });
		window.open(SiteFooterURL+'/p/' + encodeURI(prodName) + '/'+proId, '_self');
	}

	deleteCartItem(event){
		this.cartItemsLoaded=false;
		let isNarcotic;
		let isColdShippedProduct=null;
		this.cartItemState.forEach((item, index) => {
			if(item.Id==event.currentTarget.dataset.id && item.Narcotic__c){
				isNarcotic=false;
			}else if(item.Narcotic__c){
				isNarcotic=true
			}
			if(item.Id==event.currentTarget.dataset.id && item.Cold_Ship_Required__c){
				isColdShippedProduct=item.Product2Id;
			}
		});
		deleteCart({ cartItemId: event.currentTarget.dataset.id })
            .then(result => {
                //
				this.getCartItems();
				this.handleCartUpdate({ field: "Contains_Narcotics__c", value: isNarcotic });
				if(isColdShippedProduct){
					this.dispatchEvent(new CustomEvent('cold_shippments', { detail : {Id : isColdShippedProduct}, bubbles: true }));
				}
				this.dispatchEvent(new CustomEvent('refresh_promo_code_cmp'));
            }).catch(error => {
                
            })
	}

	handleCartUpdate(detail) {
        this.dispatchEvent(new CustomEvent('cart_update', { detail : detail, bubbles: true }));
    }

	getCartItems(){
		console.log('getCartItems >>');
		getCartItemData().then((result) => {
			try{
            if(result.listItems!=null && result.listItems.length>0){
				let item=[];
				let cartDatatotal=0;
				// result.summary.totalProductAmount;
				let cartitems = result.listItems;
				let qpbMap = this.buildIdToQuantityPerBoxMap();
				let qpbMap2 = this.buildIdToQuantityUnitMeasureMap();
				let qpbMap3=this.buildIdToUnitAdjustedPrice();
				cartitems.map((cartItem) => {
					let newItem={};	
					newItem.Id =cartItem.item.cartItemId;
					newItem.Product2Id=cartItem.cartProduct.Id;
					newItem.TotalPrice=(cartItem.item.quantity)*(qpbMap3[newItem.Product2Id]);
					//console.log('newItem.TotalPrice:'+newItem.TotalPrice);
					cartDatatotal+=newItem.TotalPrice;
					//cartItem.item.totalAmount;
					newItem.Facility = cartItem.cartProduct.Facility__c;
					newItem.Is_Active__c = cartItem.cartProduct.IsActive;
					newItem.UnitAdjustedPrice=qpbMap3[newItem.Product2Id];
					//cartItem.item.unitAdjustedPrice;
					newItem.Sku=cartItem.cartProduct.StockKeepingUnit;
					newItem.imageUrl= basePath+'/sfsites/c'+cartItem.imageUrl;
					newItem.Quantity = cartItem.item.quantity;
					//alert( 'QTY'+cartItem.item.quantity)
					newItem.name = cartItem.cartProduct.Name;
					newItem.medicalNecessity = this.convertMedicalNecessityToOptions(cartItem.medicalNecessity,cartItem.Medical_Necessity); 
					newItem.Medical_Necessity__c = cartItem.Medical_Necessity; 
					newItem.Narcotic__c = this.allNarcoticProducts[cartItem.cartProduct.Id];
					newItem.Cold_Ship_Required__c = this.allColdShippedProducts[cartItem.cartProduct.Id];
					newItem.Quantity_Per_Box__c = qpbMap[newItem.Product2Id];
					newItem.QuantityUnitOfMeasure = qpbMap2[newItem.Product2Id];
					if(newItem.Medical_Necessity__c=='Other Medical Necessity' || newItem.Medical_Necessity__c == 'Other Clinical Difference'){
						newItem.otherMed = true;
						newItem.Other_Clinical_Options__c = cartItem.Other_Clinical_Options;
					}
					item.push(newItem);
					this.cartItemsLoaded=true;
				})
				
				this.cartItemState=item;
				console.log('cartDatatotal:'+cartDatatotal);				
				this.cartData.TotalAmount=cartDatatotal;
				this.cartData.TotalProductAmount=cartDatatotal;
				this.cartData.GrandTotalAmount=cartDatatotal;
				this.total=cartDatatotal;
				console.log('cartData:'+JSON.stringify(this.cartData));
				this.dispatchEvent(new CustomEvent("cart_item_update", {bubbles: true }));
				this.dispatchEvent(new CustomEvent('cart_item_list_update', { detail : {val : item,cartData:this.cartData}, bubbles: true }));

			}
			else{
				window.open(SiteFooterURL+'/order', '_self');
			}
		}catch(err){
			console.log(err.stack);
		}
            //this.cartItemLength = result.listItems.length;
        }).catch((error) => {
            
        })
	}

	handleQtyMinus(event) {
        this.cartItemsLoaded=false;
        this.cartItemState.map((cartItem) => {
            if (cartItem.Product2Id == event.currentTarget.dataset.id) {
                this.qtyCount = parseInt(this.template.querySelector(`[name="${cartItem.Product2Id}"]`).value) - 1;
                if (this.qtyCount < 1) {
                    this.qtyCount = 1;
                }
                this.template.querySelector(`[name="${cartItem.Product2Id}"]`).value = this.qtyCount;
                updateCartItem({ 
					cartItemId: cartItem.Id, 
					productId: event.currentTarget.dataset.id, 
					quantity: this.qtyCount,
					medicalNecessity:cartItem.Medical_Necessity__c,
					otherClinicalOptions:cartItem.Other_Clinical_Options__c
				 })
                    .then((result) => {
						//console.log('Resultssss='+JSON.stringify(result));
						this.getCartItems();
                    })
                    .catch((error) => {
                        
                    })
            }
        })
        
    }

	handleChangeQuantity(event) {
		
		this.cartItemsLoaded=false;
		this.cartItemState.map((cartItem) => {
		if (cartItem.Product2Id == event.currentTarget.dataset.id) {
			if (this.qtyCount > 1000) {
				this.qtyCount = 1000;
			}
			updateCartItem({ 
				cartItemId: cartItem.Id, 
				productId: event.currentTarget.dataset.id, 
				quantity: this.qtyCount,
				medicalNecessity:cartItem.Medical_Necessity__c,
				otherClinicalOptions:cartItem.Other_Clinical_Options__c
			 })
				.then((result) => {
					
					this.getCartItems();
				})
				.catch((error) => {
					
				})
			}
		})
    }

	handleQtyPlus(event) {
        this.cartItemsLoaded=false;
        this.cartItemState.map((cartItem) => {
            if (cartItem.Product2Id == event.currentTarget.dataset.id) {
		        this.qtyCount = parseInt(this.template.querySelector(`[name="${cartItem.Product2Id}"]`).value) + 1;
                if (this.qtyCount > 1000) {
                    this.qtyCount = 1000;
                }
                this.template.querySelector(`[name="${cartItem.Product2Id}"]`).value = this.qtyCount;
                updateCartItem({ 
					cartItemId: cartItem.Id, 
					productId: event.currentTarget.dataset.id, 
					quantity: this.qtyCount,
					medicalNecessity:cartItem.Medical_Necessity__c,
					otherClinicalOptions:cartItem.Other_Clinical_Options__c
				 })
                    .then((result) => {
						
                        this.getCartItems();
                    })
                    .catch((error) => {
                        
                    })
            }
        })
        
    }
}