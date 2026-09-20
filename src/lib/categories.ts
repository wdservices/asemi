export interface IndustryCategory {
  id: string;
  name: string;
  description: string;
  badge: string;
}

export const PRODUCT_CATEGORIES: IndustryCategory[] = [
  {
    id: "Food & Edibles",
    name: "Food & Edibles",
    description:
      "Packaged foods, grains, dairy, snacks, baby food, spices, bakery, confectioneries",
    badge: "Food & Edibles",
  },
  {
    id: "Beverages & Drinks",
    name: "Beverages & Drinks",
    description: "Bottled water, juices, soft drinks, energy drinks, spirits, beer, wine",
    badge: "Beverages & Drinks",
  },
  {
    id: "Soaps, Detergents & Cleaning",
    name: "Soaps, Detergents & Cleaning",
    description:
      "Bar soaps, liquid hand soaps, laundry detergents, surface disinfectants, dishwash",
    badge: "Soaps & Cleaning",
  },
  {
    id: "Cosmetics & Personal Care",
    name: "Cosmetics & Personal Care",
    description:
      "Skincare, haircare, body creams, perfumes, deodorant, oral care, beauty & toiletries",
    badge: "Cosmetics & Personal Care",
  },
  {
    id: "Pharmaceuticals & Healthcare",
    name: "Pharmaceuticals & Healthcare",
    description:
      "Prescription drugs, OTC medicines, syrups, vaccines, vitamins & dietary supplements",
    badge: "Pharmaceuticals & Healthcare",
  },
  {
    id: "Chemicals & Petrochemicals",
    name: "Chemicals & Petrochemicals",
    description:
      "Industrial chemicals, solvents, paints, varnishes, lubricants, adhesives, reagents",
    badge: "Chemicals & Petrochemicals",
  },
  {
    id: "Agrochemicals, Seeds & Animal Feed",
    name: "Agrochemicals, Seeds & Animal Care",
    description:
      "Pesticides, herbicides, fertilizers, hybrid seeds, animal feed, veterinary medicines",
    badge: "Agrochemicals & Animal Care",
  },
  {
    id: "Electronics, Electrical & Appliances",
    name: "Electronics, Electrical & Appliances",
    description: "Smartphones, chargers, cables, consumer gadgets, household appliances, batteries",
    badge: "Electronics & Appliances",
  },
  {
    id: "Automotive & Spare Parts",
    name: "Automotive & Spare Parts",
    description:
      "Vehicle replacement parts, brake pads, motor oils, engine filters, automotive tires",
    badge: "Automotive & Spare Parts",
  },
  {
    id: "Fashion, Apparel & Luxury Goods",
    name: "Fashion, Apparel & Luxury Goods",
    description: "Designer apparel, shoes, luxury leather bags, watches, fine jewelry, accessories",
    badge: "Fashion & Luxury Goods",
  },
  {
    id: "Building Materials & Hardware",
    name: "Building Materials & Hardware",
    description:
      "Cement, steel rods, electrical wiring, plumbing, ceramic tiles, roofing, structural hardware",
    badge: "Building Materials & Hardware",
  },
  {
    id: "Tobacco & Smoking Alternatives",
    name: "Tobacco & Smoking Alternatives",
    description: "Cigarettes, cigars, pipe tobacco, vapes, e-liquids, smokeless nicotine products",
    badge: "Tobacco & Alternatives",
  },
  {
    id: "Other",
    name: "Other (Specify Custom Category)",
    description: "Any unique or specialized product category not listed above",
    badge: "Custom Category",
  },
];
