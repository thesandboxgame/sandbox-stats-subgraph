import {store, BigDecimal, BigInt} from '@graphprotocol/graph-ts';
import {Transfer, LandContract, Minter} from '../generated/Land/LandContract';
import {ReferralUsed, LandQuadPurchased} from '../generated/templates/LandSale/LandSaleContract';
import {Land, LandReferral, LandPurchase, UserStat, SaleUserStat, LandSaleStat, LandSaleReferralStat} from '../generated/schema';

import {LandSale} from '../generated/templates'

import {log} from '@graphprotocol/graph-ts';

let zeroAddress = '0x0000000000000000000000000000000000000000';

export function handleTransfer(event: Transfer): void {
    let contract = LandContract.bind(event.address);
    let id = `${event.address.toHexString()}_${event.params._tokenId.toString()}`;
    let land = Land.load(id);
    if (land == null) {
        land = new Land(id);
        land.timestamp = event.block.timestamp;
        land.x = getX(event.params._tokenId);
        land.y = getY(event.params._tokenId);
        let metadataURI = contract.try_tokenURI(event.params._tokenId);
        if (metadataURI.reverted) {
            log.debug('cannot get metadataURI from {}', [event.params._tokenId.toString()])
            land.tokenURI = "error";
        } else {
            land.tokenURI = metadataURI.value;
        }
    } else if (event.params._to.toHex() == zeroAddress) { //burnt
        store.remove('Land', id);
    }
    if (event.params._to.toHex() != zeroAddress) { // ignore transfer to zero
        land.owner = event.params._to;
        land.save();
    }
}

function getX(tokenId: BigInt): i32 {
    return i32(tokenId.toI32() % 408);
}

function getY(tokenId: BigInt): i32 {
    return i32(Math.floor(tokenId.toI32() / 408));
}

