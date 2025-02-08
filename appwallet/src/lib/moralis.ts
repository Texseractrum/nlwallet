import Moralis from "moralis";

export interface TokenBalance {
  token_address: string;
  name: string;
  symbol: string;
  logo?: string;
  thumbnail?: string;
  decimals: number;
  balance: string;
  possible_spam?: boolean;
  verified_contract?: boolean;
  price?: number;
  value?: number;
}

export interface Transaction {
  hash: string;
  from_address: string;
  to_address: string;
  value: string;
  gas: string;
  gas_price: string;
  block_timestamp: string;
  block_number: string;
}

export interface PortfolioDataPoint {
  date: Date;
  value: number;
}

export async function initMoralis() {
  if (!Moralis.Core.isStarted) {
    await Moralis.start({
      apiKey: process.env.NEXT_PUBLIC_MORALIS_API_KEY,
    });
  }
}

export async function getWalletBalance(address: string, chain = "0x1") {
  await initMoralis();
  
  const nativeBalance = await Moralis.EvmApi.balance.getNativeBalance({
    address,
    chain,
  });

  const tokens = await Moralis.EvmApi.token.getWalletTokenBalances({
    address,
    chain,
  });

  return {
    native: nativeBalance.result,
    tokens: tokens.result,
  };
}

export async function getWalletTransactions(address: string, chain = "0x1") {
  await initMoralis();
  
  const transactions = await Moralis.EvmApi.transaction.getWalletTransactions({
    address,
    chain,
    limit: 10,
  });

  return transactions.result;
}

export async function getTokenPrice(address: string, chain = "0x1") {
  await initMoralis();
  
  try {
    const price = await Moralis.EvmApi.token.getTokenPrice({
      address,
      chain,
    });
    return price.result;
  } catch (error) {
    console.error("Error fetching token price:", error);
    return null;
  }
}

export async function getTokenBalances(address: string) {
  const response = await Moralis.EvmApi.token.getWalletTokenBalances({
    chain: "0x1",
    address,
  });
  return response.raw;
}

export async function getHistoricalPortfolioValue(address: string) {
  try {
    // Get the dates for the last 30 days
    const dates = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date;
    }).reverse();

    // Get historical token transfers and prices
    const [transfers, nativeBalance, ethPrice] = await Promise.all([
      Moralis.EvmApi.token.getWalletTokenTransfers({
        chain: "0x1",
        address,
        fromDate: dates[0].toISOString(),
      }),
      getWalletBalance(address),
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
        .then((res) => res.json())
        .then((data) => data.ethereum.usd)
    ]);

    console.log('Native Balance:', nativeBalance);
    console.log('ETH Price:', ethPrice);

    // Calculate portfolio value for each date
    const portfolioData: PortfolioDataPoint[] = dates.map(date => ({
      date,
      value: (Number(nativeBalance.native.balance.toString()) / 1e18) * ethPrice
    }));

    return portfolioData;
  } catch (error) {
    console.error('Error in getHistoricalPortfolioValue:', error);
    return [];
  }
}