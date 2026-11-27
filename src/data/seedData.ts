import { Property } from '../types';

export const SEED_IMAGES = {
  singleSunlit: '/src/assets/images/room_single_sunlit_1795760870263.jpg',
  twinModern: '/src/assets/images/room_twin_modern_1795760871002.jpg',
  studioBalcony: '/src/assets/images/room_studio_balcony_1795760870263.jpg',
  cozyCorner: '/src/assets/images/room_cozy_corner_1795760872624.jpg',
  commonLounge: '/src/assets/images/hostel_common_lounge_1795760873361.jpg',
} as const;

export const INITIAL_PROPERTIES: Property[] = [
  {
    id: 'prop-horizon-koramangala',
    name: 'Horizon Residency PG',
    location: 'Koramangala, Bengaluru',
    owner: {
      name: 'Rajeshwari Menon',
      phone: '+91 98450 32140',
      email: 'rajeshwari@horizonpg.in',
    },
    updatedAt: '2026-11-20T09:30:00.000Z',
    floors: [
      {
        id: 'fl-hor-0',
        name: 'Ground Floor',
        rooms: [
          {
            id: 'rm-hor-g01',
            label: 'G-01',
            rent: 11500,
            status: 'available',
            utilities: { electricity: false, water: true, gas: true },
            images: [SEED_IMAGES.singleSunlit, SEED_IMAGES.commonLounge],
            maintenanceNotes:
              'Freshly painted last month. Dedicated 100 Mbps Wi-Fi router on floor, RO drinking water dispenser outside corridor, housekeeping three times a week.',
          },
          {
            id: 'rm-hor-g02',
            label: 'G-02',
            rent: 9200,
            status: 'occupied',
            utilities: { electricity: false, water: true, gas: true },
            images: [SEED_IMAGES.twinModern],
            maintenanceNotes:
              'Twin-sharing layout with individual lockable wardrobes and study lamps. Plumbing and geyser serviced in October.',
          },
          {
            id: 'rm-hor-g03',
            label: 'G-03',
            rent: 9200,
            status: 'available',
            utilities: { electricity: true, water: true, gas: false },
            images: [SEED_IMAGES.cozyCorner, SEED_IMAGES.commonLounge],
            maintenanceNotes:
              'Quiet courtyard-facing corner room. Mosquito mesh installed on all windows; power backup covers lights, fan, and laptop sockets.',
          },
          {
            id: 'rm-hor-g04',
            label: 'G-04',
            rent: 10800,
            status: 'occupied',
            utilities: { electricity: false, water: true, gas: true },
            images: [SEED_IMAGES.singleSunlit],
            maintenanceNotes:
              'Private single room near reception with biometric main entrance access and CCTV in common hallway.',
          },
        ],
      },
      {
        id: 'fl-hor-1',
        name: 'Floor 1',
        rooms: [
          {
            id: 'rm-hor-101',
            label: '101',
            rent: 14500,
            status: 'available',
            utilities: { electricity: false, water: true, gas: true },
            images: [SEED_IMAGES.studioBalcony, SEED_IMAGES.commonLounge],
            maintenanceNotes:
              'East-facing balcony room with 1.5-ton inverter split AC (filter cleaned Nov 2026). Attached washroom with instant 25L water heater.',
          },
          {
            id: 'rm-hor-102',
            label: '102',
            rent: 12000,
            status: 'occupied',
            utilities: { electricity: false, water: true, gas: true },
            images: [SEED_IMAGES.singleSunlit],
            maintenanceNotes:
              'Ergonomic study chair replaced recently. Laundry washing machine shared on terrace with weekly sanitization.',
          },
          {
            id: 'rm-hor-103',
            label: '103',
            rent: 9500,
            status: 'available',
            utilities: { electricity: true, water: true, gas: true },
            images: [SEED_IMAGES.twinModern, SEED_IMAGES.cozyCorner],
            maintenanceNotes:
              'All-inclusive twin sharing room. Ceiling fan and LED battens newly upgraded; mattress protectors replaced every tenancy.',
          },
          {
            id: 'rm-hor-104',
            label: '104',
            rent: 12200,
            status: 'occupied',
            utilities: { electricity: false, water: true, gas: false },
            images: [SEED_IMAGES.cozyCorner],
            maintenanceNotes:
              'Well-ventilated single occupancy unit with blackout curtains and shoe rack at entrance.',
          },
          {
            id: 'rm-hor-105',
            label: '105',
            rent: 14200,
            status: 'available',
            utilities: { electricity: false, water: true, gas: true },
            images: [SEED_IMAGES.studioBalcony],
            maintenanceNotes:
              'Corner balcony room overlooking tree-lined street. Sub-meter installed outside door for transparent monthly electricity billing.',
          },
        ],
      },
      {
        id: 'fl-hor-2',
        name: 'Floor 2',
        rooms: [
          {
            id: 'rm-hor-201',
            label: '201',
            rent: 11800,
            status: 'occupied',
            utilities: { electricity: false, water: true, gas: true },
            images: [SEED_IMAGES.singleSunlit],
            maintenanceNotes:
              'Top-floor sunlit room with acoustic window glazing and direct access to rooftop pantry.',
          },
          {
            id: 'rm-hor-202',
            label: '202',
            rent: 8800,
            status: 'available',
            utilities: { electricity: false, water: true, gas: true },
            images: [SEED_IMAGES.twinModern],
            maintenanceNotes:
              'Budget twin-sharing bed with two dedicated oak desks, pinboards, and high-speed dual-band Wi-Fi.',
          },
          {
            id: 'rm-hor-203',
            label: '203',
            rent: 13500,
            status: 'occupied',
            utilities: { electricity: true, water: true, gas: true },
            images: [SEED_IMAGES.studioBalcony],
            maintenanceNotes:
              'Premium single suite with split AC, mini bookshelf, and weekly linen change included.',
          },
          {
            id: 'rm-hor-204',
            label: '204',
            rent: 11200,
            status: 'available',
            utilities: { electricity: false, water: true, gas: true },
            images: [SEED_IMAGES.cozyCorner],
            maintenanceNotes:
              'Newly inspected bathroom fittings and fresh water-resistant paint. Zero seepage, quiet academic corridor.',
          },
        ],
      },
    ],
  },
  {
    id: 'prop-cedar-hinjewadi',
    name: 'Cedar Grove Student Hostel',
    location: 'Hinjewadi, Pune',
    owner: {
      name: 'Vikramaditya Deshmukh',
      phone: '+91 97641 88210',
      email: 'vikram@cedargrovehostel.in',
    },
    updatedAt: '2026-11-22T14:15:00.000Z',
    floors: [
      {
        id: 'fl-ced-0',
        name: 'Ground Floor',
        rooms: [
          {
            id: 'rm-ced-g01',
            label: 'G-01',
            rent: 7800,
            status: 'available',
            utilities: { electricity: true, water: true, gas: true },
            images: [SEED_IMAGES.twinModern, SEED_IMAGES.commonLounge],
            maintenanceNotes:
              'Walking distance to Phase 1 IT shuttle stop. Solar water heating system operational 24/7; pest control conducted quarterly.',
          },
          {
            id: 'rm-ced-g02',
            label: 'G-02',
            rent: 7500,
            status: 'occupied',
            utilities: { electricity: true, water: true, gas: false },
            images: [SEED_IMAGES.cozyCorner],
            maintenanceNotes:
              'Ground floor room with easy bicycle parking access and biometric attendance gate.',
          },
          {
            id: 'rm-ced-g03',
            label: 'G-03',
            rent: 9800,
            status: 'available',
            utilities: { electricity: false, water: true, gas: true },
            images: [SEED_IMAGES.singleSunlit],
            maintenanceNotes:
              'Private room with oak study desk, full-length wardrobe, and 24-hour generator backup.',
          },
          {
            id: 'rm-ced-g04',
            label: 'G-04',
            rent: 7800,
            status: 'occupied',
            utilities: { electricity: true, water: true, gas: true },
            images: [SEED_IMAGES.twinModern],
            maintenanceNotes:
              'Clean vitrified tile flooring, newly serviced exhaust fan, and dedicated drinking water tap.',
          },
        ],
      },
      {
        id: 'fl-ced-1',
        name: 'Floor 1',
        rooms: [
          {
            id: 'rm-ced-101',
            label: '101',
            rent: 11500,
            status: 'available',
            utilities: { electricity: false, water: true, gas: true },
            images: [SEED_IMAGES.studioBalcony, SEED_IMAGES.commonLounge],
            maintenanceNotes:
              'Spacious balcony room with split AC and fiber-optic LAN port at study desk. Deep-cleaned this week.',
          },
          {
            id: 'rm-ced-102',
            label: '102',
            rent: 8200,
            status: 'occupied',
            utilities: { electricity: true, water: true, gas: true },
            images: [SEED_IMAGES.twinModern],
            maintenanceNotes:
              'Twin occupancy with separate steel storage lockers and common induction kitchenette on the landing.',
          },
          {
            id: 'rm-ced-103',
            label: '103',
            rent: 10200,
            status: 'available',
            utilities: { electricity: false, water: true, gas: false },
            images: [SEED_IMAGES.cozyCorner],
            maintenanceNotes:
              'Cross-ventilated corner room with quiet garden outlook. Routine electrical safety audit passed in Nov 2026.',
          },
          {
            id: 'rm-ced-104',
            label: '104',
            rent: 11200,
            status: 'occupied',
            utilities: { electricity: false, water: true, gas: true },
            images: [SEED_IMAGES.singleSunlit],
            maintenanceNotes:
              'Single occupancy suite with attached bathroom and weekly room sanitization.',
          },
        ],
      },
    ],
  },
  {
    id: 'prop-maple-delhi',
    name: 'Maple Court Scholars PG',
    location: 'North Campus, Delhi',
    owner: {
      name: 'Ananya Malhotra',
      phone: '+91 98112 64590',
      email: 'ananya@maplecourtpg.in',
    },
    updatedAt: '2026-11-24T17:45:00.000Z',
    floors: [
      {
        id: 'fl-map-1',
        name: 'Floor 1',
        rooms: [
          {
            id: 'rm-map-101',
            label: '101',
            rent: 13800,
            status: 'available',
            utilities: { electricity: false, water: true, gas: true },
            images: [SEED_IMAGES.studioBalcony, SEED_IMAGES.commonLounge],
            maintenanceNotes:
              '5 minutes from Vishwavidyalaya Metro. Split AC, study desk with bookshelf, and daily corridor housekeeping. Geyser serviced for winter.',
          },
          {
            id: 'rm-map-102',
            label: '102',
            rent: 9600,
            status: 'occupied',
            utilities: { electricity: false, water: true, gas: true },
            images: [SEED_IMAGES.twinModern],
            maintenanceNotes:
              'Twin-sharing academic room with two desks, bright daylight window, and RO water purifier on floor.',
          },
          {
            id: 'rm-map-103',
            label: '103',
            rent: 12400,
            status: 'available',
            utilities: { electricity: true, water: true, gas: true },
            images: [SEED_IMAGES.singleSunlit],
            maintenanceNotes:
              'All bills included up to 120 units/month. Wooden wardrobe, orthopedic single mattress, and 24/7 caretaker support.',
          },
          {
            id: 'rm-map-104',
            label: '104',
            rent: 9600,
            status: 'occupied',
            utilities: { electricity: false, water: true, gas: true },
            images: [SEED_IMAGES.cozyCorner],
            maintenanceNotes:
              'Quiet rear-facing room preferred by exam aspirants. Inverter backup connected to desk lamp and Wi-Fi.',
          },
          {
            id: 'rm-map-105',
            label: '105',
            rent: 11800,
            status: 'occupied',
            utilities: { electricity: false, water: true, gas: false },
            images: [SEED_IMAGES.singleSunlit],
            maintenanceNotes:
              'Single occupancy with attached washroom and newly installed shower mixer.',
          },
        ],
      },
      {
        id: 'fl-map-2',
        name: 'Floor 2',
        rooms: [
          {
            id: 'rm-map-201',
            label: '201',
            rent: 12900,
            status: 'available',
            utilities: { electricity: false, water: true, gas: true },
            images: [SEED_IMAGES.cozyCorner, SEED_IMAGES.commonLounge],
            maintenanceNotes:
              'Sunlit second-floor room with large window overlooking park. Fresh curtains and newly serviced ceiling fan.',
          },
          {
            id: 'rm-map-202',
            label: '202',
            rent: 9000,
            status: 'available',
            utilities: { electricity: false, water: true, gas: true },
            images: [SEED_IMAGES.twinModern],
            maintenanceNotes:
              'Affordable twin-sharing space with high-speed Wi-Fi, shared fridge on landing, and biometric entry.',
          },
          {
            id: 'rm-map-203',
            label: '203',
            rent: 13500,
            status: 'occupied',
            utilities: { electricity: false, water: true, gas: true },
            images: [SEED_IMAGES.studioBalcony],
            maintenanceNotes:
              'Balcony studio room with AC and full-size desk. Roof waterproofing inspected before monsoon.',
          },
          {
            id: 'rm-map-204',
            label: '204',
            rent: 11500,
            status: 'occupied',
            utilities: { electricity: true, water: true, gas: true },
            images: [SEED_IMAGES.singleSunlit],
            maintenanceNotes:
              'Compact single room with all utilities covered and access to common study lounge.',
          },
        ],
      },
    ],
  },
];
