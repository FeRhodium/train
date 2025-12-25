import { db } from "../db";
import { Railway } from "../models/Railway";
import { Station } from "../models/Station";

export class RailwayRepository {
  save(railway: Railway): void {
    const transaction = db.transaction(() => {
      db.query(`
        INSERT INTO railways (id, name_local, name_english)
        VALUES ($id, $nameLocal, $nameEnglish)
        ON CONFLICT(id) DO UPDATE SET 
          name_local = excluded.name_local,
          name_english = excluded.name_english;
      `).run({ 
        $id: railway.id, 
        $nameLocal: railway.nameLocal,
        $nameEnglish: railway.nameEnglish
      });

      db.query("DELETE FROM railway_edges WHERE railway_id = $id").run({ $id: railway.id });

      const insertEdge = db.prepare(`
        INSERT INTO railway_edges (railway_id, station1_id, station2_id, distance, ordering)
        VALUES ($rid, $s1id, $s2id, $dist, $ord)
      `);

      railway.edges.forEach((edge, index) => {
        insertEdge.run({
          $rid: railway.id,
          $s1id: edge.station1.id,
          $s2id: edge.station2.id,
          $dist: edge.distance,
          $ord: index,
        });
      });
    });

    transaction();
  }

  findById(id: string): Railway | null {
    const railwayResult = db.query("SELECT * FROM railways WHERE id = $id").get({ $id: id }) as any;

    if (!railwayResult) return null;

    const railway = new Railway(railwayResult.id, railwayResult.name_local, railwayResult.name_english);

    const edgesResult = db.query(`
      SELECT 
        re.distance,
        s1.id as s1_id, s1.name_local as s1_nl, s1.name_romaji as s1_nr, s1.name_english as s1_ne, s1.latitude as s1_lat, s1.longitude as s1_lon, s1.has_passenger_service as s1_ps,
        s2.id as s2_id, s2.name_local as s2_nl, s2.name_romaji as s2_nr, s2.name_english as s2_ne, s2.latitude as s2_lat, s2.longitude as s2_lon, s2.has_passenger_service as s2_ps
      FROM railway_edges re
      JOIN stations s1 ON re.station1_id = s1.id
      JOIN stations s2 ON re.station2_id = s2.id
      WHERE re.railway_id = $id
      ORDER BY re.ordering ASC
    `).all({ $id: id }) as any[];

    edgesResult.forEach((r) => {
      const s1 = new Station(
        r.s1_id, r.s1_nl, r.s1_nr, r.s1_ne, { latitude: r.s1_lat, longitude: r.s1_lon }, r.s1_ps === 1
      );
      const s2 = new Station(
        r.s2_id, r.s2_nl, r.s2_nr, r.s2_ne, { latitude: r.s2_lat, longitude: r.s2_lon }, r.s2_ps === 1
      );
      
      railway.addEdge(s1, s2, r.distance);
    });

    return railway;
  }

  findAll(): Railway[] {
    const railwaysResult = db.query("SELECT * FROM railways").all() as any[];
    return railwaysResult.map(r => this.findById(r.id)!);
  }
}
