
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<string>("");

  const initGame = async () => {
    setIsLoading(true);
    setLoadingAction("初始化游戏");
    
    const token = localStorage.getItem("jsontoken") || "";
    if (!token){
      setIsSigned(false);
      setScore(0);
      setIsLoading(false);
      return;
    }

    if (!isConnected){
      setIsSigned(false);
      setScore(0);
      setIsLoading(false);
      return;
    }

    try {
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
        setIsLoading(false);
        return;
      }

      const data = await responce.json();
      console.log("data:", data);
      setIsSigned(true);
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
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
    } catch (error) {
      console.error("Error initializing game:", error);
    } finally {
      setIsLoading(false);
      setLoadingAction("");
    }
  }
  
  useEffect(() => {    
    initGame();
    console.log("init game");
  }, []);

  async function handleAction(action: string) {
    setIsLoading(true);
    setLoadingAction(action === "hit" ? "要牌" : "停牌");
    
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
    } finally {
      setIsLoading(false);
      setLoadingAction("");
    }
  }

  async function handleTx(){
    if (!publicClient || !walletClient){
      console.error("publicClient or walletClient is undefined");
      return;
    }
    
    setIsLoading(true);
    setLoadingAction("创建NFT");
    
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
    } finally {
      setIsLoading(false);
      setLoadingAction("");
    }
  }

  async function handleSignature() {
    setIsLoading(true);
    setLoadingAction("签名验证");
    
    try {
      const message = ` Hello to Web3 game Blackjack at ${new Date().toLocaleString()}`;
      const signature = await signMessageAsync({message});
      
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
    } finally {
      setIsLoading(false);
      setLoadingAction("");
    }
  }

  const getSuitColor = (suit: string) => {
    return suit === "♥️" || suit === "♦️" ? "text-red-600" : "text-black";
  };

  const gameEnded = message.toLowerCase().includes('win') || message.toLowerCase().includes('lose');

  if (!isConnected) {
    return( 
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 text-center">
          <div className="text-6xl mb-6">🎲</div>
          <h1 className="text-4xl font-bold text-white mb-6 tracking-wide">Web3 黑杰克</h1>
          <p className="text-green-100 mb-8 text-lg">请连接您的钱包开始游戏</p>
          <div className="transform hover:scale-105 transition-transform duration-200">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  if (!isSigned) {
    return( 
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 text-center max-w-md w-full">
          <div className="mb-6">
            <ConnectButton />
          </div>
          
          <div className="text-6xl mb-6">✍️</div>
          <h2 className="text-2xl font-bold text-white mb-4">身份验证</h2>
          <p className="text-green-100 mb-6">签名状态: <span className="font-semibold">{isSigned? "已签名" : "未签名"}</span></p>
          <p className="text-green-100 mb-8">积分: <span className="font-bold text-yellow-300">{score}</span></p>
          
          <button 
            onClick={handleSignature} 
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading && loadingAction === "签名验证" ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                验证中...
              </div>
            ) : (
              "使用钱包签名"
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 p-4">
      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="mb-4">
          <ConnectButton />
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-4 border border-white/20">
          <div className="flex items-center gap-4 text-white">
            <span>签名状态: <span className="font-semibold text-yellow-300">{isSigned? "已签名" : "未签名"}</span></span>
            <span className="text-white/50">|</span>
            <span>积分: <span className="font-bold text-yellow-300">{score}</span></span>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button 
            onClick={handleSignature} 
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading && loadingAction === "签名验证" ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                验证中
              </div>
            ) : (
              "重新签名"
            )}
          </button>
          
          <button 
            onClick={handleTx} 
            disabled={isLoading}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading && loadingAction === "创建NFT" ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                创建中
              </div>
            ) : (
              "创建 NFT"
            )}
          </button>
        </div>

        <h1 className="text-4xl font-bold text-white mb-4 tracking-wide">🎲 Web3 黑杰克 🎰</h1>
        
        <div className={`px-6 py-3 rounded-xl font-bold text-lg transition-all duration-300 ${
          message.toLowerCase().includes('win') 
            ? 'bg-gradient-to-r from-green-400 to-green-500 text-white shadow-lg' 
            : message.toLowerCase().includes('lose')
            ? 'bg-gradient-to-r from-red-400 to-red-500 text-white shadow-lg'
            : 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black shadow-lg'
        }`}>
          {message || "开始新游戏"}
        </div>
      </div>

      {/* Game Area */}
      <div className="max-w-4xl mx-auto">
        {/* Dealer's Hand */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">🎩 庄家手牌</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {dealerHand.map((card, index) => (
              <div key={index} className="w-24 h-36 sm:w-28 sm:h-40 bg-white rounded-xl shadow-2xl border-2 border-gray-200 flex flex-col justify-between transform hover:scale-105 transition-transform duration-200">
                <p className={`self-start p-2 text-sm sm:text-lg font-bold ${getSuitColor(card.suit)}`}>{card.rank}</p>
                <p className={`self-center text-2xl sm:text-4xl ${getSuitColor(card.suit)}`}>{card.suit}</p>
                <p className={`self-end p-2 text-sm sm:text-lg font-bold rotate-180 ${getSuitColor(card.suit)}`}>{card.rank}</p>
              </div>
            ))}     
          </div>
        </div>

        {/* Player's Hand */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">🎯 您的手牌</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {playerHand.map((card, index) => (
              <div key={index} className="w-24 h-36 sm:w-28 sm:h-40 bg-white rounded-xl shadow-2xl border-2 border-gray-200 flex flex-col justify-between transform hover:scale-105 transition-transform duration-200">
                <p className={`self-start p-2 text-sm sm:text-lg font-bold ${getSuitColor(card.suit)}`}>{card.rank}</p>
                <p className={`self-center text-2xl sm:text-4xl ${getSuitColor(card.suit)}`}>{card.suit}</p>
                <p className={`self-end p-2 text-sm sm:text-lg font-bold rotate-180 ${getSuitColor(card.suit)}`}>{card.rank}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4">
          <button 
            onClick={() => handleAction("hit")}  
            disabled={gameEnded || isLoading}
            className={`px-8 py-4 font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
              gameEnded 
                ? 'bg-gray-400 text-gray-600' 
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg'
            }`}
          >
            {isLoading && loadingAction === "要牌" ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                要牌中
              </div>
            ) : (
              "🎯 要牌 (Hit)"
            )}
          </button>
          
          <button 
            onClick={() => handleAction("stand")} 
            disabled={gameEnded || isLoading}
            className={`px-8 py-4 font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
              gameEnded 
                ? 'bg-gray-400 text-gray-600' 
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg'
            }`}
          >
            {isLoading && loadingAction === "停牌" ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                停牌中
              </div>
            ) : (
              "✋ 停牌 (Stand)"
            )}
          </button>
          
          <button 
            onClick={initGame} 
            disabled={isLoading && loadingAction !== "初始化游戏"}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading && loadingAction === "初始化游戏" ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                重置中
              </div>
            ) : (
              "🔄 重新开始"
            )}
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600"></div>
              <p className="text-lg font-semibold text-gray-700">{loadingAction}中...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};