// ... (previous imports)
import { initDB } from './src/db';
import { Station } from './src/models/Station';
import { Railway } from './src/models/Railway';
import { StationRepository } from './src/repositories/StationRepository';
import { RailwayRepository } from './src/repositories/RailwayRepository';
import { RoutePlanner } from './src/services/RoutePlanner';

// Initialize Database
initDB();

const stationRepo = new StationRepository();
const railwayRepo = new RailwayRepository();
const routePlanner = new RoutePlanner();

// --- Setup Data ---

// --- Guangshengang High-Speed Railway Stations ---
// Based on OpenStreetMap data: https://www.openstreetmap.org/relation/9405634
const stationGuangzhounan = new Station('GSG-001', '广州南', 'Guangzhounan', 'Guangzhou South', { latitude: 22.9914143, longitude: 113.2640375 }, true);
const stationHumen = new Station('GSG-002', '虎门', 'Humen', 'Humen', { latitude: 22.8632157, longitude: 113.6682891 }, true);
const stationNanshabei = new Station('GSG-003', '南沙北', 'Nanshabei', 'Nansha North', { latitude: 22.8687149, longitude: 113.4852438 }, true);
const stationGuangmingcheng = new Station('GSG-004', '光明城', 'Guangmingcheng', 'Guangmingcheng', { latitude: 22.7355800, longitude: 113.9499003 }, true);
const stationShenzhenbei = new Station('GSG-005', '深圳北', 'Shenzhenbei', 'Shenzhen North', { latitude: 22.6120365, longitude: 114.0239469 }, true);
const stationFutian = new Station('GSG-006', '福田', 'Futian', 'Futian', { latitude: 22.5413178, longitude: 114.0511799 }, true);
const stationHongKongWestKowloon = new Station('GSG-007', '香港西九龍', 'Hong Kong West Kowloon', 'Hong Kong West Kowloon', { latitude: 22.3036814, longitude: 114.1649267 }, true);

console.log("Saving stations...");
stationRepo.save(stationGuangzhounan);
stationRepo.save(stationHumen);
stationRepo.save(stationNanshabei);
stationRepo.save(stationGuangmingcheng);
stationRepo.save(stationShenzhenbei);
stationRepo.save(stationFutian);
stationRepo.save(stationHongKongWestKowloon);

// Guangshengang High-Speed Line
// Based on OpenStreetMap data: https://www.openstreetmap.org/relation/9405634
const guangshengangLine = new Railway('GSG-LINE', '广深港高速线', 'Guangshengang Highspeed Line');
guangshengangLine.addEdge(stationGuangzhounan, stationNanshabei, Station.calculateDistance(stationGuangzhounan, stationNanshabei));
guangshengangLine.addEdge(stationNanshabei, stationHumen, Station.calculateDistance(stationNanshabei, stationHumen));
guangshengangLine.addEdge(stationHumen, stationGuangmingcheng, Station.calculateDistance(stationHumen, stationGuangmingcheng));
guangshengangLine.addEdge(stationGuangmingcheng, stationShenzhenbei, Station.calculateDistance(stationGuangmingcheng, stationShenzhenbei));
guangshengangLine.addEdge(stationShenzhenbei, stationFutian, Station.calculateDistance(stationShenzhenbei, stationFutian));
guangshengangLine.addEdge(stationFutian, stationHongKongWestKowloon, Station.calculateDistance(stationFutian, stationHongKongWestKowloon));

console.log("Saving railways...");
railwayRepo.save(guangshengangLine);

// --- Test Route Planner ---

async function runRouteTest() {
  console.log("\n--- Calculating Shortest Path (Guangzhou South -> Hong Kong West Kowloon) ---");
  
  const gzStartId = 'GSG-001'; // Guangzhounan
  const gzEndId = 'GSG-006';   // Hong Kong West Kowloon
  
  // Straight Line Distance
  const gs1 = stationRepo.findById(gzStartId);
  const gs2 = stationRepo.findById(gzEndId);
  
  if (gs1 && gs2) {
    const directDist = Station.calculateDistance(gs1, gs2);
    console.log(`Straight-line Distance: ${directDist} km`);
  }

  // Railway Path
  const gzResult = await routePlanner.findShortestPath(gzStartId, gzEndId);

  if (gzResult) {
    console.log(`Railway Distance: ${gzResult.totalDistance} km`);
    console.log("Path:");
    gzResult.pathDescription.forEach(step => console.log(` - ${step}`));
  } else {
    console.log("No path found.");
  }
}

runRouteTest();
