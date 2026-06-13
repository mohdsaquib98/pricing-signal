export interface SKUData {
  sku: string
  brand: string
  ourPrice: number
  competitorPrice: number
  buyBoxStatus: 'Won' | 'Lost'
  marginFloor: number
  lastChanged: string
}

export const sampleData: SKUData[] = [
  {
    sku: 'SKU-001',
    brand: 'Natura Casa',
    ourPrice: 1299,
    competitorPrice: 1199,
    buyBoxStatus: 'Lost',
    marginFloor: 1050,
    lastChanged: '3 days ago',
  },
  {
    sku: 'SKU-002',
    brand: 'Natura Casa',
    ourPrice: 849,
    competitorPrice: 860,
    buyBoxStatus: 'Won',
    marginFloor: 720,
    lastChanged: 'Today',
  },
  {
    sku: 'SKU-003',
    brand: 'LivSpace Pro',
    ourPrice: 2499,
    competitorPrice: 2199,
    buyBoxStatus: 'Lost',
    marginFloor: 1800,
    lastChanged: '6 days ago',
  },
  {
    sku: 'SKU-004',
    brand: 'LivSpace Pro',
    ourPrice: 599,
    competitorPrice: 610,
    buyBoxStatus: 'Won',
    marginFloor: 480,
    lastChanged: '2 days ago',
  },
  {
    sku: 'SKU-005',
    brand: 'Artisan Home',
    ourPrice: 3799,
    competitorPrice: 3750,
    buyBoxStatus: 'Lost',
    marginFloor: 3200,
    lastChanged: '1 day ago',
  },
  {
    sku: 'SKU-006',
    brand: 'Artisan Home',
    ourPrice: 1150,
    competitorPrice: 1390,
    buyBoxStatus: 'Won',
    marginFloor: 900,
    lastChanged: 'Today',
  },
  {
    sku: 'SKU-007',
    brand: 'Nordic Basics',
    ourPrice: 449,
    competitorPrice: 399,
    buyBoxStatus: 'Lost',
    marginFloor: 420,
    lastChanged: '5 days ago',
  },
  {
    sku: 'SKU-008',
    brand: 'Nordic Basics',
    ourPrice: 2199,
    competitorPrice: 2100,
    buyBoxStatus: 'Lost',
    marginFloor: 1750,
    lastChanged: '4 days ago',
  },
]
