import shimlaImg from './assets/images/dest_shimla_1794627967150.jpg';
import manaliImg from './assets/images/dest_manali_1794627968033.jpg';
import kasolImg from './assets/images/dest_kasol_1794627969065.jpg';
import spitiImg from './assets/images/dest_spiti_1794627969021.jpg';
import dharamshalaImg from './assets/images/dest_dharamshala_1794639752230.jpg';
import suvImg from './assets/images/vehicle_mountain_suv_1794627969324.jpg';
import type {
  DestinationCategory,
  PackageCategory,
  DifficultyLevel,
  CustomerStatus,
  PaymentStatus,
  PaymentMethod,
  BookingStatus,
  PaymentTxnStatus,
  EnquiryType,
  EnquiryStatus,
  VehicleCategory,
  VehicleStatus,
  CmsSection,
  MarketingKind,
  SettingGroup
} from './types';

export const ASSET_IMAGES = {
  shimla: shimlaImg,
  manali: manaliImg,
  kasol: kasolImg,
  spiti: spitiImg,
  dharamshala: dharamshalaImg,
  suv: suvImg
};

export interface SeedDestination {
  id: string;
  name: string;
  slug: string;
  region: string;
  category: DestinationCategory;
  shortDescription: string;
  description: string;
  bestSeason: string;
  elevation: string;
  imageUrl: string;
  featured: boolean;
  status: 'active' | 'draft' | 'archived';
}

export const SEED_DESTINATIONS: SeedDestination[] = [
  {
    id: 'dest_dharamshala',
    name: 'Dharamshala & McLeod Ganj',
    slug: 'dharamshala-mcleod-ganj',
    region: 'Kangra Valley, HP',
    category: 'Spiritual & Heritage',
    shortDescription: 'Dalai Lama Monastery, Dhauladhar snow peaks, Bhagsu Waterfall, Triund ridge trek, and Kangra tea estates.',
    description: 'Nestled against the dramatic Dhauladhar range, Dharamshala and upper McLeod Ganj blend Tibetan spiritual heritage, pine-shaded monastery walks, the scenic Triund ridge trail, and tranquil Kangra tea gardens.',
    bestSeason: 'March – June, Sep – Nov',
    elevation: '1,457 m',
    imageUrl: dharamshalaImg,
    featured: true,
    status: 'active'
  },
  {
    id: 'dest_shimla',
    name: 'Shimla & Mashobra',
    slug: 'shimla-mashobra',
    region: 'Himachal Pradesh',
    category: 'Hill Station',
    shortDescription: 'Colonial heritage Ridge, Mall Road, Jakhu Temple, Kufri snow trails, and quiet Mashobra apple orchards.',
    description: 'Shimla serves as Live The World’s home base on Mall Road near the Ridge. Guests explore Victorian timber landmarks, cedar sanctuaries in Mashobra, and seasonal snow viewpoints across Kufri and Narkanda.',
    bestSeason: 'March – June, Dec – Jan',
    elevation: '2,276 m',
    imageUrl: shimlaImg,
    featured: true,
    status: 'active'
  },
  {
    id: 'dest_manali',
    name: 'Manali & Solang Valley',
    slug: 'manali-solang-valley',
    region: 'Kullu Valley, HP',
    category: 'Adventure Hub',
    shortDescription: 'High-altitude tandem paragliding, Atal Tunnel expeditions, Rohtang Pass snowfields, and Beas rafting.',
    description: 'Manali and Solang Valley anchor our flagship Himalayan adventure tours—combining certified tandem paragliding flights, winter skiing, Atal Tunnel transits to Sissu, and white-water rafting on the Beas River.',
    bestSeason: 'April – June, Oct – Feb',
    elevation: '2,050 m',
    imageUrl: manaliImg,
    featured: true,
    status: 'active'
  },
  {
    id: 'dest_kasol',
    name: 'Kasol & Parvati Valley',
    slug: 'kasol-parvati-valley',
    region: 'Parvati Valley, HP',
    category: 'Riverside & Trek',
    shortDescription: 'Luxury riverside pine glamping, Manikaran hot springs, Tosh village walks, and Chalal forest trails.',
    description: 'Tucked beside the rushing Parvati River, Kasol and neighbouring villages like Tosh and Kheerganga offer guided forest treks, riverside camp stays, and authentic Himalayan hospitality.',
    bestSeason: 'March – November',
    elevation: '1,580 m',
    imageUrl: kasolImg,
    featured: true,
    status: 'active'
  },
  {
    id: 'dest_spiti',
    name: 'Spiti Valley Circuit',
    slug: 'spiti-valley-circuit',
    region: 'Trans-Himalaya, HP',
    category: 'High-Altitude Expedition',
    shortDescription: 'Centuries-old Key Monastery, Chandratal glacial lake, Kunzum Pass, and rugged 4x4 overland routes.',
    description: 'An unforgettable high-altitude desert circuit traversing Kinnaur, Tabo, Kaza, Key Monastery, and Chandratal Lake with experienced mountain drivers and acclimatization planning.',
    bestSeason: 'May – October',
    elevation: '4,270 m',
    imageUrl: spitiImg,
    featured: true,
    status: 'active'
  }
];

