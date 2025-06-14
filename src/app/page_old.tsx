"use client";
import { use, useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {parseAbi, createWalletClient, createPublicClient, custom} from 'viem'
import { avalancheFuji } from "viem/chains";
export default function Page() {
  const [winner , setWinner  ] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [playerHand, setPlayerHand] = useState<{rank: string, suit: string}[]>([]);
  const [dealerHand, setDealerHand] = useState<{rank: string, suit: string}[]>([]);
  const [score, setScore] = useState<number>(0);
  const { address , isConnected } = useAccount();
  const {signMessageAsync} = useSignMessage();
  const [isSigned , setIsSigned  ] = useState<boolean>(false);
  const [publicClient, setPublicClient] = useState<any>();
  const [walletClient, setWalletClient] = useState<any>();

  const initGame = async () => {
    const token = localStorage.getItem("jsontoken") || "";
    if (!token){
      setIsSigned(false);
      setScore(0);
      return;
    }

    if (!isConnected){
      setIsSigned(false);
      setScore(0);
      return;
    }

    const responce = await fetch(`/api?player=${address}`, {
      method:"GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
      },
    });

    if (responce.status === 401){
      setIsSigned(false);
      setScore(0);
      return;
    }

    const data = await responce.json();
    console.log("data:", data);
    setIsSigned(true);
    setPlayerHand(data.playerHand);
    setDealerHand(data.dealerHand);``
    setMessage(data.message);
    setScore(data.score);

    
    if (window!== undefined && window.ethereum){
      const provider = window.ethereum;
      const publicClient = createPublicClient({
        chain: avalancheFuji,
        transport: custom(provider),
      });
      setPublicClient(publicClient);
      const walletClient = createWalletClient({
        chain: avalancheFuji,
        transport: custom(provider),
      });
      setWalletClient(walletClient);

    }else{
      console.error("window.ethereum is undefined");
    }
  }
  
  useEffect(() => {    
    initGame();
    console.log("init game");
  }, []);

  async function handleAction(action: string) {
    try {
      const jsontoken = localStorage.getItem("jsontoken") || "";
      const response = await fetch("/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + jsontoken,
        },
        body: JSON.stringify({ 
          action,
          address,
         }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setMessage(data.message);
    } catch (error) {
      console.error("Error action:", error);
    }
  }

  async function handleTx(){
    if (!publicClient || !walletClient){
      console.error("publicClient or walletClient is undefined");
      return;
    }
    try{
      const abi = parseAbi([process.env.NEXT_PUBLIC_ABI_CODE || ""]);

      console.log("abi:", abi);
      const {request} = await publicClient.simulateContract({
        address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
        abi: parseAbi([process.env.NEXT_PUBLIC_ABI_CODE||""]),
        functionName: "sendRequest",
        args: [[address], address],
        account: address,
      });
      console.log("request:", request);

      const hash = await walletClient.writeContract(request);
      console.log("Transaction has been sent. Hash:", hash);

    } catch (error) {
      console.error("Error transaction:", error);
    }
  }

  async function handleSignature() {
    const message = ` Hello to Web3 game Blackjack at ${new Date().toLocaleString()}`;
    const signature = await signMessageAsync({message});
    try{
      const response = await fetch("/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "auth",
          address,
          message,
          signature
          }),
      });

      if (response.status === 200) {
        const {score , jsontoken}= await response.json();
        setIsSigned(true);
        console.log("Signature success");
        // console.log("score:", data.score);
        // store jsontoken in local storage or session storage
        localStorage.setItem("jsontoken", jsontoken);
        setIsSigned(true);
        setScore(score);
        initGame();
      }else{
        setIsSigned(false);
        setScore(0);
      }

    } catch (error) {
      console.error("Error signature:", error);
    }

  }

  if (!isConnected) {
    return( 
    <div className="flex flex-col gap-2 items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl bold">Please connect your wallet</h1>
    <ConnectButton />
    </div>
    );
  }

  if (!isSigned) {
    return( 
    <div className="flex flex-col gap-2 items-center justify-center h-screen bg-gray-100">
      <ConnectButton />
      <div> Sign status: {isSigned? "Signed" : "Not signed"}, score: {score}</div>
      <button onClick={handleSignature} className="border-black bg-amber-300 rounded-md p-2"> Sign with your wallet</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 items-center justify-center h-screen bg-gray-100">
      <ConnectButton />
      <div> Sign status: {isSigned? "Signed" : "Not signed"}, score: {score}</div>
      <button onClick={handleSignature} className="border-black bg-amber-300 rounded-md p-2"> Sign with your wallet</button>
      <button onClick={handleTx} className="border-black bg-amber-300 rounded-md p-2"> Create NFT</button>
      <h1 className="text-3xl bold">Welcome to Web3 game Blackjack</h1>
      <h2 className={`text-2xl bold ${message.toLowerCase().includes('win')? 'bg-green-300' : 'bg-amber-300'}`}> {message}</h2>

      <div className="mt-4">
        <h2> Dealer's hand</h2>
        <div className="flex flex-row gap-2">
          {
            dealerHand.map((card, index) => (
              <div key={index} className="w-32 h-42 border-1 border-black bg-white rounded-md flex flex-col justify-between">
                <p className="self-start p-1 text-lg">{card.rank}</p>
                <p className="self-center  text-3xl">{card.suit}</p>
                <p className="self-end  p-1 text-lg">{card.rank}</p>
              </div>
            ))
          }     
        </div>
      </div>

      <div>
        <h2> Player's hand</h2>
        <div className="flex flex-row gap-2">
          {
            playerHand.map((card, index) => (
              <div key={index} className="w-32 h-42 border-1 border-black bg-white rounded-md flex flex-col justify-between">
                <p className="self-start p-1 text-lg">{card.rank}</p>
                <p className="self-center  text-3xl">{card.suit}</p>
                <p className="self-end  p-1 text-lg">{card.rank}</p>
              </div>
            ))
          }
   
        </div>
      </div>

      <div className="flex flex-row gap-2 mt-4">
        <button 
          onClick={handleAction.bind(null, "hit")}  
          className={`rounded-md p-2 ${message.toLowerCase().includes('win') || message.toLowerCase().includes('lose') ? 'bg-amber-100' : 'bg-amber-300'}`}
          disabled={message.toLowerCase().includes('win') || message.toLowerCase().includes('lose')}
        >Hit</button>
        <button 
          onClick={handleAction.bind(null, "stand")} 
          className={`rounded-md p-2 ${message.toLowerCase().includes('win') || message.toLowerCase().includes('lose') ? 'bg-amber-100' : 'bg-amber-300'}`}
          disabled={message.toLowerCase().includes('win') || message.toLowerCase().includes('lose')}
        >Stand
        </button>
        <button onClick={initGame} className="bg-amber-300 rounded-md p-2">Reset</button>
      </div>

    </div>
  );
};