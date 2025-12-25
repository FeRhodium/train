import { Database } from "bun:sqlite";

export const db = new Database("railway.sqlite");

export function initDB() {
  db.run("PRAGMA foreign_keys = ON;");

  // Recreate tables for the new bidirectional edge schema
  db.run("DROP TABLE IF EXISTS railway_edges"); 
  db.run("DROP TABLE IF EXISTS railway_stations"); 
  db.run("DROP TABLE IF EXISTS railways");
  db.run("DROP TABLE IF EXISTS stations");

  db.run(`
    CREATE TABLE IF NOT EXISTS stations (
      id TEXT PRIMARY KEY,
      name_local TEXT NOT NULL,
      name_romaji TEXT NOT NULL,
      name_english TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      has_passenger_service INTEGER NOT NULL DEFAULT 1
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS railways (
      id TEXT PRIMARY KEY,
      name_local TEXT NOT NULL,
      name_english TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS railway_edges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      railway_id TEXT NOT NULL,
      station1_id TEXT NOT NULL,
      station2_id TEXT NOT NULL,
      distance REAL NOT NULL,
      ordering INTEGER NOT NULL,
      FOREIGN KEY (railway_id) REFERENCES railways(id) ON DELETE CASCADE,
      FOREIGN KEY (station1_id) REFERENCES stations(id) ON DELETE CASCADE,
      FOREIGN KEY (station2_id) REFERENCES stations(id) ON DELETE CASCADE
    );
  `);
  
  console.log("Database initialized successfully.");
}