export interface SeedPackage {
  id: string;
  title: string;
  slug: string;
  destinationId: string;
  destinationName: string;
  category: PackageCategory;
  durationDays: number;
  durationNights: number;
  pricePerPerson: number;
  discountPercent: number;
  maxGroupSize: number;
  difficulty: DifficultyLevel;
  inclusions: string[];
  itinerary: string[];
  imageUrl: string;
  galleryImages: string[];
  featured: boolean;
  status: 'active' | 'draft' | 'archived';
}

export const SEED_PACKAGES: SeedPackage[] = [
  {
    id: 'pkg_shimla_retreat',
    title: 'Shimla Classic Hill Retreat',
    slug: 'shimla-classic-hill-retreat',
    destinationId: 'dest_shimla',
    destinationName: 'Shimla & Mashobra',
    category: 'Hill Retreat',
    durationDays: 4,
    durationNights: 3,
    pricePerPerson: 12999,
    discountPercent: 10,
    maxGroupSize: 12,
    difficulty: 'Easy',
    inclusions: ['3 Nights Heritage Boutique Stay', 'Daily Breakfast & Himachali Dinner', 'Private AC Mountain SUV', 'Guided Mall Road & Jakhu Walk'],
    itinerary: [
      'Day 1: Arrival in Shimla, Mall Road & Christ Church twilight walk',
      'Day 2: Kufri Himalayan Nature Park & Mahasu Peak trail',
      'Day 3: Mashobra apple orchard picnic & Chadwick Falls',
      'Day 4: Tara Devi Temple visit and departure transfer'
    ],
    imageUrl: shimlaImg,
    galleryImages: [shimlaImg, suvImg],
    featured: true,
    status: 'active'
  },
  {
    id: 'pkg_manali_adventure',
    title: 'Manali Mountain Adventure & Solang Fly',
    slug: 'manali-mountain-adventure',
    destinationId: 'dest_manali',
    destinationName: 'Manali & Solang Valley',
    category: 'Adventure Sports',
    durationDays: 5,
    durationNights: 4,
    pricePerPerson: 18499,
    discountPercent: 8,
    maxGroupSize: 16,
    difficulty: 'Moderate',
    inclusions: ['4 Nights Alpine Chalet Resort', 'Tandem Paragliding at Solang', 'Beas River White-Water Rafting', 'Atal Tunnel & Sissu Day Excursion'],
    itinerary: [
      'Day 1: Manali check-in, Hadimba Devi Temple & Old Manali cafes',
      'Day 2: Solang Valley tandem paragliding & zipline',
      'Day 3: Atal Tunnel transit to Sissu Waterfall & Lahaul Valley',
      'Day 4: Kullu river rafting & Naggar Castle heritage stop',
      'Day 5: Morning mountain market & return transfer'
    ],
    imageUrl: manaliImg,
    galleryImages: [manaliImg, suvImg],
    featured: true,
    status: 'active'
  },
  {
    id: 'pkg_kasol_riverside',
    title: 'Parvati Valley Riverside Escape',
    slug: 'parvati-valley-riverside-escape',
    destinationId: 'dest_kasol',
    destinationName: 'Kasol & Parvati Valley',
    category: 'Riverside Escape',
    durationDays: 4,
    durationNights: 3,
    pricePerPerson: 10999,
    discountPercent: 5,
    maxGroupSize: 14,
    difficulty: 'Easy',
    inclusions: ['3 Nights Riverside Pine Glamping', 'Bonfire & Acoustic Evening', 'Chalal & Tosh Guided Forest Treks', 'Manikaran Hot Springs Tour'],
    itinerary: [
      'Day 1: Kasol riverside camp arrival & Chalal pine forest walk',
      'Day 2: Manikaran Sahib sulfur springs & local bazaar',
      'Day 3: Full-day scenic trek to Tosh village & waterfall',
      'Day 4: Riverside breakfast & departure'
    ],
    imageUrl: kasolImg,
    galleryImages: [kasolImg],
    featured: true,
    status: 'active'
  },
  {
    id: 'pkg_spiti_expedition',
    title: 'Spiti High-Altitude 4x4 Expedition',
    slug: 'spiti-high-altitude-expedition',
    destinationId: 'dest_spiti',
    destinationName: 'Spiti Valley Circuit',
    category: 'Snow Expedition',
    durationDays: 8,
    durationNights: 7,
    pricePerPerson: 34999,
    discountPercent: 0,
    maxGroupSize: 10,
    difficulty: 'Challenging',
    inclusions: ['7 Nights Stays & Eco-Homestays', 'Dedicated 4x4 Expedition Vehicle', 'Oxygen & First-Aid Support', 'Monastery & Chandratal Permits'],
    itinerary: [
      'Day 1: Shimla to Sangla Valley via Kinnaur highway',
      'Day 2: Chitkul last village & Kalpa apple ridges',
      'Day 3: Nako Lake & Tabo 1000-year monastery',
      'Day 4: Dhankar Monastery & Pin Valley National Park',
      'Day 5: Kaza, Key Monastery & Kibber wildlife ridge',
      'Day 6: Hikkim, Komic & Langza fossil village loop',
      'Day 7: Kunzum Pass & Chandratal Lake camp',
      'Day 8: Atal Tunnel descent to Manali'
    ],
    imageUrl: spitiImg,
    galleryImages: [spitiImg, suvImg],
    featured: true,
    status: 'active'
  }
];

