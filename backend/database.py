import os
import logging
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection

logger = logging.getLogger("mirror.database")

# Load environment variables from .env
env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

raw_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
# Auto-clean accidental angle brackets around passwords if present
MONGO_URI = raw_uri.replace("<", "").replace(">", "") if raw_uri else raw_uri
DB_NAME = os.getenv("DB_NAME", "mirror_db")


class MongoManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None


db_manager = MongoManager()


async def connect_to_mongo() -> None:
    """Initialize MongoDB Atlas client and verify connection with pooling."""
    logger.info("Initializing MongoDB Atlas connection...")
    try:
        db_manager.client = AsyncIOMotorClient(
            MONGO_URI,
            minPoolSize=10,
            maxPoolSize=50,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
            appname="Mirror-AI-Coach",
        )
        db_manager.db = db_manager.client[DB_NAME]
        # Ping the server to verify active connection
        await db_manager.client.admin.command("ping")
        logger.info("Successfully connected to MongoDB Atlas database: %s", DB_NAME)
    except Exception as exc:
        logger.error("Failed to connect to MongoDB Atlas: %s", exc)
        raise exc


async def close_mongo_connection() -> None:
    """Close the MongoDB Atlas client pool."""
    if db_manager.client is not None:
        logger.info("Closing MongoDB Atlas connection pool...")
        db_manager.client.close()
        db_manager.client = None
        db_manager.db = None
        logger.info("MongoDB Atlas connection closed.")


def get_database() -> AsyncIOMotorDatabase:
    """Retrieve the current active database instance."""
    if db_manager.db is None:
        db_manager.client = AsyncIOMotorClient(
            MONGO_URI,
            minPoolSize=10,
            maxPoolSize=50,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
            appname="Mirror-AI-Coach",
        )
        db_manager.db = db_manager.client[DB_NAME]
    return db_manager.db


def get_collection(collection_name: str) -> AsyncIOMotorCollection:
    """Retrieve a collection from the active database."""
    database = get_database()
    return database[collection_name]
