import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";


// 创建DynamoDB客户端，包含凭证信息
const client = new DynamoDBClient({
  region: "ap-southeast-2", // 替换为你的AWS区域
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});


const ddbDocClient = DynamoDBDocumentClient.from(client);

// 表名和分区键常量
const TABLE_NAME = "blackjack";
const PARTITION_KEY = "player";

/**
 * 写入玩家分数到DynamoDB
 * @param player 玩家标识
 * @param score 分数
 */
export const writeScore = async (player: string, score: number) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Item: {
        [PARTITION_KEY]: player,
        score: score,
        updatedAt: new Date().toISOString()
      }
    };

    const data = await ddbDocClient.send(new PutCommand(params));
    console.log("分数写入成功:", data);
    return data;
  } catch (err) {
    console.error("写入分数时出错:", err);
    throw err;
  }
};

/**
 * 从DynamoDB读取玩家分数
 * @param player 玩家标识
 */
export const readScore = async (player: string) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: {
        [PARTITION_KEY]: player
      }
    };

    const data = await ddbDocClient.send(new GetCommand(params));
    console.log("分数读取成功:", data.Item);
    return data.Item;
  } catch (err) {
    console.error("读取分数时出错:", err);
    throw err;
  }
};

// 使用示例
async function main() {
  try {
    // 写入分数
    await writeScore("player2", 300);
    
    // 读取分数
    const scoreData = await readScore("player2");
    console.log("玩家分数:", scoreData?.score);
  } catch (error) {
    console.error("操作失败:", error);
  }
}

// 执行示例（可选）
// main();  