/**
	* Copyright (c) 2021 ForeFront, Inc. All Rights Reserved.
	* Subject to ForeFront, Inc. licensing.
	*
	* @author tomdennis/Forefront
	* @version 1.0
	* @description
	*
	* PURPOSE
	* 
	*   Fetches additional details for order review step
	* 
	* TEST CLASS 
	* 
	*   CheckoutOrderReviewController_TEST
	* 
	* CHANGE LOG 
	* 
	*    [Version; Date; Author; Description]
	*    v1.0; 5/24/21; tomdennis/Forefront; Initial Build
	* 
**/
public with sharing class CheckoutOrderReviewController {

    @AuraEnabled
    public static List<ProductService.SimpleProduct> getProductDetails(List<Id> productIdList,String accountId){
        try {

            Set<Id> productIds = new Set<Id>(productIdList);
			if(accountId==null){
				accountId=BuyerService.effectiveAccountId;
			}
            return ProductService.getInstance().getSimpleProducts(
                BuyerService.currentWebStoreId,
                productIds,
               /* BuyerService.effectiveAccountId,*/accountId,
                null
            );

        } catch (Exception ex) {
            throw new AuraHandledException(AuraHandledExceptionBuilder.buildClientMessage(ex));
        }
    }

}