export function handlePurchase(event: LandQuadPurchased): void {
    let id = event.params.topCornerId.toString();
    let x = getX(event.params.topCornerId);
    let y = getY(event.params.topCornerId);
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

    let buyerStat: SaleUserStat | null
    buyerStat = SaleUserStat.load(buyerId)
    if (!buyerStat) {
        buyerStat = new SaleUserStat(buyerId)
        buyerStat.numDAILandPurchases = 0;
        buyerStat.numETHLandPurchases = 0;
        buyerStat.numETHLandGiven = 0;
        buyerStat.numDAILandGiven = 0;
    }
    if (event.params.token.toHex() == zeroAddress) {
        buyerStat.numETHLandPurchases++;
    } else {
        buyerStat.numDAILandPurchases++;
    }

    let receiverStat: SaleUserStat | null
    if (receiverId == buyerId) {
        receiverStat = buyerStat;
    } else {
        buyerStat.save();
        receiverStat = SaleUserStat.load(receiverId)
    }
    if (!receiverStat) {
        receiverStat = new SaleUserStat(receiverId)
        receiverStat.numDAILandPurchases = 0;
        receiverStat.numETHLandPurchases = 0;
        receiverStat.numETHLandGiven = 0;
        receiverStat.numDAILandGiven = 0;
    }
    if (event.params.token.toHex() == zeroAddress) {
        receiverStat.numETHLandGiven++;
    } else {
        receiverStat.numDAILandGiven++;
    }
    receiverStat.save();


    let buyerUserStat: UserStat | null
    buyerUserStat = UserStat.load(event.params.buyer.toHex())
    if (!buyerUserStat) {
        buyerUserStat = new UserStat(event.params.buyer.toHex())
        buyerUserStat.numDAILandPurchases = 0;
        buyerUserStat.numETHLandPurchases = 0;
        buyerUserStat.numETHLandGiven = 0;
        buyerUserStat.numDAILandGiven = 0;
    }
    if (event.params.token.toHex() == zeroAddress) {
        buyerUserStat.numETHLandPurchases++;
    } else {
        buyerUserStat.numDAILandPurchases++;
    }

    let receiverUserStat: UserStat | null
    if (event.params.to.toHex() == event.params.buyer.toHex()) {
        receiverUserStat = buyerUserStat;
    } else {
        buyerUserStat.save();
        receiverUserStat = UserStat.load(event.params.to.toHex())
    }
    if (!receiverUserStat) {
        receiverUserStat = new UserStat(event.params.to.toHex())
        receiverUserStat.numDAILandPurchases = 0;
        receiverUserStat.numETHLandPurchases = 0;
        receiverUserStat.numETHLandGiven = 0;
        receiverUserStat.numDAILandGiven = 0;
    }
    if (event.params.token.toHex() == zeroAddress) {
        receiverUserStat.numETHLandGiven++;
    } else {
        receiverUserStat.numDAILandGiven++;
    }
    receiverUserStat.save();

    let landSaleStat = LandSaleStat.load(event.address.toHex());
    if (!landSaleStat) {
        landSaleStat = new LandSaleStat(event.address.toHex())
        landSaleStat.numDAIPurchases = 0;
        landSaleStat.numETHPurchases = 0;
        landSaleStat.numLandsFromDAIPurchase = 0;
        landSaleStat.numLandsFromETHPurchase = 0;
        landSaleStat.numUniquePurchaser = 0;
        landSaleStat.numUniqueReceiver = 0;
        landSaleStat.numNewUniqueReceiver = 0;
        landSaleStat.numNewUniquePurchaser = 0;
        landSaleStat.num1x1Purchases = 0;
        landSaleStat.num3x3Purchases = 0;
        landSaleStat.num6x6Purchases = 0;
        landSaleStat.num12x12Purchases = 0;
        landSaleStat.num24x24Purchases = 0;
        landSaleStat.totalETHSpent = BigDecimal.fromString("0");
        landSaleStat.totalDAISpent = BigDecimal.fromString("0");
    }
    let size = event.params.size.toI32();
    let numLands = event.params.size.times(event.params.size).toI32();
    let tokenAmountPaid = BigDecimal.fromString(event.params.amountPaid.toString()).div(BigDecimal.fromString("1000000000000000000"));
    if (event.params.token.toHex() == zeroAddress) {
        landSaleStat.totalETHSpent = landSaleStat.totalETHSpent.plus(tokenAmountPaid);
        landSaleStat.numETHPurchases++;
        landSaleStat.numLandsFromETHPurchase += numLands;
    } else {
        landSaleStat.totalDAISpent = landSaleStat.totalDAISpent.plus(tokenAmountPaid);
        landSaleStat.numDAIPurchases++;
        landSaleStat.numLandsFromDAIPurchase += numLands;
    }

    if (size == 1) {
        landSaleStat.num1x1Purchases++;
    } else if (size == 3) {
        landSaleStat.num3x3Purchases++;
    } else if (size == 6) {
        landSaleStat.num6x6Purchases++;
    } else if (size == 12) {
        landSaleStat.num12x12Purchases++;
    } else if (size == 24) {
        landSaleStat.num24x24Purchases++;
    }

    if ((receiverStat.numDAILandPurchases == 1 && receiverStat.numETHLandPurchases == 0) || (receiverStat.numDAILandPurchases == 0 && receiverStat.numETHLandPurchases == 1)) {
        landSaleStat.numUniqueReceiver++;
    }

    if ((buyerStat.numDAILandPurchases == 1 && buyerStat.numETHLandPurchases == 0) || (buyerStat.numDAILandPurchases == 0 && buyerStat.numETHLandPurchases == 1)) {
        landSaleStat.numUniquePurchaser++;
    }

    if ((receiverUserStat.numDAILandPurchases == 1 && receiverUserStat.numETHLandPurchases == 0) || (receiverUserStat.numDAILandPurchases == 0 && receiverUserStat.numETHLandPurchases == 1)) {
        landSaleStat.numNewUniqueReceiver++;
    }

    if ((buyerUserStat.numDAILandPurchases == 1 && buyerUserStat.numETHLandPurchases == 0) || (buyerUserStat.numDAILandPurchases == 0 && buyerUserStat.numETHLandPurchases == 1)) {
        landSaleStat.numNewUniquePurchaser++;
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
        landSaleReferralStat.totalETHSentToReferrees = BigDecimal.fromString("0");
        landSaleReferralStat.totalDAISentToReferrees = BigDecimal.fromString("0");
    }

    let tokenAmount = BigDecimal.fromString(event.params.commission.toString()).div(BigDecimal.fromString("1000000000000000000"));
    if (event.params.token.toHex() == zeroAddress) {
        landSaleReferralStat.totalETHSentToReferrees = landSaleReferralStat.totalETHSentToReferrees.plus(tokenAmount);
    } else {
        landSaleReferralStat.totalDAISentToReferrees = landSaleReferralStat.totalDAISentToReferrees.plus(tokenAmount);
    }
    landSaleReferralStat.numReferrals++;

    landSaleReferralStat.save();
}


export function handleMinter(event: Minter): void {
    LandSale.create(event.params.superOperator);
}