export interface SeedCustomer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  status: CustomerStatus;
  notes: string;
}

export const SEED_CUSTOMERS: SeedCustomer[] = [
  { id: 'cust_aarav', fullName: 'Aarav Sharma', email: 'aarav.sharma@example.in', phone: '+91 98112 45011', city: 'New Delhi', country: 'India', status: 'vip', notes: 'Prefers boutique heritage stays and window seats.' },
  { id: 'cust_meera', fullName: 'Meera Nair', email: 'meera.nair@example.in', phone: '+91 98450 77219', city: 'Bengaluru', country: 'India', status: 'active', notes: 'Booked family holiday for spring break.' },
  { id: 'cust_rohan', fullName: 'Rohan Malhotra', email: 'rohan.malhotra@example.in', phone: '+91 97170 33890', city: 'Chandigarh', country: 'India', status: 'vip', notes: 'Repeat Spiti 4x4 expedition traveler.' },
  { id: 'cust_ananya', fullName: 'Ananya Verma', email: 'ananya.verma@example.in', phone: '+91 98201 66432', city: 'Mumbai', country: 'India', status: 'active', notes: 'Interested in Solang paragliding & Kasol glamping.' },
  { id: 'cust_kabir', fullName: 'Kabir Gill', email: 'kabir.gill@example.in', phone: '+91 98765 21904', city: 'Ludhiana', country: 'India', status: 'active', notes: 'Group trip organizer for 6 college friends.' }
];

