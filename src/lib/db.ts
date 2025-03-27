import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const DB_URL = process.env.MONGODB_URL;
const DB_NAME = process.env.MONGODB_NAME;

const mongoClient = new MongoClient(DB_URL);
await mongoClient.connect();

export default async function connectCollection() {
  const db = mongoClient.db(DB_NAME);
  try {
    await db.createCollection("socket_chat", {
      capped: true, // 최대 크기에 도달하면 가장 오래된 문서부터 자동으로 삭제하고 새 문서를 추가하는 옵션
      size: 200e6, // 컬렉션 크기를 약 200MB로 제한
    });
  } catch {
    // collection already exists
  }
  const chatCollection = db.collection("socket_chat");

  chatCollection.createIndex(
    { createdAt: 1 }, // 필드를 기준으로 인덱스를 생성
    {
      expireAfterSeconds: 3600, // 3600초(1시간)가 지나면 자동으로 삭제
      background: true, // 백그라운드에서 인덱스 생성
    },
  );

  return { chatCollection };
}
