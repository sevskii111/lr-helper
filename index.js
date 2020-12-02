const fs = require("fs"),
  firstFollow = require("first-follow");

const grammar = fs.readFileSync("grammar.txt", "utf-8");
const grammarLines = grammar.split("\n").map((l) => l.trim());

let rules = {};
let firstNonterminal = null;
let symbols = new Set(["∇"]);
let terminals = new Set(["\x00"]);

for (const line of grammarLines) {
  const parts = line.split("->");
  const left = parts[0].trim();
  if (!firstNonterminal) {
    firstNonterminal = left;
  }
  if (!rules[left]) {
    rules[left] = [];
  }
  rules[left].push(parts[1].trim().split(" "));
}

let formalRules = [];

for (const left in rules) {
  for (const rule of rules[left]) {
    symbols.add(left);
    for (const s of rule) {
      symbols.add(s);
    }
    formalRules.push({ left, right: rule });
  }
}

function isNonTerminal(symbol) {
  return !symbol.match(/^[A-Z_∇]+$/);
}

for (const symbol of symbols) {
  if (isNonTerminal(symbol)) {
    terminals.add(symbol);
  }
}

const { firstSets, followSets } = firstFollow(formalRules);

let result = {};

for (const symbol of symbols) {
  result[symbol] = {};
  for (const rule in rules) {
    for (const r of rules[rule]) {
      let index = -1;
      while (true) {
        index = r.indexOf(symbol, index + 1);
        if (index == -1 || index == r.length - 1) {
          break;
        }
        let b = r[index + 1];
        if (firstSets[b]) {
          for (const f of firstSets[b]) result[symbol][f] = "shift";
        } else {
          result[symbol][b] = "shift";
        }
      }
    }
  }
}

result["∇"] = {};
for (const b of firstSets[firstNonterminal]) {
  result["∇"][b] = "shift";
}

for (const symbol of symbols) {
  for (const rule in rules) {
    for (const r of rules[rule]) {
      if (r[r.length - 1] == symbol) {
        for (const b of followSets[rule]) {
          if (result[symbol][b] == "shift") {
            console.log("Too bad! " + symbol + " " + b);
            result[symbol][b] = "Too bad!";
          } else if (result[symbol][b] != "Too bad!") {
            result[symbol][b] = "reduce";
          }
        }
      }
    }
  }
}

result[firstNonterminal]["\x00"] = "reduce";

let symbolsArr = [...symbols];

function sortFunction(a, b) {
  if (a == "∇") {
    return 1;
  } else if (b == "∇") {
    return -1;
  }
  if (a == "\x00") {
    return 1;
  } else if (b == "\x00") {
    return -1;
  } else if (isNonTerminal(a) && isNonTerminal(b)) {
    return symbolsArr.indexOf(a) - symbolsArr.indexOf(b);
  } else if (isNonTerminal(a)) {
    return 1;
  } else if (isNonTerminal(b)) {
    return -1;
  } else {
    return symbolsArr.indexOf(a) - symbolsArr.indexOf(b);
  }
}

const sortedSymbols = [...symbols].sort(sortFunction);
const sortedTerminals = [...terminals].sort(sortFunction);

let resultStr = ",";

resultStr += sortedTerminals.join(",");
resultStr += "\n";
for (const symbol of sortedSymbols) {
  resultStr += symbol + ",";
  resultStr += sortedTerminals.map((t) => result[symbol][t]).join(",");
  resultStr += "\n";
}

fs.writeFileSync(
  "control_table.csv",
  resultStr.replace("\x00", "-|").replace("∇", "nabla")
);