export interface SeedVehicle {
  id: string;
  name: string;
  category: VehicleCategory;
  registrationNo: string;
  seatCapacity: number;
  pricePerDay: number;
  pricePerKm: number;
  driverName: string;
  driverPhone: string;
  acAvailable: boolean;
  imageUrl: string;
  status: VehicleStatus;
}

export const SEED_VEHICLES: SeedVehicle[] = [
  { id: 'veh_fortuner', name: 'Toyota Fortuner 4x4 Expedition', category: '4x4 Jeep', registrationNo: 'HP-01A-4403', seatCapacity: 6, pricePerDay: 6500, pricePerKm: 28, driverName: 'Vikram Thakur', driverPhone: '+91 94180 11203', acAvailable: true, imageUrl: suvImg, status: 'available' },
  { id: 'veh_crysta', name: 'Toyota Innova Crysta Alpine', category: 'SUV', registrationNo: 'HP-01A-2219', seatCapacity: 7, pricePerDay: 4200, pricePerKm: 20, driverName: 'Rajesh Chauhan', driverPhone: '+91 94181 55390', acAvailable: true, imageUrl: suvImg, status: 'on_trip' },
  { id: 'veh_urbania', name: 'Force Urbania 13-Seater AC', category: 'Tempo Traveller', registrationNo: 'HP-01T-8812', seatCapacity: 13, pricePerDay: 7800, pricePerKm: 34, driverName: 'Sanjay Negi', driverPhone: '+91 98160 44921', acAvailable: true, imageUrl: suvImg, status: 'available' },
  { id: 'veh_thar', name: 'Mahindra Thar 4x4 Hardtop', category: '4x4 Jeep', registrationNo: 'HP-01A-9045', seatCapacity: 4, pricePerDay: 5200, pricePerKm: 25, driverName: 'Deepak Rana', driverPhone: '+91 94182 33018', acAvailable: true, imageUrl: suvImg, status: 'maintenance' }
];

export interface SeedBooking {
  id: string;
  bookingCode: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  destinationId: string;
  destinationName: string;
  packageId: string;
  packageTitle: string;
  vehicleId: string;
  vehicleName: string;
  travelDate: string;
  returnDate: string;
  adults: number;
  children: number;
  passengerDetails: string;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  bookingStatus: BookingStatus;
  specialRequests: string;
}

