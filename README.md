## First step, have a ethereum node running

ensure you have a node running on 8545 with contract deployed to it


## then ensure you have a graph node running
setup a graph-node
```
git clone https://github.com/graphprotocol/graph-node/
cd graph-node/docker
docker-compose up
```

## finally setup your subgraph 

make sure you are in the subgraph folder, then
```
yarn
```

then generate code for graph
```
yarn codegen-graph
```

create graph
```
yarn create-local-graph
```

deploy graph
```
yarn deploy-local-graph
```

## example graphQL query
```
{
  Land {
    tokenID
    owner
    tokenURI
    x
    y
  }
}
```
