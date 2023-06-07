import { useEffect, useState } from "react";
import { useAccount, useNetwork, useBalance, useQuery } from "wagmi";
import { formatUnits } from "viem";
import {
  useErc20Decimals,
  useErc20Symbol,
  useFairAuctionGetRemainingTime,
  useFairAuctionHasEnded,
  useFairAuctionHasStarted,
  useFairAuctionMaxProjectTokensToDistribute,
  useFairAuctionMaxRaise,
  useFairAuctionMinTotalRaisedForMaxProjectToken,
  useFairAuctionProjectToken,
  useFairAuctionSaleToken,
  useFairAuctionTotalRaised,
} from "../generated/wagmiGen";

const SECOND = 1_000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

export const useTimeAndPrice = (
  saleTokenDecimals: number | undefined,
  projectTokenDecimals: number | undefined
) => {
  const { data: totalRaised } = useFairAuctionTotalRaised({
    enabled: !!saleTokenDecimals,
    watch: true,
  });
  const { data: hasStarted } = useFairAuctionHasStarted();
  const { data: hasEnded } = useFairAuctionHasEnded();
  const { data: tokensToDistribute } =
    useFairAuctionMaxProjectTokensToDistribute();
  const { data: minSaleTokensToRaise } =
    useFairAuctionMinTotalRaisedForMaxProjectToken();
  const { data: maxRaiseAmount } = useFairAuctionMaxRaise();

  if (
    totalRaised === undefined ||
    !tokensToDistribute ||
    !minSaleTokensToRaise ||
    !maxRaiseAmount ||
    !saleTokenDecimals ||
    !projectTokenDecimals
  ) {
    return {
      hasEnded,
      hasStarted,
      tokenPrice: undefined,
    };
  }

  const minRaise = formatUnits(minSaleTokensToRaise, saleTokenDecimals);
  const maxRaise = formatUnits(maxRaiseAmount, saleTokenDecimals);
  const totalRaiseFormatted = formatUnits(totalRaised, saleTokenDecimals);
  const tokensToDistributeFormatted = formatUnits(
    tokensToDistribute,
    projectTokenDecimals
  );

  const tokenPrice =
    totalRaised <= minSaleTokensToRaise
      ? Number(minRaise) / Number(tokensToDistributeFormatted)
      : Number(totalRaiseFormatted) / Number(tokensToDistributeFormatted);

  const reachedMaxRaise = totalRaised >= maxRaiseAmount;

  return {
    hasEnded: hasEnded || reachedMaxRaise,
    hasStarted,
    tokenPrice,
    minRaise,
    maxRaise,
  };
};

export const useSaleTokenData = () => {
  const { address } = useAccount();
  const { data: saleTokenAddress } = useFairAuctionSaleToken();
  const { data: saleTokenSymbol } = useErc20Symbol({
    address: saleTokenAddress,
    enabled: !!saleTokenAddress,
  });
  const { data: saleTokenDecimals } = useErc20Decimals({
    address: saleTokenAddress,
    enabled: !!saleTokenAddress,
  });
  const { data: saleTokenBalance } = useBalance({
    address,
    token: saleTokenAddress,
    watch: true,
  });
  return {
    saleTokenAddress,
    saleTokenSymbol,
    saleTokenDecimals,
    saleTokenBalance,
  };
};

export const useProjectTokenData = () => {
  const { data: projectTokenAddress } = useFairAuctionProjectToken();
  const { data: projectTokenSymbol } = useErc20Symbol({
    address: projectTokenAddress,
    enabled: !!projectTokenAddress,
  });
  const { data: projectTokenDecimals } = useErc20Decimals({
    address: projectTokenAddress,
    enabled: !!projectTokenAddress,
  });

  return {
    projectTokenAddress,
    projectTokenSymbol,
    projectTokenDecimals,
  };
};

export function useTimer() {
  const { data: _deadline } = useFairAuctionGetRemainingTime();

  const deadline = _deadline ? Number(_deadline) : 0;
  const [timeLeft, setTimeLeft] = useState(deadline * 1000);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeLeft((prev) => prev - SECOND);
    }, SECOND);

    return () => {
      clearInterval(intervalId);
    };
  }, [deadline]);

  return timeLeft > 0
    ? {
        days: Math.floor(timeLeft / DAY),
        hours: Math.floor((timeLeft / HOUR) % 24),
        minutes: Math.floor((timeLeft / MINUTE) % 60),
        seconds: Math.floor((timeLeft / SECOND) % 60),
      }
    : {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
      };
}