export const SEED_BOOKINGS: SeedBooking[] = [
  {
    id: 'bk_ltw_1001',
    bookingCode: 'LTW-2026-1001',
    customerId: 'cust_aarav',
    customerName: 'Aarav Sharma',
    customerEmail: 'aarav.sharma@example.in',
    customerPhone: '+91 98112 45011',
    destinationId: 'dest_manali',
    destinationName: 'Manali & Solang Valley',
    packageId: 'pkg_manali_adventure',
    packageTitle: 'Manali Mountain Adventure & Solang Fly',
    vehicleId: 'veh_crysta',
    vehicleName: 'Toyota Innova Crysta Alpine',
    travelDate: '2026-11-24',
    returnDate: '2026-11-28',
    adults: 2,
    children: 0,
    passengerDetails: 'Aarav Sharma (32), Riya Sharma (29)',
    totalAmount: 36998,
    paidAmount: 36998,
    paymentStatus: 'paid',
    paymentMethod: 'UPI',
    bookingStatus: 'confirmed',
    specialRequests: 'Morning paragliding slot preferred if weather permits.'
  },
  {
    id: 'bk_ltw_1002',
    bookingCode: 'LTW-2026-1002',
    customerId: 'cust_meera',
    customerName: 'Meera Nair',
    customerEmail: 'meera.nair@example.in',
    customerPhone: '+91 98450 77219',
    destinationId: 'dest_shimla',
    destinationName: 'Shimla & Mashobra',
    packageId: 'pkg_shimla_retreat',
    packageTitle: 'Shimla Classic Hill Retreat',
    vehicleId: 'veh_crysta',
    vehicleName: 'Toyota Innova Crysta Alpine',
    travelDate: '2026-12-03',
    returnDate: '2026-12-06',
    adults: 2,
    children: 2,
    passengerDetails: 'Meera Nair (37), Karthik Nair (39), Diya (9), Vivaan (6)',
    totalAmount: 42500,
    paidAmount: 15000,
    paymentStatus: 'partial',
    paymentMethod: 'Card',
    bookingStatus: 'pending',
    specialRequests: 'Adjoining rooms in heritage wing with vegetarian meals.'
  },
  {
    id: 'bk_ltw_1003',
    bookingCode: 'LTW-2026-1003',
    customerId: 'cust_rohan',
    customerName: 'Rohan Malhotra',
    customerEmail: 'rohan.malhotra@example.in',
    customerPhone: '+91 97170 33890',
    destinationId: 'dest_spiti',
    destinationName: 'Spiti Valley Circuit',
    packageId: 'pkg_spiti_expedition',
    packageTitle: 'Spiti High-Altitude 4x4 Expedition',
    vehicleId: 'veh_fortuner',
    vehicleName: 'Toyota Fortuner 4x4 Expedition',
    travelDate: '2026-10-12',
    returnDate: '2026-10-19',
    adults: 3,
    children: 0,
    passengerDetails: 'Rohan Malhotra (34), Siddharth Kapoor (33), Aman Joshi (35)',
    totalAmount: 104997,
    paidAmount: 104997,
    paymentStatus: 'paid',
    paymentMethod: 'Bank Transfer',
    bookingStatus: 'completed',
    specialRequests: 'Extra camera gear space in roof carrier.'
  },
  {
    id: 'bk_ltw_1004',
    bookingCode: 'LTW-2026-1004',
    customerId: 'cust_ananya',
    customerName: 'Ananya Verma',
    customerEmail: 'ananya.verma@example.in',
    customerPhone: '+91 98201 66432',
    destinationId: 'dest_kasol',
    destinationName: 'Kasol & Parvati Valley',
    packageId: 'pkg_kasol_riverside',
    packageTitle: 'Parvati Valley Riverside Escape',
    vehicleId: 'veh_urbania',
    vehicleName: 'Force Urbania 13-Seater AC',
    travelDate: '2026-12-14',
    returnDate: '2026-12-17',
    adults: 4,
    children: 0,
    passengerDetails: 'Ananya Verma, Niharika Sen, Devika Rao, Priya Kulkarni',
    totalAmount: 43996,
    paidAmount: 43996,
    paymentStatus: 'paid',
    paymentMethod: 'UPI',
    bookingStatus: 'confirmed',
    specialRequests: 'River-facing luxury tents requested.'
  },
  {
    id: 'bk_ltw_1005',
    bookingCode: 'LTW-2026-1005',
    customerId: 'cust_kabir',
    customerName: 'Kabir Gill',
    customerEmail: 'kabir.gill@example.in',
    customerPhone: '+91 98765 21904',
    destinationId: 'dest_manali',
    destinationName: 'Manali & Solang Valley',
    packageId: 'pkg_manali_adventure',
    packageTitle: 'Manali Mountain Adventure & Solang Fly',
    vehicleId: 'veh_urbania',
    vehicleName: 'Force Urbania 13-Seater AC',
    travelDate: '2026-11-18',
    returnDate: '2026-11-22',
    adults: 6,
    children: 0,
    passengerDetails: 'Kabir Gill + 5 travelers from Chandigarh',
    totalAmount: 110994,
    paidAmount: 0,
    paymentStatus: 'refunded',
    paymentMethod: 'Card',
    bookingStatus: 'cancelled',
    specialRequests: 'Cancelled due to schedule shift; full credit issued.'
  }
];

