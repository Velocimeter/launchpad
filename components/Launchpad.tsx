import { useState } from "react";
import Image from "next/image";
import { useAccount, useNetwork, useWaitForTransaction } from "wagmi";
import * as Toast from "@radix-ui/react-toast";
import { formatUnits, parseUnits, zeroAddress } from "viem";
import { useAddRecentTransaction } from "@rainbow-me/rainbowkit";

import {
  useErc20Allowance,
  useErc20Approve,
  useFairAuctionBuy,
  useFairAuctionClaim,
  useFairAuctionGetExpectedClaimAmount,
  useFairAuctionTotalRaised,
  useFairAuctionUserInfo,
  usePrepareErc20Approve,
  usePrepareFairAuctionBuy,
  usePrepareFairAuctionClaim,
} from "../lib/generated/wagmiGen";
import { fairAuctionContractAddresses } from "../lib/config";
import {
  useProjectTokenData,
  useSaleTokenData,
  useTimeAndPrice,
  useTimer,
} from "../lib/hooks/launchpad";
import { formatCurrency, isEnoughAllowance, isValidInput } from "../lib/utils";

export function Launchpad() {
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastHash, setToastHash] = useState<`0x${string}`>();

  const [amount, setAmount] = useState("");

  const addRecentTransaction = useAddRecentTransaction();

  const { address } = useAccount();
  const { chain } = useNetwork();

  const {
    saleTokenAddress,
    saleTokenDecimals,
    saleTokenSymbol,
    saleTokenBalance,
  } = useSaleTokenData();
  const { projectTokenSymbol, projectTokenDecimals } = useProjectTokenData();

  const {
    data: allowance,
    isFetching: isFetchingAllowance,
    refetch: refetchAllowance,
  } = useErc20Allowance({
    address: saleTokenAddress,
    args: [address!, fairAuctionContractAddresses[chain?.id as 7700]],
    enabled: !!address && !chain?.unsupported,
    select: (allowanceValue) => ({
      value: allowanceValue,
      needsApproval: !isEnoughAllowance(
        allowanceValue,
        saleTokenDecimals,
        amount as `${number}`
      ),
    }),
  });

  const { data: totalRaised } = useFairAuctionTotalRaised({
    enabled: !chain?.unsupported && !!saleTokenDecimals,
    select: (data) => formatUnits(data, saleTokenDecimals!),
    watch: true,
  });

  const { data: userInfo, refetch: refetchUserInfo } = useFairAuctionUserInfo({
    enabled:
      !!address &&
      !chain?.unsupported &&
      !!projectTokenDecimals &&
      !!saleTokenDecimals,
    args: [address!],
    select([, contribution, , , , , , hasClaimed]) {
      return {
        spent: formatUnits(contribution, saleTokenDecimals!),
        hasClaimed,
      };
    },
  });

  const { data: expectedClaimAmount, refetch: refetchClaimAmount } =
    useFairAuctionGetExpectedClaimAmount({
      enabled: !!address && !chain?.unsupported && !!projectTokenDecimals,
      args: [address!],
      select: (data) => formatUnits(data, projectTokenDecimals!),
    });

  const { hasEnded, hasStarted, tokenPrice, maxRaise, minRaise } =
    useTimeAndPrice(saleTokenDecimals, projectTokenDecimals);
  const { days, hours, minutes } = useTimer();

  const { config: approveConfig } = usePrepareErc20Approve({
    address: saleTokenAddress,
    enabled:
      isValidInput(amount) &&
      !!address &&
      !chain?.unsupported &&
      !!saleTokenDecimals &&
      allowance?.needsApproval &&
      hasStarted &&
      !hasEnded,
    args: [
      fairAuctionContractAddresses[chain?.id as 7700],
      isValidInput(amount)
        ? parseUnits(amount as `${number}`, saleTokenDecimals!)
        : 0n,
    ],
  });
  const {
    write: approve,
    isLoading: isApproving,
    data: approveTx,
  } = useErc20Approve({
    ...approveConfig,
    onSuccess(data) {
      setToastOpen(true);
      setToastMessage("Approval successfully submitted");
      setToastHash(data.hash);
      addRecentTransaction({
        hash: data.hash,
        description: "Approval tx",
      });
    },
  });
  const { isFetching: isWaitingForApproveTx } = useWaitForTransaction({
    hash: approveTx?.hash,
    onSuccess: () => {
      refetchAllowance();
    },
  });

  const { config: buyConfig } = usePrepareFairAuctionBuy({
    args: [
      isValidInput(amount)
        ? parseUnits(amount as `${number}`, saleTokenDecimals!)
        : 0n,
      zeroAddress,
    ],
    enabled:
      !!address &&
      !chain?.unsupported &&
      isValidInput(amount) &&
      hasStarted &&
      !hasEnded &&
      allowance &&
      !allowance.needsApproval,
  });
  const {
    write: buy,
    isLoading: isBuying,
    data: buyTx,
  } = useFairAuctionBuy({
    ...buyConfig,
    onSuccess(data) {
      setToastOpen(true);
      setToastMessage("Buy successfully submitted");
      setToastHash(data.hash);
      addRecentTransaction({
        hash: data.hash,
        description: "Buy tx",
      });
    },
  });
  const { isFetching: isWaitingForBuyTx } = useWaitForTransaction({
    hash: buyTx?.hash,
    onSuccess: () => {
      refetchAllowance();
      refetchUserInfo();
      refetchClaimAmount();
    },
  });

  const { config: claimConfig } = usePrepareFairAuctionClaim({
    enabled: !!address && !chain?.unsupported && hasEnded,
  });
  const {
    write: claim,
    isLoading: isClaiming,
    data: claimTx,
  } = useFairAuctionClaim({
    ...claimConfig,
    onSuccess(data) {
      setToastOpen(true);
      setToastMessage("Claim successfully submitted");
      setToastHash(data.hash);
      addRecentTransaction({
        hash: data.hash,
        description: "Claim tx",
      });
    },
  });
  const { isFetching: isWaitingForClaimTx } = useWaitForTransaction({
    hash: claimTx?.hash,
    onSuccess: () => {
      refetchUserInfo();
      refetchClaimAmount();
    },
  });

  const setMaxAmount = () => {
    if (saleTokenBalance) {
      setAmount(saleTokenBalance.formatted);
    }
  };

  const isWaitingForTx =
    isWaitingForApproveTx || isWaitingForBuyTx || isWaitingForClaimTx;
  return (
    <>
      <div className="relative mt-14 flex flex-col gap-6 sm:flex-row lg:min-w-[1024px] lg:flex-col">
        <div className="mb-4 grid w-full grid-cols-2 flex-col items-start justify-between gap-4 text-sm sm:flex sm:text-base lg:flex-row lg:items-center">
          <div className="flex flex-col gap-1">
            <div className="text-secondary">Total raised</div>
            <div>
              {formatCurrency(totalRaised)} {saleTokenSymbol ?? "USDC"}
            </div>
          </div>
          {/* <div className="flex flex-col gap-1">
            <div className="capitalize">
              {projectTokenSymbol ?? "DMT"} price
            </div>
            <div>
              {formatCurrency(tokenPrice?.toString())}{" "}
              {saleTokenSymbol ?? "USDC"}
            </div>
          </div> */}
          <div className="flex flex-col gap-1">
            <div className="text-secondary">Remaining time</div>
            <div>{`${days}d ${hours}h ${minutes}m`}</div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-secondary">Floor price</div>
            <div>
              {formatCurrency(minRaise)} {saleTokenSymbol}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-secondary">Max raise</div>
            <div>
              {formatCurrency(maxRaise)} {saleTokenSymbol}
            </div>
          </div>
        </div>
        <div className="z-10 flex w-full flex-col items-center justify-between gap-4 lg:flex-row">
          <div className="flex w-full flex-grow-[0.3] flex-col gap-2 sm:w-auto">
            <div className="relative">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full rounded border-none bg-transparent p-4 text-left text-base outline outline-1 outline-secondary ${
                  !isValidInput(amount) && amount !== ""
                    ? "text-error focus:outline-error focus-visible:outline-error"
                    : "focus:outline-primary focus-visible:outline-primary"
                }`}
                placeholder={`0.00 ${saleTokenSymbol ?? "USDC"}`}
              />
              <button
                className="absolute right-3 top-1 text-xs text-primary"
                onClick={() => setMaxAmount()}
              >
                MAX
              </button>
              <div className="absolute bottom-1 right-3 text-xs text-primary">
                Balance: {formatCurrency(saleTokenBalance?.formatted)}{" "}
                {saleTokenSymbol ?? "USDC"}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>Spent</div>
              <div>
                {formatCurrency(userInfo?.spent)} {saleTokenSymbol ?? "USDC"}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>Allocation</div>
              <div>
                {formatCurrency(expectedClaimAmount)}{" "}
                {projectTokenSymbol ?? "DMT"}
              </div>
            </div>
            <button
              disabled={
                isFetchingAllowance ||
                isWaitingForTx ||
                userInfo?.hasClaimed ||
                !allowance ||
                (hasEnded
                  ? !claim || isClaiming
                  : allowance?.needsApproval
                  ? !approve || isApproving
                  : !buy || isBuying)
              }
              onClick={
                hasEnded
                  ? () => claim?.()
                  : allowance?.needsApproval
                  ? () => approve?.()
                  : () => buy?.()
              }
              className="flex h-14 w-full items-center justify-center rounded border border-transparent bg-primary p-5 text-center font-medium uppercase text-extendedBlack transition-colors hover:bg-secondary focus-visible:outline-primary disabled:bg-slate-400 disabled:opacity-60"
            >
              {isWaitingForTx
                ? "Loading..."
                : hasEnded
                ? "Claim"
                : allowance?.needsApproval
                ? "Approve"
                : "Deposit"}
            </button>
          </div>
          <div className="flex flex-grow-[0.3] flex-col items-center gap-4">
            <Image
              alt="Cadence"
              src="/cadence_logo.svg"
              width={200}
              height={200}
              layout="fixed"
            />
          </div>
        </div>
        <div className="absolute -bottom-1/2">
          <CadenceAnimation />
        </div>
        <div className="absolute -bottom-1/2 h-[80px] w-full rounded-full bg-primary opacity-50 outline-2 outline-[#333] blur-3xl" />
      </div>
      <Toast.Root
        className="rounded-md bg-[#111] p-4 text-left shadow shadow-secondary radix-state-closed:animate-hide radix-state-open:animate-slideIn radix-swipe-cancel:translate-x-0 radix-swipe-cancel:transition-[transform_200ms_ease-out] radix-swipe-end:animate-swipeOut radix-swipe-move:translate-x-[var(--radix-toast-swipe-move-x)]"
        open={toastOpen}
        onOpenChange={setToastOpen}
      >
        <Toast.Title asChild>
          <h2 className="text-success">Success!</h2>
        </Toast.Title>
        <Toast.Description asChild>
          <p className="text-primary">{toastMessage}</p>
        </Toast.Description>
        <Toast.Action
          className="[grid-area:_action]"
          asChild
          altText="Look on arbiscan with hash"
        >
          <a
            href={`https://arbiscan.io/tx/${toastHash}`}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm text-secondary underline transition-colors hover:text-primary hover:no-underline"
          >
            Look on explorer
          </a>
        </Toast.Action>
      </Toast.Root>
      <Toast.Viewport className="fixed bottom-0 right-0 z-[2147483647] m-0 flex w-[390px] max-w-[100vw] list-none flex-col gap-3 p-6 outline-none" />
    </>
  );
}

