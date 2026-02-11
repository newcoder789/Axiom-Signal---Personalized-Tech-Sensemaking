import os
import time
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
from datetime import datetime
from sqlmodel import Session, select
from database.engine import engine
from database.models import UserMemory
from memory.memory_service import MemoryService
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

class DataBridgeService:
    def __init__(self):
        if not os.getenv("DATABASE_URL"):
            current_dir = os.path.dirname(os.path.abspath(__file__))
            env_path = os.path.join(current_dir, "../../frontend/.env.local")
            if os.path.exists(env_path):
                load_dotenv(env_path)
        
        self.db_url = os.getenv("DATABASE_URL")
        self.memory_service = MemoryService()
        self.engine = engine
        self.last_sync = None
        
        if not self.db_url:
            logger.warning("DATABASE_URL not found in frontend/.env.local. Data bridge will be disabled.")
        else:
            logger.info(f"Data Bridge initialized with Postgres endpoint.")

    def _get_postgres_conn(self):
        if not self.db_url:
            return None
        return psycopg2.connect(self.db_url, cursor_factory=RealDictCursor)

    async def sync_now(self):
        """Manually trigger a sync from Postgres to SQLite."""
        if not self.db_url:
            return {"success": False, "error": "No DATABASE_URL configured"}

        try:
            logger.info(f"[BRIDGE] Connecting to Postgres: {self.db_url[:20]}...")
            conn = self._get_postgres_conn()
            if not conn:
                logger.error("[BRIDGE] Connection failed (None returned)")
                return {"success": False, "error": "Could not connect to Postgres"}
                
            with conn.cursor() as cur:
                # 1. Fetch recent journals
                cur.execute("SELECT id, title, description, created_at FROM journals ORDER BY created_at DESC LIMIT 50")
                journals = cur.fetchall()
                
                # 2. Fetch recent thoughts (verdicts) with journal_id for scoping
                cur.execute('SELECT id, journal_id, title, content, verdict, confidence, reasoning, created_at FROM thoughts ORDER BY created_at DESC LIMIT 50')
                thoughts = cur.fetchall()
            
            conn.close()
            logger.info(f"[BRIDGE] Fetched {len(journals)} journals and {len(thoughts)} thoughts from Postgres.")
            
            sync_count = 0
            # 3. Upsert into SQLite
            with Session(self.engine) as session:
                for j in journals:
                    # Check if already exists in SQLite (using pg_id in metadata)
                    # For simplicity, we'll use a prefix in the content or a specific metadata field if your model supports it
                    # Our UserMemory has a metadata_ Field (sa_column=Column("metadata", JSON))
                    
                    pg_id = str(j['id'])
                    # Simple check: does this Postgres ID exist in our SQLite metadata?
                    # Since SQLModel JSON filtering is tricky in SQLite, we'll do a basic check
                    
                    # Store as 'journal'
                    self._upsert_memory(session, pg_id, "journal", f"Journal: {j['title']}\n{j['description'] or ''}", j['created_at'])
                    sync_count += 1
                    
                for t in thoughts:
                    pg_id = str(t['id'])
                    content = f"Thought: {t['title']}\n{t['content']}"
                    if t['reasoning']:
                        content += f"\nReasoning: {t['reasoning']}"
                    
                    self._upsert_memory(session, pg_id, "verdict", content, t['created_at'], {
                        "verdict": t['verdict'],
                        "confidence": float(t['confidence']) if t['confidence'] else 0,
                        "journal_id": str(t['journal_id']) if t['journal_id'] else None
                    })
                    sync_count += 1
                
                session.commit()
            
            self.last_sync = datetime.utcnow()
            
            # Diagnostic: What keywords did we find?
            all_content = " ".join([j['title'] for j in journals]) + " " + " ".join([t['content'] for t in thoughts])
            found_rust = "rust" in all_content.lower()
            found_mongo = "mongo" in all_content.lower()
            found_pg = "postgres" in all_content.lower()
            
            logger.info(f"Sync complete. Unified {sync_count} items. Diagnostics: [Rust: {found_rust}, Mongo: {found_mongo}, PG: {found_pg}]")
            return {"success": True, "items_synced": sync_count}
            
        except Exception as e:
            logger.error(f"Sync failed: {e}")
            return {"success": False, "error": str(e)}

    def _upsert_memory(self, session, pg_id, content_type, content, created_at, extra_meta=None):
        """Helper to upsert Postgres data into SQLite UserMemory."""
        # Check if already exists by checking the content snippet or a dedicated check
        # For a hackathon, we'll check if a memory with this pg_id in metadata exists
        # But UserMemory doesn't have an indexed pg_id. 
        # Let's just check if the content starts with "PG_UID:[id]"
        
        marker = f"PG_ID:[{pg_id}]"
        statement = select(UserMemory).where(UserMemory.content.like(f"%{marker}%"))
        existing = session.exec(statement).first()
        
        full_content = f"{marker} {content}"
        
        if not existing:
            new_mem = UserMemory(
                user_id="default",
                content_type=content_type,
                content=full_content,
                created_at=created_at,
                importance_score=0.8,
                metadata_={"pg_id": pg_id, **(extra_meta or {})}
            )
            session.add(new_mem)
        else:
            existing.content = full_content
            existing.updated_at = datetime.utcnow()
            if extra_meta:
                existing.metadata_.update(extra_meta)
            session.add(existing)

data_bridge = DataBridgeService()