export interface SeedPayment {
  id: string;
  bookingId: string;
  bookingCode: string;
  customerName: string;
  amount: number;
  method: PaymentMethod;
  transactionRef: string;
  status: PaymentTxnStatus;
}

export const SEED_PAYMENTS: SeedPayment[] = [
  { id: 'pay_1001', bookingId: 'bk_ltw_1001', bookingCode: 'LTW-2026-1001', customerName: 'Aarav Sharma', amount: 36998, method: 'UPI', transactionRef: 'UPI-6319820411', status: 'paid' },
  { id: 'pay_1002', bookingId: 'bk_ltw_1002', bookingCode: 'LTW-2026-1002', customerName: 'Meera Nair', amount: 15000, method: 'Card', transactionRef: 'CARD-99402817', status: 'paid' },
  { id: 'pay_1003', bookingId: 'bk_ltw_1003', bookingCode: 'LTW-2026-1003', customerName: 'Rohan Malhotra', amount: 104997, method: 'Bank Transfer', transactionRef: 'NEFT-LTW-88321', status: 'paid' },
  { id: 'pay_1004', bookingId: 'bk_ltw_1004', bookingCode: 'LTW-2026-1004', customerName: 'Ananya Verma', amount: 43996, method: 'UPI', transactionRef: 'UPI-6321004912', status: 'paid' }
];

export interface SeedEnquiry {
  id: string;
  type: EnquiryType;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  subject: string;
  packageTitle: string;
  preferredDate: string;
  travelersCount: number;
  message: string;
  status: EnquiryStatus;
  adminReply: string;
}

export const SEED_ENQUIRIES: SeedEnquiry[] = [
  {
    id: 'enq_101',
    type: 'tour',
    senderName: 'Vikramaditya Bose',
    senderEmail: 'vbose@example.in',
    senderPhone: '+91 98300 12940',
    subject: 'Winter Snow & Solang Paragliding Availability',
    packageTitle: 'Manali Mountain Adventure & Solang Fly',
    preferredDate: '2026-12-22',
    travelersCount: 4,
    message: 'Hi Live The World team, are tandem paragliding flights operating in late December from Solang Valley? We also need Chandigarh pickup.',
    status: 'new',
    adminReply: ''
  },
  {
    id: 'enq_102',
    type: 'custom_trip',
    senderName: 'Neha Deshmukh',
    senderEmail: 'neha.deshmukh@example.in',
    senderPhone: '+91 98231 44012',
    subject: 'Custom Shimla + Kasol 6-Day Honeymoon Itinerary',
    packageTitle: 'Shimla Classic Hill Retreat',
    preferredDate: '2026-11-30',
    travelersCount: 2,
    message: 'Looking for a combined Mashobra orchard cottage and Kasol riverside luxury tent itinerary with a private sedan or Innova.',
    status: 'in_progress',
    adminReply: 'Draft itinerary sent via email with Toyota Innova Crysta pricing.'
  },
  {
    id: 'enq_103',
    type: 'contact',
    senderName: 'Siddharth Rao',
    senderEmail: 'siddharth.rao@example.in',
    senderPhone: '+91 99001 77420',
    subject: 'Corporate Offsite Tempo Traveller Quote',
    packageTitle: '',
    preferredDate: '2026-12-08',
    travelersCount: 12,
    message: 'Need 13-seater Force Urbania from Shimla Railway Station to Narkanda for a 3-day team retreat.',
    status: 'resolved',
    adminReply: 'Confirmed Force Urbania availability at ₹7,800/day; quote accepted.'
  }
];

export interface SeedCmsItem {
  id: string;
  section: CmsSection;
  title: string;
  subtitle: string;
  body: string;
  authorName: string;
  authorRole: string;
  rating: number;
  category: string;
  imageUrl: string;
  sortOrder: number;
  status: 'published' | 'draft';
}

