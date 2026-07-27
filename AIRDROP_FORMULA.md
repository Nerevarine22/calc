# Variational Airdrop Formula

The calculator estimates a possible airdrop value from a user's share of total
Variational points, the selected supply percentage allocated to the airdrop,
and the selected FDV.

Current assumptions:

```text
totalPoints = 9,000,000
totalSupply = 1,000,000,000
maxAirdropPct = 50
maxFDV = 2,000,000,000
```

Formula:

```text
airdropSupply = totalSupply * (airdropPct / 100)
tokenPrice = FDV / totalSupply

share = yourPoints / totalPoints
estimatedTokens = share * airdropSupply
expectedValue = estimatedTokens * tokenPrice
```

Simplified:

```text
expectedValue =
(yourPoints / totalPoints)
* (airdropPct / 100)
* FDV
```

Example:

```text
yourPoints = 10,000
totalPoints = 9,000,000
airdropPct = 10
FDV = 500,000,000

expectedValue =
(10,000 / 9,000,000)
* 0.10
* 500,000,000

expectedValue ~= $55,555.56
```
