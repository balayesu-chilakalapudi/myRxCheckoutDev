import { LightningElement,api } from 'lwc';

export default class CheckoutSectionDev extends LightningElement {
    @api stepNumber;
    @api stepTitle;

    @api allowOverflow;

    get boxClass() {
      return !this.allowOverflow ? 'slds-box overflow-hidden' : 'slds-box';
    }

    get captionStyle() {
      return this.stepNumber ? 'hello122' : 'line-height: 54px;';
    }

}