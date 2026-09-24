export interface PakistanRegion {
  id: string;
  name: string;
  cities: string[];
}

/**
 * Curated major cities per province/territory — not exhaustive. The checkout
 * form's city dropdown appends an "Other" option so a customer is never blocked
 * by a city missing from this list.
 */
export const PAKISTAN_REGIONS: PakistanRegion[] = [
  {
    id: 'punjab',
    name: 'Punjab',
    cities: [
      'Lahore',
      'Rawalpindi',
      'Faisalabad',
      'Multan',
      'Gujranwala',
      'Sialkot',
      'Bahawalpur',
      'Sargodha',
      'Sheikhupura',
      'Rahim Yar Khan',
      'Jhang',
      'Gujrat',
      'Kasur',
      'Okara',
      'Sahiwal',
      'Wah Cantt',
      'Dera Ghazi Khan',
      'Chiniot',
      'Kamoke',
      'Hafizabad',
      'Jhelum',
      'Mianwali',
      'Vehari',
      'Muzaffargarh',
      'Toba Tek Singh',
      'Khanewal',
      'Attock',
      'Nankana Sahib',
      'Pakpattan',
      'Layyah',
      'Chakwal',
    ],
  },
  {
    id: 'sindh',
    name: 'Sindh',
    cities: [
      'Karachi',
      'Hyderabad',
      'Sukkur',
      'Larkana',
      'Nawabshah',
      'Mirpur Khas',
      'Jacobabad',
      'Shikarpur',
      'Dadu',
      'Thatta',
      'Badin',
      'Umerkot',
      'Ghotki',
      'Khairpur',
      'Tando Adam',
      'Tando Allahyar',
    ],
  },
  {
    id: 'kpk',
    name: 'Khyber Pakhtunkhwa',
    cities: [
      'Peshawar',
      'Abbottabad',
      'Mardan',
      'Mingora',
      'Kohat',
      'Bannu',
      'Dera Ismail Khan',
      'Nowshera',
      'Charsadda',
      'Mansehra',
      'Swabi',
      'Haripur',
      'Chitral',
      'Timergara',
    ],
  },
  {
    id: 'balochistan',
    name: 'Balochistan',
    cities: [
      'Quetta',
      'Gwadar',
      'Turbat',
      'Khuzdar',
      'Hub',
      'Sibi',
      'Chaman',
      'Zhob',
      'Dera Murad Jamali',
      'Loralai',
      'Mastung',
      'Pasni',
    ],
  },
  {
    id: 'gilgit_baltistan',
    name: 'Gilgit-Baltistan',
    cities: ['Gilgit', 'Skardu', 'Hunza', 'Ghanche', 'Astore', 'Chilas', 'Gahkuch'],
  },
  {
    id: 'islamabad',
    name: 'Islamabad Capital Territory',
    cities: ['Islamabad'],
  },
];

const FREE_DELIVERY_CITIES = new Set(['rawalpindi', 'islamabad']);

/** Rawalpindi and Islamabad get free delivery regardless of the configured rate. */
export function isFreeDeliveryCity(city: string): boolean {
  return FREE_DELIVERY_CITIES.has(city.trim().toLowerCase());
}
