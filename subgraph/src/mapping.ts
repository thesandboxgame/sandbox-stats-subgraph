import { store, Address, Bytes, EthereumValue, BigInt } from '@graphprotocol/graph-ts';
import { Transfer, EIP721 } from '../generated/EIP721/EIP721';
import { LandSaleContract, ReferralUsed, LandQuadPurchased } from '../generated/LandSale/LandSaleContract';
import { Land, LandReferral, LandPurchase } from '../generated/schema';

import { LandSale } from '../generated/templates'
import { EthereumBlock } from '@graphprotocol/graph-ts'

import { log } from '@graphprotocol/graph-ts';

let zeroAddress = '0x0000000000000000000000000000000000000000';

export function handleTransfer(event: Transfer): void {
    // log.info('contract : {}',[event.address.toHexString()]);
    // log.info('tokenID : {}',[event.params.id.toHex()]);
    // log.info('new owner : {}',[event.params.to.toHexString()]);
    let contract = EIP721.bind(event.address);
    let id = event.params.id.toString();
    let idAsNumber = i32(parseInt(id, 10));
    let land = Land.load(id);
    if(land == null) {
        land = new Land(id);
        land.timestamp = event.block.timestamp;
        land.x = idAsNumber % 408;
        land.y = i32(Math.floor(idAsNumber / 408));
        let metadataURI = contract.try_tokenURI(event.params.id);
        land.tokenURI = metadataURI.value;
    } else if(event.params.to.toHex() == zeroAddress) { //burnt
        store.remove('Land', id);
    }
    if(event.params.to.toHex() != zeroAddress) { // ignore transfer to zero
        land.owner = event.params.to;
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


export function handleBlock(block: EthereumBlock): void {
    if (block.number.toString() == "9434370") {
        LandSale.create(Address.fromString('0xb2fb1d91325d0211b1eb39e4cf2c9f3cf14508b0'));
    }
    else if (block.number.toString() == "9048221") {
        LandSale.create(Address.fromString('0x6ce6267Fc45ABc6051aCee92BF2CC63DcC860A95'));
    }
}