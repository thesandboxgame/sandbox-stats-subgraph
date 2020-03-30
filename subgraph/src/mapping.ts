import { store, Address, Bytes, EthereumValue, BigInt } from '@graphprotocol/graph-ts';
import { Transfer, LandContract, Minter } from '../generated/Land/LandContract';
import { LandSaleContract, ReferralUsed, LandQuadPurchased } from '../generated/LandSale/LandSaleContract';
import { Land, LandReferral, LandPurchase, PurchaserStat, LandSaleStat, LandSaleReferralStat } from '../generated/schema';

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


/*

type PurchaserStat @entity {
  id: ID!
  numDAIPurchases: Int!
  numETHPurchases: Int!
}

type LandSaleStat @entity {
  id: ID!
  numDAIPurchases: Int!
  numETHPurchases: Int!
  numLandsFromDAIPurchase: Int!
  numLandsFromETHPurchase: Int!
  numUniquePurchaser: Int!
}

type LandSaleReferralStat @entity {
  id: ID!
  numDAIPurchases: Int!
  numETHPurchases: Int!
  numLandsFromDAIPurchase: Int!
  numLandsFromETHPurchase: Int!
  numUniquePurchaser: Int!
}
*/
export function handlePurchase(event: LandQuadPurchased): void {
    let id = event.params.topCornerId.toString();
    let idAsNumber = i32(parseInt(id, 10));
    let x = idAsNumber % 408;
    let y = i32(Math.floor(idAsNumber / 408));
    let purchase = new LandPurchase(id);
    purchase.contractAddress = event.address;
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

    // Stat
    let buyerId = event.address.toHex() + '_' + event.params.buyer.toHex();
    let receiverId = event.address.toHex() + '_' + event.params.to.toHex();

    let buyerStat : PurchaserStat | null
    buyerStat = PurchaserStat.load(buyerId)
    if (!buyerStat) {
        buyerStat = new PurchaserStat(buyerId)
        buyerStat.numDAILandPurchases = 0;
        buyerStat.numETHLandPurchases = 0;
        buyerStat.numETHLandGiven = 0;
        buyerStat.numDAILandGiven = 0;
    }
    if (event.params.token.toHex() == zeroAddress) {
        buyerStat.numETHLandPurchases ++;
    } else {
        buyerStat.numDAILandPurchases ++;
    }
    
    let receiverStat : PurchaserStat | null
    if (receiverId == buyerId) {
        receiverStat = buyerStat;
    } else {
        buyerStat.save();
        receiverStat = PurchaserStat.load(receiverId)
    }
    if (!receiverStat) {
        receiverStat = new PurchaserStat(receiverId)
        receiverStat.numDAILandPurchases = 0;
        receiverStat.numETHLandPurchases = 0;
        receiverStat.numETHLandGiven = 0;
        receiverStat.numDAILandGiven = 0;
    }
    if (event.params.token.toHex() == zeroAddress) {
        receiverStat.numETHLandGiven ++;
    } else {
        receiverStat.numDAILandGiven ++;
    }
    receiverStat.save();

    let landSaleStat = LandSaleStat.load(event.address.toHex());
    if (!landSaleStat) {
        landSaleStat = new LandSaleStat(event.address.toHex())
        landSaleStat.numDAIPurchases = 0;
        landSaleStat.numETHPurchases = 0;
        landSaleStat.numLandsFromDAIPurchase = 0;
        landSaleStat.numLandsFromETHPurchase = 0;
        landSaleStat.numUniquePurchaser = 0;
        landSaleStat.numUniqueReceiver = 0;
    }
    let numLandsB = event.params.size.times(event.params.size);
    let numLands = event.params.size.times(event.params.size).toI32();
    if (event.params.token.toHex() == zeroAddress) {
        let numLandsBefore = landSaleStat.numLandsFromETHPurchase;
        log.info('eth numLands {} {} {}', [event.params.size.toString(), BigInt.fromI32(numLands).toString(), numLandsB.toString()]);
        landSaleStat.numETHPurchases ++;
        landSaleStat.numLandsFromETHPurchase += numLands;
        
        let numLandsAfter = landSaleStat.numLandsFromETHPurchase;
        log.info('numLandsFromETHPurchase {} {}', [BigInt.fromI32(numLandsBefore).toString(), BigInt.fromI32(numLandsAfter).toString()]);
    } else {
        landSaleStat.numDAIPurchases ++;
        landSaleStat.numLandsFromDAIPurchase += numLands;
    }
    
    if ((receiverStat.numDAILandPurchases == 1 && receiverStat.numETHLandPurchases == 0) || (receiverStat.numDAILandPurchases == 0 && receiverStat.numETHLandPurchases == 1)) {
        landSaleStat.numUniqueReceiver ++;
    }

    if ((buyerStat.numDAILandPurchases == 1 && buyerStat.numETHLandPurchases == 0) || (buyerStat.numDAILandPurchases == 0 && buyerStat.numETHLandPurchases == 1)) {
        landSaleStat.numUniquePurchaser ++;
    }
    
    landSaleStat.save();
}

export function handleReferral(event: ReferralUsed): void {
    let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
    let referral = new LandReferral(id)
    referral.contractAddress = event.address;
    referral.referrer = event.params.referrer;
    referral.referee = event.params.referee;
    referral.tokenAddress = event.params.token;
    referral.amount = event.params.amount;
    referral.commission = event.params.commission;
    referral.commissionRate = event.params.commissionRate;
    referral.save();

    let landSaleReferralStat = LandSaleReferralStat.load(event.address.toHex());
    if (!landSaleReferralStat) {
        landSaleReferralStat = new LandSaleReferralStat(event.address.toHex())
        landSaleReferralStat.numReferrals = 0;
    }
    landSaleReferralStat.numReferrals ++;
    landSaleReferralStat.save();
}


export function handleMinter(event: Minter): void {
    LandSale.create(event.params.superOperator);
}