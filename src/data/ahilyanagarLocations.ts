export interface TransitLocation {
  id: string;
  name: string;
  nameMarathi: string;
  category: 'terminal' | 'hub' | 'college' | 'commercial' | 'residential' | 'landmark';
  lat: number;
  lng: number;
  popular: boolean;
}

export const AHILYANAGAR_LOCATIONS: TransitLocation[] = [
  {
    id: 'stop-cbs',
    name: 'Central Bus Stand (CBS)',
    nameMarathi: 'मध्यवर्ती बस स्थानक',
    category: 'terminal',
    lat: 19.0975,
    lng: 74.7420,
    popular: true,
  },
  {
    id: 'stop-savedi',
    name: 'Savedi Bus Terminal',
    nameMarathi: 'सावेडी बस टर्मिनस',
    category: 'terminal',
    lat: 19.1220,
    lng: 74.7350,
    popular: true,
  },
  {
    id: 'stop-midc',
    name: 'MIDC Nagapur Phase 1',
    nameMarathi: 'एमआयडीसी नागापूर टप्पा १',
    category: 'commercial',
    lat: 19.1550,
    lng: 74.7180,
    popular: true,
  },
  {
    id: 'stop-railway',
    name: 'Ahilyanagar Railway Station',
    nameMarathi: 'अहिल्यानगर रेल्वे स्टेशन',
    category: 'hub',
    lat: 19.0810,
    lng: 74.7380,
    popular: true,
  },
  {
    id: 'stop-delhi-gate',
    name: 'Delhi Gate',
    nameMarathi: 'दिल्ली गेट',
    category: 'landmark',
    lat: 19.1020,
    lng: 74.7480,
    popular: true,
  },
  {
    id: 'stop-swastik',
    name: 'Swastik Chowk',
    nameMarathi: 'स्वस्तिक चौक',
    category: 'hub',
    lat: 19.0952,
    lng: 74.7496,
    popular: true,
  },
  {
    id: 'stop-market-yard',
    name: 'Market Yard',
    nameMarathi: 'मार्केट यार्ड',
    category: 'commercial',
    lat: 19.0880,
    lng: 74.7560,
    popular: false,
  },
  {
    id: 'stop-kedgaon',
    name: 'Kedgaon Naka',
    nameMarathi: 'केडगाव नाका',
    category: 'residential',
    lat: 19.0620,
    lng: 74.7290,
    popular: true,
  },
  {
    id: 'stop-wadia-park',
    name: 'Wadia Park Stadium',
    nameMarathi: 'वाडिया पार्क स्टेडीअम',
    category: 'landmark',
    lat: 19.0980,
    lng: 74.7450,
    popular: false,
  },
  {
    id: 'stop-premdan',
    name: 'Premdan Chowk',
    nameMarathi: 'प्रेमदान चौक',
    category: 'hub',
    lat: 19.1130,
    lng: 74.7390,
    popular: true,
  },
  {
    id: 'stop-pipeline',
    name: 'Pipeline Road Cross',
    nameMarathi: 'पायपलाईन रोड चौक',
    category: 'residential',
    lat: 19.1280,
    lng: 74.7320,
    popular: true,
  },
  {
    id: 'stop-new-arts',
    name: 'New Arts & Commerce College',
    nameMarathi: 'न्यू आर्ट्स आणि कॉमर्स कॉलेज',
    category: 'college',
    lat: 19.1050,
    lng: 74.7410,
    popular: true,
  },
  {
    id: 'stop-bolhegaon',
    name: 'Bolhegaon Phata',
    nameMarathi: 'बोल्हेगाव फाटा',
    category: 'residential',
    lat: 19.1390,
    lng: 74.7250,
    popular: false,
  },
];
