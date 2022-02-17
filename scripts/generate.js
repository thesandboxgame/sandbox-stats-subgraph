const fs = require("fs-extra");
const path = require("path");
const Handlebars = require("handlebars");

const args = process.argv.slice(2);
const chainName = args[0];
const pathArg = `./contractsInfo.${chainName}.json`;

console.log({ pathArg, chainName });

if (!pathArg) {
  console.error(`please provide the path to contracts info, either a directory of deployemnt or a single export file`);
}
if (!fs.existsSync(pathArg)) {
  console.error(`file ${pathArg} doest not exits`);
}

const stat = fs.statSync(pathArg);
let contractInfo;
if (stat.isDirectory()) {
  contractsInfo = {
    contracts: {

    },
    chainName
  };
  const files = fs.readdirSync(pathArg, { withFileTypes: true });
  for (const file of files) {
    if (!file.isDirectory() && file.name.substr(file.name.length - 5) === ".json") {
      const contractName = file.name.substr(0, file.name.length - 5);
      contractsInfo.contracts[contractName] = JSON.parse(fs.readFileSync(path.join(pathArg, file.name)).toString());
    }
  }
} else {
  contractsInfo = JSON.parse(fs.readFileSync(pathArg).toString());
  contractsInfo.chainName = chainName;
}

const contracts = contractsInfo.contracts;
fs.emptyDirSync("./abis");
for (const contractName of Object.keys(contracts)) {
  const contractInfo = contracts[contractName];
  fs.writeFileSync(path.join("abis", contractName + ".json"), JSON.stringify(contractInfo.abi));
}

const template = Handlebars.compile(fs.readFileSync("./templates/subgraph.yaml").toString());
const result = template(contractsInfo);
fs.writeFileSync("./subgraph.yaml", result);