export const SEED_CMS_ITEMS: SeedCmsItem[] = [
  {
    id: 'cms_home_hero',
    section: 'homepage',
    title: 'Authentic Himalayan Expeditions From Shimla to Spiti',
    subtitle: 'Handcrafted mountain retreats, adventure sports, and private 4x4 journeys led by local Himachali specialists.',
    body: 'Based on The Mall Road near The Ridge in Shimla, Live The World designs safe, deeply local itineraries across Shimla, Manali, Solang Valley, Kasol, and Spiti.',
    authorName: '',
    authorRole: '',
    rating: 5,
    category: 'Hero Banner',
    imageUrl: manaliImg,
    sortOrder: 1,
    status: 'published'
  },
  {
    id: 'cms_about_story',
    section: 'about',
    title: 'Born in the Himalayas — Trusted Since Day One',
    subtitle: 'Local mountain expertise, certified adventure partners, and transparent pricing.',
    body: 'Live The World operates directly from Shimla, Himachal Pradesh. Every route is personally vetted by our mountain-certified drivers, trekking guides, and boutique lodge hosts.',
    authorName: '',
    authorRole: '',
    rating: 5,
    category: 'Company Story',
    imageUrl: shimlaImg,
    sortOrder: 1,
    status: 'published'
  },
  {
    id: 'cms_service_adventure',
    section: 'services',
    title: 'Paragliding, Rafting & High-Altitude Treks',
    subtitle: 'Safety-audited Solang Valley flights and Beas River expeditions.',
    body: 'Certified pilots, international-grade harnesses, and small-group trekking permits managed end-to-end.',
    authorName: '',
    authorRole: '',
    rating: 5,
    category: 'Adventure Sports',
    imageUrl: manaliImg,
    sortOrder: 1,
    status: 'published'
  },
  {
    id: 'cms_service_fleet',
    section: 'services',
    title: 'Private Mountain Fleet & Certified Drivers',
    subtitle: '4x4 SUVs, Innova Crystas, and AC Tempo Travellers built for Himalayan terrain.',
    body: 'Well-maintained mountain vehicles with experienced hill drivers familiar with Rohtang, Atal Tunnel, and Spiti passes.',
    authorName: '',
    authorRole: '',
    rating: 5,
    category: 'Transportation',
    imageUrl: suvImg,
    sortOrder: 2,
    status: 'published'
  },
  {
    id: 'cms_gallery_parvati',
    section: 'gallery',
    title: 'Morning Mist at Parvati Riverside Camp',
    subtitle: 'Kasol Pine Sanctuary',
    body: 'Early morning sunlight filtering through deodar pines along the Parvati River.',
    authorName: '',
    authorRole: '',
    rating: 5,
    category: 'Parvati Valley',
    imageUrl: kasolImg,
    sortOrder: 1,
    status: 'published'
  },
  {
    id: 'cms_testimonial_1',
    section: 'testimonials',
    title: 'Seamless Spiti 4x4 Expedition',
    subtitle: 'Key Monastery & Chandratal Circuit',
    body: 'Live The World handled every permit, homestay, and high-pass transit effortlessly. Vikram ji knew every bend from Kinnaur to Kaza.',
    authorName: 'Rohan Malhotra',
    authorRole: 'Expedition Traveler, Chandigarh',
    rating: 5,
    category: 'Spiti Valley',
    imageUrl: spitiImg,
    sortOrder: 1,
    status: 'published'
  },
  {
    id: 'cms_faq_1',
    section: 'faqs',
    title: 'What is included in private mountain cab packages?',
    subtitle: 'Transfers, tolls, fuel, and hill driver allowance',
    body: 'All private cab packages include fuel, Himachal state road taxes, parking, toll charges, and driver night allowance with zero hidden charges.',
    authorName: '',
    authorRole: '',
    rating: 5,
    category: 'Transport & Pricing',
    imageUrl: '',
    sortOrder: 1,
    status: 'published'
  },
  {
    id: 'cms_blog_1',
    section: 'blog',
    title: 'Best Months to Visit Solang Valley & Rohtang Pass',
    subtitle: 'Seasonal packing, snow windows, and paragliding weather guide',
    body: 'From April alpine meadows to December snowfall, discover when to plan your Manali adventure and how Atal Tunnel keeps Lahaul accessible year-round.',
    authorName: 'Live The World Editorial',
    authorRole: 'Shimla Travel Desk',
    rating: 5,
    category: 'Travel Guides',
    imageUrl: manaliImg,
    sortOrder: 1,
    status: 'published'
  }
];

