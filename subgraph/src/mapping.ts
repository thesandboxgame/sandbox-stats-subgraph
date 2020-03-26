import { store, Address, Bytes, EthereumValue, BigInt } from '@graphprotocol/graph-ts';
import { Transfer, LandContract, Minter } from '../generated/Land/LandContract';
import { LandSaleContract, ReferralUsed, LandQuadPurchased } from '../generated/LandSale/LandSaleContract';
import { Land, LandReferral, LandPurchase } from '../generated/schema';

import { LandSale } from '../generated/templates'

import { log } from '@graphprotocol/graph-ts';

let zeroAddress = '0x0000000000000000000000000000000000000000';

export function handleTransfer(event: Transfer): void {
    // log.info('contract : {}',[event.address.toHexString()]);
    // log.info('tokenID : {}',[event.params.id.toHex()]);
    // log.info('new owner : {}',[event.params.to.toHexString()]);
    let contract = LandContract.bind(event.address);
    let id = event.params._tokenId.toString();
    let idAsNumber = i32(parseInt(id, 10));
    let land = Land.load(id);
    if(land == null) {
        land = new Land(id);
        land.timestamp = event.block.timestamp;
        land.x = idAsNumber % 408;
        land.y = i32(Math.floor(idAsNumber / 408));
        let metadataURI = contract.try_tokenURI(event.params._tokenId);
        land.tokenURI = metadataURI.value;
    } else if(event.params._to.toHex() == zeroAddress) { //burnt
        store.remove('Land', id);
    }
    if(event.params._to.toHex() != zeroAddress) { // ignore transfer to zero
        land.owner = event.params._to;
        land.save();
    }
}


export function handlePurchase(event: LandQuadPurchased): void {
    let id = event.params.topCornerId.toString();
    let idAsNumber = i32(parseInt(id, 10));
    let x = idAsNumber % 408;
    let y = i32(Math.floor(idAsNumber / 408));
    let purchase = new LandPurchase(id);
    purchase.topLeftX = x;
    purchase.topLeftY = y;
    purchase.buyer = event.params.buyer;
    purchase.to = event.params.to;
    purchase.size = event.params.size;
    purchase.price = event.params.price;
    purchase.tokenAddress = event.params.token;
    purchase.amountPaid = event.params.amountPaid;
    purchase.timestamp = event.block.timestamp;
    purchase.save();
}

export function handleReferral(event: ReferralUsed): void {
    let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
    let referral = new LandReferral(id)
    referral.referrer = event.params.referrer;
    referral.referee = event.params.referee;
    referral.tokenAddress = event.params.token;
    referral.amount = event.params.amount;
    referral.commission = event.params.commission;
    referral.commissionRate = event.params.commissionRate;
    referral.save();
}


export function handleMinter(event: Minter): void {
    LandSale.create(event.params.superOperator);
}