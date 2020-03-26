import { store, Address, Bytes, EthereumValue } from '@graphprotocol/graph-ts';
import { Transfer, EIP721 } from '../generated/EIP721/EIP721';
import { Land } from '../generated/schema';

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
        land.mintTime = event.block.timestamp;
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
