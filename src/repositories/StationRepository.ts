import { db } from "../db";
import { Station } from "../models/Station";

export class StationRepository {
  save(station: Station): void {
    const query = db.query(`
      INSERT INTO stations (id, name_local, name_romaji, name_english, latitude, longitude, has_passenger_service)
      VALUES ($id, $local, $romaji, $english, $lat, $lng, $has_service)
      ON CONFLICT(id) DO UPDATE SET
        name_local = excluded.name_local,
        name_romaji = excluded.name_romaji,
        name_english = excluded.name_english,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        has_passenger_service = excluded.has_passenger_service;
    `);

    query.run({
      $id: station.id,
      $local: station.nameLocal,
      $romaji: station.nameRomaji,
      $english: station.nameEnglish,
      $lat: station.location.latitude,
      $lng: station.location.longitude,
      $has_service: station.hasPassengerService ? 1 : 0,
    });
  }

  findById(id: string): Station | null {
    const query = db.query("SELECT * FROM stations WHERE id = $id");
    const result = query.get({ $id: id }) as any;

    if (!result) return null;

    return new Station(
      result.id,
      result.name_local,
      result.name_romaji,
      result.name_english,
      {
        latitude: result.latitude,
        longitude: result.longitude,
      },
      result.has_passenger_service === 1
    );
  }

  findAll(): Station[] {
    const query = db.query("SELECT * FROM stations");
    const results = query.all() as any[];

    return results.map(
      (r) =>
        new Station(
          r.id,
          r.name_local,
          r.name_romaji,
          r.name_english,
          {
            latitude: r.latitude,
            longitude: r.longitude,
          },
          r.has_passenger_service === 1
        )
    );
  }
}
