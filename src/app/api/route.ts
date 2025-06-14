//when the game is initialized, get player and dealer 2  random cards respectively


import { verifyMessage } from "viem";
import { readScore, writeScore } from "../utils/dynamodb-blackjack";
import jwt from "jsonwebtoken";
import { json } from "stream/consumers";

export interface Card{
    rank: string,
    suit: string,
}

const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const suits = ["♥️", "♠️", "♣️", "♦️"];
const initialDeck = ranks.flatMap((rank) => suits.map((suit) => ({"rank": rank, "suit": suit})));


const gameState:{
    playerHand: Card[],
    dealerHand: Card[],
    deck: Card[],
    message: string,
    score: number, 
} = {
    playerHand: [],
    dealerHand: [],
    deck: initialDeck,
    message: "",
    score: 0,
}

function getRandomCard(deck: Card[], count: number){
    const randomIndexSet = new Set<number>();

    while (randomIndexSet.size < count) {
        randomIndexSet.add(Math.floor(Math.random() * deck.length));
    }
    
    const randomCards = deck.filter((_, index) => randomIndexSet.has(index));
    const remainingDeck = deck.filter((_, index) =>!randomIndexSet.has(index));
    return [randomCards, remainingDeck];
}
export async function GET(request:Request){

    const token = request.headers.get("Authorization")?.replace("Bearer ", "") || "";
    if (!token){
        return new Response(JSON.stringify({message: "token not found"}), {status: 401});
    }
    const url = new URL(request.url);
    const address = url.searchParams.get("player") || "";

    // console.log("address", address);
    // console.log("token", token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as {address: string};
    // console.log("decoded", decoded);

    if (address !== decoded.address){
        return new Response(JSON.stringify({message: "Auth failed"}), {status: 401});
    }

    gameState.playerHand = [];
    gameState.dealerHand = [];
    gameState.deck = initialDeck;
    gameState.message = "";
    gameState.score = 0;

    const [playerHand, remainingDeck] = getRandomCard(gameState.deck, 2);
    const [dealerHand, newDeck]= getRandomCard(remainingDeck, 2);

    const item = await readScore(address);
    // console.log("item", item);
    const score = Number(item?.score) || 0;
    // console.log("score", score);

    gameState.playerHand = playerHand;
    gameState.dealerHand = dealerHand;
    gameState.deck = newDeck;
    gameState.score = score;
    gameState.message = "";

    return new Response(JSON.stringify(
        {
            playerHand: gameState.playerHand,
            dealerHand: [gameState.dealerHand[0], {rank: "?", suit: "?"} as Card],
            message: gameState.message,
            score: gameState.score,
        }
    ), {status: 200});

}

function calculateHandValue(hand: Card[]): number{
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const values = [11, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10];2

    let total = 0;
    for(let i = 0; i < hand.length; i++){
        const card = hand[i];
        const rankIndex = ranks.indexOf(card.rank);
        total += values[rankIndex];
    }

    // based on the number of aces, subtract 10  until total is less than 21
    let aces = hand.filter((card) => card.rank === "A").length;
    while(aces > 0 && total > 21){
        total -= 10;
        aces--;
    }
    return total;
}


//when hit is clicked, get a random card from the deck and add it to the player hand 
// calculate player hand value
// player hand value is 21: player wins, black jack
// play hand is more 21: player loses, bust
// player hand is less than 21: player can hit or stand

//when stand is clicked, get a random card from the deck and add it to the dealer hand 
// keep doing this until dealer has 17 or more points
// calculate dealer hand value
// dealer hand value is 21: player loses, dealer black jack
// dealer hand value is more than 21: player wins, dealer loses, bust
// dealer hand value is less than 21: 
// calculate player hand value
// player  > dealer: player wins, blackjack
// player == dealer: push, tie
// player < dealer: player loses, bust
export async function POST(request: Request){
    const body = await request.json();
    const {action, address} = body;

    if (action === "auth"){
        const {signature, message} = body;
        const isValid = await verifyMessage( {address, message, signature});
        if (isValid){
            // 读取 player 的分数，如果不存在，则创建
            const item = await readScore(address);
            let score = item ? item.score : (await writeScore(address, 0), 0);
            const jsontoken = jwt.sign({address}, process.env.JWT_SECRET || "", {expiresIn: "1h"});

            //把jsontoken发送出去
            return new Response(JSON.stringify({message: "Auth success", score, jsontoken}), {status: 200});
        } else{
            return new Response(JSON.stringify({message: "Auth failed"}), {status: 401});
        }
    }

    const jsontaken = request.headers.get("Authorization")?.replace("Bearer ", "") || "";
    if (!jsontaken){
        return new Response(JSON.stringify({message: "token not found"}), {status: 401});
    }

    const decoded = jwt.verify(jsontaken, process.env.JWT_SECRET || "") as {address: string};
    
    if (address !== decoded.address){
        return new Response(JSON.stringify({message: "Auth failed"}), {status: 401});
    }

    if(action === "hit"){
        const [newCard, remainingDeck] = getRandomCard(gameState.deck, 1);
        gameState.playerHand.push(newCard[0]);
        gameState.deck = remainingDeck;

        const playerHandValue = calculateHandValue(gameState.playerHand);
        if(playerHandValue === 21){
            gameState.message = "Blackjack! You win!";
            await writeScore(address, gameState.score + 100);
        } else if(playerHandValue > 21){
            gameState.message = "Bust! You lose!";
            await writeScore(address, gameState.score - 100);
        } else {
            gameState.message = "Hit or stand?";
        }
        return new Response(JSON.stringify(
            {
                playerHand: gameState.playerHand,
                dealerHand: gameState.dealerHand,
                message: gameState.message,
            }
        ), {});
    }

    if(action === "stand"){
        while(calculateHandValue(gameState.dealerHand) < 17){
            const [newCard, remainingDeck] = getRandomCard(gameState.deck, 1);
            gameState.dealerHand.push(newCard[0]);
            gameState.deck = remainingDeck;
        }

        const dealerHandValue = calculateHandValue(gameState.dealerHand);
        const playerHandValue = calculateHandValue(gameState.playerHand);

        if(dealerHandValue === 21){
            gameState.message = "Bust! You lose!";
            await writeScore(address, gameState.score - 100);
        } else if(dealerHandValue > 21){
            gameState.message = "Blackjack! You win!";
            await writeScore(address, gameState.score + 100);
        } else if(playerHandValue > dealerHandValue){
            gameState.message = "Blackjack! You win!";
            await writeScore(address, gameState.score + 100);
        } else if(playerHandValue === dealerHandValue){
            gameState.message = "Push, tie.";
        } else {
            gameState.message = "Bust! You lose!";
            await writeScore(address, gameState.score - 100);
        }
        return new Response(JSON.stringify(
            {
                playerHand: gameState.playerHand,
                dealerHand: gameState.dealerHand,
                message: gameState.message,
            }
        ), {});
    }

    return new Response(JSON.stringify({message: "Invalid action"}), {status: 400});
}




