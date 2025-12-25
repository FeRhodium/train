export interface Coordinate {
  latitude: number;
  longitude: number;
}

export class Station {
  id: string;
  nameLocal: string;
  nameRomaji: string;
  nameEnglish: string;
  location: Coordinate;
  hasPassengerService: boolean;
  
  constructor(
    id: string, 
    nameLocal: string, 
    nameRomaji: string, 
    nameEnglish: string, 
    location: Coordinate,
    hasPassengerService: boolean = true
  ) {
    this.id = id;
    this.nameLocal = nameLocal;
    this.nameRomaji = nameRomaji;
    this.nameEnglish = nameEnglish;
    this.location = location;
    this.hasPassengerService = hasPassengerService;
  }

  /**
   * Calculates the straight-line distance (Haversine formula) between two stations in kilometers.
   */
  static calculateDistance(s1: Station, s2: Station): number {
    const R = 6371; // Radius of the earth in km
    const dLat = Station.deg2rad(s2.location.latitude - s1.location.latitude);
    const dLon = Station.deg2rad(s2.location.longitude - s1.location.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(Station.deg2rad(s1.location.latitude)) *
        Math.cos(Station.deg2rad(s2.location.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return Number(d.toFixed(2));
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}