function CadenceAnimation() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="2067"
      height="499"
      viewBox="0 0 2067 499"
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <clipPath id="__lottie_element_29">
          <path d="M0 0H2067V499H0z"></path>
        </clipPath>
        <clipPath id="__lottie_element_31">
          <path d="M0 0h2067v516H0z"></path>
        </clipPath>
        <clipPath id="__lottie_element_35">
          <path d="M0 0h2067v514H0z"></path>
        </clipPath>
      </defs>
      <g clipPath="url(#__lottie_element_29)">
        <g
          clipPath="url(#__lottie_element_31)"
          display="block"
          transform="translate(0 -8.5)"
        >
          <g
            clipPath="url(#__lottie_element_35)"
            display="block"
            transform="translate(0 1)"
          >
            <path
              fill="none"
              stroke="#6D6E71"
              d="M-408.5-260s-66.603 56.291-125.5 85.5C-595.5-144-695.5-68-730.5-28c-47.307 54.065-141 152-175 184-52.562 49.47-120 105-120 105M420.5-258s30.5 27.25 69.75 32.5c31 0 92.25 3 118.75 12.25s50.5 20.5 67 35.75S726.5-125 753.5-79s97 173 153 224c41 42 124 115 124 115"
              display="block"
              transform="translate(1033.5 257)"
            ></path>
            <path
              fill="none"
              stroke="#6D6E71"
              d="M-932.5 260s148-142 202-216c31.486-43.147 94-126 172-176 68-42 153-91 185-125M379-258s38.75 31.25 78.75 35.75c30 .75 88.5 0 88.5 0S585.5-220 607-206s43.5 34 59.5 64c18 30 134 248 159 277 20 30 97 117 115 124"
              display="block"
              transform="translate(1033.5 257)"
            ></path>
            <path
              fill="none"
              stroke="#6D6E71"
              d="M-837.5 259S-750 160.5-736 142-606.5-37-593.5-53s46.5-49 95.5-81.5C-457-159-372-212-336-256"
              display="block"
              transform="translate(1033.5 257)"
            ></path>
            <path
              fill="none"
              stroke="#6D6E71"
              d="M-744.5 257s99-125 164-234c55-85 55.5-103 172.5-173.5 53-37 95.5-89 110-108M-654.5 263s111-163 134-223c25-43 51-96 102-129 37-27 105-91 125.5-124.5 18-25 38-50.5 38-50.5M-557.5 260S-454 63-434.5 30c14-22 41.5-71.5 78.5-99.5 21.5-21 76.5-87.5 90-117.5 15-21.5 48-77 48-77M-467.5 271s55.944-123.36 80-170c24.5-47.5 63-103.5 91-145.5 20.5-31 71.5-128.5 83-155 15-30 30-63 30-63M-375.5 273S-332 168-322 147s28-54.5 38.5-72 23-43 32.5-61 56.5-138 65.5-165 39-112 39-112M-279.5 271s34-111 53-141 37-77 45-103 25-91.5 31-120.5 27-102.5 28-109.5 10-50 13-56M-183.5 267s11.5-76.5 33-116c15-31.5 24.5-62 29.5-87.5S-99.5-79-97.5-89-76-242.5-73-259M-91.5 260s9.5-72.5 14.25-86.5S-63 118.75-61.5 104.75-55.5 48-55 28s9.5-159 10.5-163 9-126 9-126M6.5 263S3 79.5 3.5 65.5 3.5-57 3.5-57 2-175.5 2-176s2-85 2-85M95 255.5s-10-68-11-76-10-31.5-11-36-10-62-10.5-80.5S53-81.5 53-81.5L47-172l-6-86M189.5 259s-22-85-26.5-99-35.5-83-44.5-148c-6-47-13.5-98-15.5-112.5S77-260 77-260M282.5 257s-30.5-89.5-37-110.5S200 38.5 190 8.5s-31-101-36.5-122.5S123-226.5 121-235.5s-6.5-25.5-6.5-25.5M378.5 259S349 186.5 326 118.5c-25-63.5-59-149-92.5-194-18.5-33.5-36-60-49-100-15-39.5-32-85.5-32-85.5M470.5 256s-43-94-63-165c-19-47-61-153-85-182-19-22-53.5-40-60.5-49s-39.5-50-47.5-70-23.5-46.5-25-50M560.5 257s-36-66-65-165c-30-80-68-201-107-238-27-16-42.25-8.25-58-15.25-12-2.5-25.5-6.5-42.25-21C280-189 270.5-196.75 260-211.5s-32-46-32-46.25"
              display="block"
              transform="translate(1033.5 257)"
            ></path>
            <path
              fill="none"
              stroke="#6D6E71"
              d="M660.5 261s-46-54-104-218c-52-148-69-197-107-233-23-14-40.75 1.25-54.25-2-10.25 2-42.75 7.25-58.5-2.25C329-197 305-210 291-227.75 277.75-242 265.5-258 265.5-258"
              display="block"
              transform="translate(1033.5 257)"
            ></path>
            <path
              fill="none"
              stroke="#6D6E71"
              d="M748.5 255s-56-65-94-166c-40-87-101-242-118-269s-34.75-45-68.75-38c-28.5 4-33 7.25-40.75 7.25-7.75 1-35.75 7.5-47.75 2.75-8.75-1.25-32.75-9.25-46.25-21s-31.75-30.25-31.75-30.25"
              display="block"
              transform="translate(1033.5 257)"
            ></path>
            <path
              fill="none"
              stroke="#6D6E71"
              d="M844.5 257s-77-74-134.5-199.5c-40-76-89.5-207-109.5-226-18-26-34.25-52-63.5-51.75s-80.25-1.5-100.25 3c-20-.5-30.25 1.25-41-4.25-8.75-3.75-30.25-15.25-35-19.5s-17.25-13.25-21.5-18.75"
              display="block"
              transform="translate(1033.5 257)"
            ></path>
          </g>
          <path
            fill="none"
            stroke="#6D6E71"
            d="M-425.527-246.088l127.111.383 224 .883 275.766-.416 180.35-3.115 52.779-.567"
            display="block"
            opacity="0.5"
            transform="translate(1033.5 258)"
          ></path>
          <path
            fill="none"
            stroke="#6D6E71"
            d="M-448.678-227.805l133.213 2.45s193.679 6.64 242.673 6.073c54.667-.632 226.714.974 279.39-4.124 33.28-3.22 179.101-10.598 179.101-10.598l69.696-2.7"
            display="block"
            transform="translate(1033.5 258)"
          ></path>
          <path
            fill="none"
            stroke="#6D6E71"
            d="M-473.527-210.371l181.46 9.814 170.266 11.249L5.832-187.26s125.982-1.597 170.482-7.097c33.434-5.616 225.735-29.196 226.235-29.196s73.514-5.898 73.514-5.898"
            display="block"
            transform="translate(1033.5 258)"
          ></path>
          <path
            fill="none"
            stroke="#6D6E71"
            d="M-506.908-189.389s151.738 2.686 231.43 20.164c63.615 6.284 207.363 25.713 252.61 20.514 37.815 1.416 173.659.65 292.368-38.678 75.266-16.664 208.496-42.111 222.996-39.111"
            display="block"
            transform="translate(1033.5 258)"
          ></path>
          <path
            fill="none"
            stroke="#6D6E71"
            d="M-543.373-167.889s126.412-2.433 201.744 18.748c79.5 12 213.014 44.112 247.014 44.112 39.88 4.133 160.004 18.58 293.695-33.545 112.63-42.732 125.451-45.78 142.885-51.195 17.56-5.465 61.026-19.39 78.026-22.89 17-3.5 69.509-12.841 75.009-12.841"
            display="block"
            transform="translate(1033.5 258)"
          ></path>
          <path
            fill="none"
            stroke="#6D6E71"
            d="M-584.59-143.273s123.727-6.55 175.66 10.066c44.5 8 99.364 25.297 111.864 28.297S-214.5-79.18-199-75.68s82.43 21.598 102.346 24.665c18.451 2.822 80.95 9.632 116.482 7.5 30.958-1.781 100.542-21.23 136.031-37.727 34.102-15.682 85.584-42.152 109.403-54.496 24.15-12.549 77.865-39.951 93.468-47.797 15.368-7.7 57.77-25.7 73.903-29.483 21.927-5.146 80.223-12.964 94.254-10.566"
            display="block"
            transform="translate(1033.5 258)"
          ></path>
          <path
            fill="none"
            stroke="#6D6E71"
            d="M-628.964-113.104s124.963-19.406 233.853 12.814C-324.555-79.115-150.45-2.11-60.373 14.456 6.941 24.116 80.445 12.92 165.794-40.61c70.55-43.583 202.48-139.833 248.186-157.507 46.213-17.93 150.116-26.815 237.344 2.99"
            display="block"
            transform="translate(1033.5 258)"
          ></path>
          <path
            fill="none"
            stroke="#6D6E71"
            d="M-694.337-62.861s179.776-31.979 269.153-3.063c59.88 15.451 239.707 109.23 286.203 123.797 61.506 18.814 163.39 87.629 334.621-62.895 127.734-101.681 195.938-171.5 287.438-193 32.5-5.5 97.309-11.236 223.56 53.075"
            display="block"
            transform="translate(1033.5 258)"
          ></path>
          <path
            fill="none"
            stroke="#6D6E71"
            d="M-770.68 16.844s243.046-48.52 362.754-10.629C-288.896 42.18-140.422 139.293-17.324 141.09c63.375 7.38 125.817-9.877 274.162-123.3C367.75-63.282 446.926-116.997 521.21-116.448c42 0 150.676 24.714 259.092 82.917"
            display="block"
            transform="translate(1033.5 258)"
          ></path>
          <path
            fill="none"
            stroke="#6D6E71"
            d="M-857.751 107.95s243.703-15.877 268.645-18.07c28.964-2.633 162.554-8.65 246.722 17.72 91.041 19.77 222.742 58.268 272.742 60.268 50.532 5.035 120.948 15.77 233.228-25.304C302.615 88.679 446.095 19.35 552.644 26.466c55.699.168 133.452 19.424 307.948 65.069M-965.412 210.267s449.032-2.672 494.032-3.672 205.266 6.539 254.93 10.007c29.856 2.332 261.625 21.655 398.734 1.602 133.364-14.441 334.118-37.828 541.188-21.75 170.69 12.421 254.95 15.078 254.95 15.078"
            display="block"
            transform="translate(1033.5 258)"
          ></path>
        </g>
      </g>
    </svg>
  );
}