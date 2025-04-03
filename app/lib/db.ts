import dotenv from "dotenv";
import { type CreateCollectionOptions, type CreateIndexesOptions, type IndexSpecification, MongoClient } from "mongodb";

dotenv.config();

const DB_URL = process.env.MONGODB_URL;
const DB_NAME = process.env.MONGODB_NAME;

const mongoClient = new MongoClient(DB_URL);
await mongoClient.connect();

interface CreateIndexesAllOptions {
  key: IndexSpecification;
  options: CreateIndexesOptions;
}

type CollectionSetting = { name: string; options: CreateCollectionOptions; index: CreateIndexesAllOptions };

const BASIC_COLLECTION_OPTIONS: CreateCollectionOptions = {
  capped: true, // 최대 크기에 도달하면 가장 오래된 문서부터 자동으로 삭제하고 새 문서를 추가하는 옵션
  size: 200e6, // 컬렉션 크기를 약 200MB로 제한
};

const BASIC_INDEX_OPTIONS: CreateIndexesAllOptions = {
  key: { createdAt: 1 },
  options: {
    expireAfterSeconds: 3600, // 3600초(1시간)가 지나면 자동으로 삭제
    background: true, // 백그라운드에서 인덱스 생성
  },
};

const db = mongoClient.db(DB_NAME);

async function makeCollection(collectionSetting: CollectionSetting) {
  try {
    await db.createCollection(collectionSetting.name, collectionSetting.options);
  } catch {
    // 컬렉션이 이미 존재하는 경우
  }
  const collection = db.collection(collectionSetting.name);
  collection.createIndex(collectionSetting.index.key, collectionSetting.index.options);
  return collection;
}

export default async function connectCollections() {
  const result = {
    chatCollection: await makeCollection({
      name: "socket_chat",
      options: BASIC_COLLECTION_OPTIONS,
      index: BASIC_INDEX_OPTIONS,
    }),
    videoChatCollection: await makeCollection({
      name: "socket_video_chat",
      options: BASIC_COLLECTION_OPTIONS,
      index: BASIC_INDEX_OPTIONS,
    }),
  } as const;

  return result;
}
