/**
 * MongoDB Atlas Vector Search Index Configuration for "Mirror"
 *
 * Collection: sessions
 * Database: mirror_db
 * Index Name: vector_index
 * Dimensions: 768 (text-embedding-004)
 * Similarity: cosine
 *
 * Usage with mongosh:
 *   mongosh "<YOUR_ATLAS_CONNECTION_STRING>" mongodb_atlas_setup.js
 */

const targetDb = db.getSiblingDB("mirror_db");
const collectionName = "sessions";
const indexName = "vector_index";

print(`\n======================================================`);
print(`  Configuring MongoDB Atlas for Mirror AI Coach`);
print(`  Database: ${targetDb.getName()}`);
print(`  Collection: ${collectionName}`);
print(`======================================================\n`);

// 1. Standard compound indexes for fast episodic history retrieval
print(`[1/3] Creating standard compound indexes for episodic query filters...`);
targetDb[collectionName].createIndex(
  { user_id: 1, created_at: -1 },
  { name: "idx_user_created_at" }
);
targetDb[collectionName].createIndex(
  { session_id: 1 },
  { unique: true, name: "uniq_session_id" }
);
print(`✓ Compound index 'idx_user_created_at' and unique 'uniq_session_id' created.`);

// 2. Atlas Vector Search Index definition JSON
const vectorSearchIndexDefinition = {
  name: indexName,
  type: "vectorSearch",
  definition: {
    fields: [
      {
        type: "vector",
        path: "embedding",
        numDimensions: 768,
        similarity: "cosine",
      },
      {
        type: "filter",
        path: "user_id",
      },
    ],
  },
};

print(`\n[2/3] Vector Search Index Definition JSON:`);
print(JSON.stringify(vectorSearchIndexDefinition, null, 2));

// 3. Create or replace Search Index via createSearchIndex
try {
  print(`\n[3/3] Creating Atlas Vector Search Index '${indexName}' on '${collectionName}'...`);
  const result = targetDb[collectionName].createSearchIndex(vectorSearchIndexDefinition);
  print(`✓ Successfully dispatched createSearchIndex command: ${result || indexName}`);
  print(`Note: Atlas Vector Search index build takes ~1 minute to transition to 'READY'.`);
} catch (err) {
  print(`\nℹ️  Notice on createSearchIndex: ${err.message}`);
  print(`If using the MongoDB Atlas Web Console:`);
  print(`1. Navigate to: Atlas Console -> Database Deployments -> Atlas Search`);
  print(`2. Click 'Create Search Index' -> Select 'Atlas Vector Search' (JSON Editor)`);
  print(`3. Database: mirror_db | Collection: sessions | Index Name: vector_index`);
  print(`4. Paste the configuration JSON below:\n`);
  print(JSON.stringify(vectorSearchIndexDefinition.definition, null, 2));
}

print(`\n======================================================`);
print(`  MongoDB Atlas Setup Complete!`);
print(`======================================================\n`);
