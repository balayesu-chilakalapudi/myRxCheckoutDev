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
 *   Controller for ProductService
 *
 * TEST CLASS
 *
 *   ProductService_TEST
 *
 * CHANGE LOG
 *
 *    [Version; Date; Author; Description]
 *    v1.0; 4/19/21; tomdennis/Forefront; Initial Build
 *
 **/
public without sharing class ProductService {
    @TestVisible private static ConnectApi.PricingResult mockProductPrices;

    private static ProductService instance;

    public static ProductService getInstance() {
        if (instance == null) {
            instance = (ProductService) ServiceFactory.get(ProductService.class);
        }

        return instance;
    }

    public List<Product2> fetch(Set<Id> productIds){
        return new Query(Product2.SObjectType)
            .selectAllFields()
            .addConditionIn(Product2.Id, productIds)
            .toSObjectList();
    }

    public Map<Id, Decimal> getProductPrices(
            String webStoreId,
            Set<Id> productIds,
            String effectiveAccountId
    ) {
        /*PricingService.PricingCollection pricing = PricingService.getInstance().getPricing(
            webStoreId,
            effectiveAccountId,
            productIds
        );
        System.debug(JSON.serializePretty(pricing));*/
        return TopPriorityPriceBook.getTopPriorityPrices(productIds);
    }

    public MediaService.MediaContainer getProductMedia(Set<Id> productIds) {
        return MediaService.getInstance()
            .getMedia(BuyerService.currentCommunityId, productIds);
    }

    public List<SimpleProduct> getSimpleProducts(
            String webstoreId,
            Set<Id> productIds,
            String effectiveAccountId,
            Map<Id, List<ProductCategory>> categories
    ) {

        Map<Id, Decimal> productPrices = getProductPrices(
                webstoreId,
                productIds,
                effectiveAccountId
        );

        MediaService.MediaContainer container = getProductMedia(productIds);

        List<Product2> products = new Query(Product2.SObjectType)
                .addConditionIn(Product2.Id, productIds)
                .selectAllFields()
                .toSObjectList();

                String pricebookname='';
                BuyerGroupMember gm;
                try{
                    gm=[SELECT BuyerGroupId,BuyerId,Id FROM BuyerGroupMember where BuyerId=:effectiveAccountId limit 1];
                    //get pricebook name from buyergroupId
                    BuyerGroupPricebook bgp=[SELECT Id, Name, BuyerGroupId, Pricebook2.name, IsActive, Priority FROM BuyerGroupPricebook where BuyerGroupId=:gm.BuyerGroupId limit 1];
                    pricebookname=bgp.Pricebook2.name;
                }catch(Exception ex){
                    system.debug(ex);
                }               

        Map<Id,Product2> productMap = new Map<Id,Product2>([SELECT Id,Sub_Unit_Dose__c,Sub_Unit_Size_Measure__c,Sub_Unit_Type__c,Is_Quantity_1__c,Clinical_Difference_Options__c,Default_Clinical_Difference_Option__c,StockKeepingUnit,QuantityUnitOfMeasure,Product_Insert_PDF__c, Product_NDC__c, Name, Storage__c, Description, Sub_Unit_Size__c ,Quantity_Per_Box__c,Fax__c,Unapproved_Indication__c,Active_Ingredient_Class__c,Preserved_Preservative_Free__c,Dosage_Form__c,Cold_Ship_Required__c,Coming_Soon__c,IsActive,Facility__c,ProductCode,UrlName__c,(SELECT UnitPrice FROM PricebookEntries WHERE PriceBook2.Name=:pricebookname/*'ImprimisRX Price Book'*/) FROM Product2 WHERE ID IN : products  ORDER BY Name]);
        List<SimpleProduct> simpleProducts = new List<SimpleProduct>();

        for (Product2 product : productMap.values()) {
            simpleProducts.add(
                    new SimpleProduct(
                            product,
                            productPrices.get(product.Id),
                            container.defaultImage(product.Id),
                            categories?.get(product.Id),
                            container.alternativeImageUrls(product.Id)
                    )
            );
        }

        return simpleProducts;
    }

    public SimpleProduct getSimpleProduct(
            String webstoreId,
            String productId,
            String effectiveAccountId,
            Map<Id, List<ProductCategory>> categories
    ) {
        return getSimpleProducts(
                webstoreId,
                new Set<Id>{ productId },
                effectiveAccountId,
                categories
        )
                ?.get(0);
    }

    public class SimpleProduct {
        @AuraEnabled public Product2 prod { get; set; }
        @AuraEnabled public Id sfid { get; set; }
        @AuraEnabled public String sku { get; set; }
        @AuraEnabled public String name { get; set; }
        @AuraEnabled public String description { get; set; }
        @AuraEnabled public List<ProductCategory> categories { get; set; }
        @AuraEnabled public String uom { get; set; }
        @AuraEnabled public String unitSize { get; set; }
        @AuraEnabled public List<String> medicalNecessity {get; set;}
        @AuraEnabled public String imageUrl { get; set; }
        @AuraEnabled public String defaultClinical {get;set;}
        @AuraEnabled public List<String> alternativeImages { get; set; }
        @AuraEnabled public Decimal price { get; set; }
        @AuraEnabled public Map<String, Object> fields { get; set; }
        @AuraEnabled public String Medical_Necessity {get;set;}
        @AuraEnabled public String Other_Clinical_Options {get;set;}
        @AuraEnabled public String ProductCode {get;set;}
        @AuraEnabled public List<Imprimis_Website_Tag_Color_Coding__mdt> colors;
        // backwards compatibility with connect api schema

        // needed by @AuraEnabled methods if structure is used as a parameter
        public SimpleProduct() { }

        public SimpleProduct(Product2 product, Decimal price, MediaService.Item defaultImage, List<ProductCategory> categories, List<String> itemUrls
        ) {
            System.debug('product ' + product.Id + ' name: ' + product.Name);
            System.debug('price: ' + price);
            this.prod = product;
            this.price = price;
            this.sfid = product.Id;
            this.sku = product.StockKeepingUnit;
            this.name = product.Name;
            this.defaultClinical = product.Default_Clinical_Difference_Option__c;
            this.medicalNecessity = product.Clinical_Difference_Options__c!=null?product.Clinical_Difference_Options__c.split(';'):null;
            this.description = product.Description;
            this.ProductCode = product.ProductCode;
            //this.uom = product.QuantityUnitOfMeasure;
            this.unitSize = product.Quantity_Per_Box__c != null
                    ? '$' +
                            (price / product.Quantity_Per_Box__c)
                                    .setScale(2, RoundingMode.HALF_UP) +
                            ' per vial'
                    : '';
            this.imageUrl = defaultImage?.url;
            this.alternativeImages = itemUrls;
            this.categories = categories;
            this.fields = (Map<String, Object>) JSON.deserializeUntyped(
                    JSON.serialize(product)
            );
            Map<String, Imprimis_Website_Tag_Color_Coding__mdt> mapColor = Imprimis_Website_Tag_Color_Coding__mdt.getAll();
            if(product.Active_Ingredient_Class__c!=null){
                List<String> activeClasses = (prod.Active_Ingredient_Class__c).split(';');
                colors = new List<Imprimis_Website_Tag_Color_Coding__mdt>();
                for(String active: activeClasses){
                    if(mapColor.keySet().contains(active)){
                        this.colors.add(mapColor.get(active));
                    }
                    else{
                        this.colors.add(new Imprimis_Website_Tag_Color_Coding__mdt(Label=active,Color__c='#FC6BDC',Style__c='background-color:#FC6BDC;color:#fff'));
                    }
                }
            }
        }
    }
}