export interface SeedMarketing {
  id: string;
  kind: MarketingKind;
  pageKey: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  bannerTitle: string;
  bannerCta: string;
  platform: string;
  url: string;
  status: 'active' | 'inactive';
}

export const SEED_MARKETING: SeedMarketing[] = [
  {
    id: 'mkt_seo_home',
    kind: 'seo_page',
    pageKey: 'homepage',
    metaTitle: 'Live The World | Himalayan Travel, Shimla, Manali & Kasol Tour Packages',
    metaDescription: 'Book curated Shimla hill retreats, Manali Solang Valley paragliding, Kasol riverside camps, and 4x4 Spiti expeditions with Live The World.',
    keywords: 'Live The World, Shimla tour packages, Manali adventure, Solang Valley paragliding, Kasol riverside camping',
    bannerTitle: '',
    bannerCta: '',
    platform: '',
    url: 'https://livestheworld.com/',
    status: 'active'
  },
  {
    id: 'mkt_banner_winter',
    kind: 'banner',
    pageKey: 'winter-promo',
    metaTitle: '',
    metaDescription: '',
    keywords: '',
    bannerTitle: 'Winter Snow Departures: Save 10% on Shimla & Manali Retreats',
    bannerCta: 'Explore Packages',
    platform: '',
    url: 'https://livestheworld.com/packages',
    status: 'active'
  },
  {
    id: 'mkt_social_ig',
    kind: 'social_link',
    pageKey: 'instagram',
    metaTitle: '',
    metaDescription: '',
    keywords: '',
    bannerTitle: '',
    bannerCta: '',
    platform: 'Instagram',
    url: 'https://instagram.com/livestheworld',
    status: 'active'
  },
  {
    id: 'mkt_social_wa',
    kind: 'social_link',
    pageKey: 'whatsapp',
    metaTitle: '',
    metaDescription: '',
    keywords: '',
    bannerTitle: '',
    bannerCta: '',
    platform: 'WhatsApp Business',
    url: 'https://wa.me/918764044003',
    status: 'active'
  }
];

export interface SeedSetting {
  id: string;
  group: SettingGroup;
  siteName?: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  currency?: string;
  timezone?: string;
  taxPercent?: number;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  razorpayEnabled?: boolean;
  stripeEnabled?: boolean;
  upiEnabled?: boolean;
  bankDetails?: string;
  maintenanceMode?: boolean;
}

export const SEED_SETTINGS: SeedSetting[] = [
  {
    id: 'setting_general',
    group: 'general',
    siteName: 'Live The World',
    tagline: 'Himalayan Journeys, Adventure & Mountain Retreats',
    contactEmail: 'livetheworld099@gmail.com',
    contactPhone: '+91 87640 44003',
    address: 'The Mall Road, Near Ridge, Shimla, Himachal Pradesh 171001',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    taxPercent: 5
  },
  {
    id: 'setting_website',
    group: 'website',
    siteName: 'Live The World',
    tagline: 'Explore Shimla, Manali, Kasol & Spiti Valley',
    maintenanceMode: false
  },
  {
    id: 'setting_email',
    group: 'email',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: 'livetheworld099@gmail.com'
  },
  {
    id: 'setting_payment',
    group: 'payment',
    razorpayEnabled: true,
    stripeEnabled: false,
    upiEnabled: true,
    bankDetails: 'Live The World Travels · HDFC Bank Shimla · IFSC: HDFC0000492'
  }
];
