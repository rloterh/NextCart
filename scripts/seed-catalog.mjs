#!/usr/bin/env node
// Seed demo vendors, stores, and products with high-quality Unsplash imagery.
// Idempotent: reruns upsert existing rows by deterministic slug.
// Usage:
//   node --env-file=.env.local scripts/seed-catalog.mjs
//   node --env-file=.env.local scripts/seed-catalog.mjs --clear

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CLEAR_MODE = process.argv.includes("--clear");

const UNSPLASH = (id, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const CATEGORY_IMAGES = {
  electronics: UNSPLASH("1498049794561-7780e7231661", 1200),
  fashion: UNSPLASH("1490481651871-ab68de25d43d", 1200),
  "home-living": UNSPLASH("1555041469-a586c61ea9bc", 1200),
  "sports-outdoors": UNSPLASH("1517836357463-d25dfeac3438", 1200),
  "books-media": UNSPLASH("1495446815901-a7297e633e8d", 1200),
  "beauty-health": UNSPLASH("1608248543803-ba4f8c70ae0b", 1200),
  smartphones: UNSPLASH("1592750475338-74b7b21085ab", 1200),
  laptops: UNSPLASH("1496181133206-80ce9b88a853", 1200),
  audio: UNSPLASH("1505740420928-5e560c06d30e", 1200),
  men: UNSPLASH("1521572163474-6864f9cf17ab", 1200),
  women: UNSPLASH("1551232864-3f0890e580d9", 1200),
  accessories: UNSPLASH("1523275335684-37898b6baf30", 1200),
};

const VENDORS = [
  {
    email: "demo-vendor-northward@nextcart.local",
    full_name: "Northward Goods Studio",
    store: {
      name: "Northward Goods",
      slug: "northward-goods",
      description:
        "Quietly confident home and fashion essentials from independent Northern European makers. Natural fibres, considered proportions, and honest craft.",
      banner: UNSPLASH("1556228453-efd6c1ff04f6", 1600),
      logo: UNSPLASH("1519741497674-611481863552", 320),
    },
  },
  {
    email: "demo-vendor-circuit@nextcart.local",
    full_name: "Circuit Bureau",
    store: {
      name: "Circuit Bureau",
      slug: "circuit-bureau",
      description:
        "A curated electronics house stocking tools, audio, and desk companions that pair engineering integrity with quiet industrial design.",
      banner: UNSPLASH("1498049794561-7780e7231661", 1600),
      logo: UNSPLASH("1518770660439-4636190af475", 320),
    },
  },
  {
    email: "demo-vendor-fieldwork@nextcart.local",
    full_name: "Fieldwork Press",
    store: {
      name: "Fieldwork Press",
      slug: "fieldwork-press",
      description:
        "Books, beauty, and outdoor rituals for a slower kind of day. Small-batch releases from independent presses, studios, and field brands.",
      banner: UNSPLASH("1481627834876-b7833e8f5570", 1600),
      logo: UNSPLASH("1512820790803-83ca734da794", 320),
    },
  },
];

const PRODUCTS = [
  // ============ ELECTRONICS / CIRCUIT BUREAU ============
  {
    storeSlug: "circuit-bureau",
    categorySlug: "electronics",
    name: "Field camera Mark II",
    description:
      "A compact mirrorless field camera with a magnesium body, full-frame sensor, and deliberate mechanical controls for tactile shooting.",
    short_description: "Full-frame mirrorless with tactile mechanical controls.",
    price: 1899.0,
    compare_at_price: 2150.0,
    stock_quantity: 18,
    is_featured: true,
    tags: ["camera", "photography", "professional"],
    images: [UNSPLASH("1516035069371-29a1b244cc32"), UNSPLASH("1502920917128-1aa500764cbd")],
  },
  {
    storeSlug: "circuit-bureau",
    categorySlug: "electronics",
    name: "Desk companion monitor",
    description:
      "A 27-inch 4K desk monitor with a brushed aluminium stand, factory-calibrated colour, and a single-cable USB-C workflow.",
    short_description: "27\" 4K USB-C monitor with calibrated colour.",
    price: 749.0,
    stock_quantity: 32,
    is_featured: true,
    tags: ["desk", "monitor", "workspace"],
    images: [UNSPLASH("1527443224154-c4a3942d3acf"), UNSPLASH("1593642632559-0c6d3fc62b89")],
  },
  {
    storeSlug: "circuit-bureau",
    categorySlug: "electronics",
    name: "Retro mechanical keyboard",
    description:
      "A low-profile mechanical keyboard with lubed tactile switches, PBT dye-sub keycaps, and a machined aluminium case.",
    short_description: "Low-profile mechanical keyboard with lubed tactile switches.",
    price: 229.0,
    compare_at_price: 279.0,
    stock_quantity: 54,
    is_featured: false,
    tags: ["keyboard", "mechanical", "desk"],
    images: [UNSPLASH("1587829741301-dc798b83add3"), UNSPLASH("1541140532154-b024d705b90a")],
  },

  // ============ SMARTPHONES ============
  {
    storeSlug: "circuit-bureau",
    categorySlug: "smartphones",
    name: "Horizon 5G handset",
    description:
      "A titanium-framed flagship with a ceramic back, triple-lens imaging system, and an always-on OLED display tuned for low-light reading.",
    short_description: "Titanium flagship with triple-lens imaging.",
    price: 1099.0,
    stock_quantity: 64,
    is_featured: true,
    tags: ["smartphone", "5g", "flagship"],
    images: [UNSPLASH("1592750475338-74b7b21085ab"), UNSPLASH("1598327105666-5b89351aff97")],
  },
  {
    storeSlug: "circuit-bureau",
    categorySlug: "smartphones",
    name: "Compact Pro",
    description:
      "A one-handed flagship focused on pocket ergonomics without compromising on silicon or image quality.",
    short_description: "One-handed flagship with flagship silicon.",
    price: 799.0,
    compare_at_price: 899.0,
    stock_quantity: 48,
    is_featured: false,
    tags: ["smartphone", "compact"],
    images: [UNSPLASH("1511707171634-5f897ff02aa9"), UNSPLASH("1512499617640-c74ae3a79d37")],
  },
  {
    storeSlug: "circuit-bureau",
    categorySlug: "accessories",
    name: "Leather phone sleeve",
    description:
      "Full-grain vegetable-tanned leather sleeve that patinas with use, hand-stitched in a small Portuguese atelier.",
    short_description: "Full-grain leather sleeve, hand-stitched in Portugal.",
    price: 89.0,
    stock_quantity: 120,
    is_featured: false,
    tags: ["leather", "phone", "accessory"],
    images: [UNSPLASH("1585386959984-a4155224a1ad"), UNSPLASH("1606107557195-0e29a4b5b4aa")],
  },

  // ============ LAPTOPS ============
  {
    storeSlug: "circuit-bureau",
    categorySlug: "laptops",
    name: "Studio 14 ultrabook",
    description:
      "A 14-inch aluminium ultrabook with a mini-LED display, silent passive cooling under load, and a machined precision trackpad.",
    short_description: "14\" aluminium ultrabook with mini-LED display.",
    price: 1699.0,
    compare_at_price: 1899.0,
    stock_quantity: 22,
    is_featured: true,
    tags: ["laptop", "ultrabook", "workstation"],
    images: [UNSPLASH("1496181133206-80ce9b88a853"), UNSPLASH("1517336714731-489689fd1ca8")],
  },
  {
    storeSlug: "circuit-bureau",
    categorySlug: "laptops",
    name: "Atelier 16 workstation",
    description:
      "A 16-inch creative workstation with discrete GPU, 32GB memory, and a colour-calibrated glass display.",
    short_description: "16\" creative workstation with discrete GPU.",
    price: 2499.0,
    stock_quantity: 14,
    is_featured: false,
    tags: ["laptop", "workstation", "creative"],
    images: [UNSPLASH("1541807084-5c52b6b3adef"), UNSPLASH("1531297484001-80022131f5a1")],
  },

  // ============ AUDIO ============
  {
    storeSlug: "circuit-bureau",
    categorySlug: "audio",
    name: "Studio over-ear headphones",
    description:
      "Planar-magnetic over-ear headphones with a genuine leather headband, lambskin earpads, and a balanced cable.",
    short_description: "Planar-magnetic over-ear studio headphones.",
    price: 449.0,
    compare_at_price: 549.0,
    stock_quantity: 40,
    is_featured: true,
    tags: ["headphones", "audio", "studio"],
    images: [UNSPLASH("1505740420928-5e560c06d30e"), UNSPLASH("1484704849700-f032a568e944")],
  },
  {
    storeSlug: "circuit-bureau",
    categorySlug: "audio",
    name: "Daily drivers earbuds",
    description:
      "Everyday wireless earbuds with adaptive transparency, a brushed ceramic case, and 30-hour usable battery life.",
    short_description: "Wireless earbuds with adaptive transparency.",
    price: 229.0,
    stock_quantity: 95,
    is_featured: false,
    tags: ["earbuds", "wireless", "daily"],
    images: [UNSPLASH("1590658268037-6bf12165a8df"), UNSPLASH("1606400082777-ef05f3c5cde2")],
  },
  {
    storeSlug: "circuit-bureau",
    categorySlug: "audio",
    name: "Shelf speaker pair",
    description:
      "Hand-built bookshelf speakers with a walnut veneer cabinet and soft-dome tweeters voiced for acoustic material.",
    short_description: "Walnut-veneered bookshelf speakers.",
    price: 899.0,
    stock_quantity: 24,
    is_featured: true,
    tags: ["speakers", "audio", "home"],
    images: [UNSPLASH("1545454675-3531b543be5d"), UNSPLASH("1558756520-22cfe5d382ca")],
  },

  // ============ HOME & LIVING / NORTHWARD ============
  {
    storeSlug: "northward-goods",
    categorySlug: "home-living",
    name: "Linen throw blanket",
    description:
      "A stonewashed Belgian linen throw with hand-tied tassels. Soft on first use, softer every wash. Ideal for quiet afternoons.",
    short_description: "Stonewashed Belgian linen throw with hand-tied tassels.",
    price: 148.0,
    compare_at_price: 180.0,
    stock_quantity: 60,
    is_featured: true,
    tags: ["home", "linen", "textiles"],
    images: [UNSPLASH("1555041469-a586c61ea9bc"), UNSPLASH("1560185127-6ed189bf02f4")],
  },
  {
    storeSlug: "northward-goods",
    categorySlug: "home-living",
    name: "Stoneware dinner set",
    description:
      "A six-piece stoneware dinner set in a warm off-white glaze. Fired in small batches at a family-run Portuguese kiln.",
    short_description: "Six-piece stoneware dinner set, small-batch fired.",
    price: 189.0,
    stock_quantity: 32,
    is_featured: true,
    tags: ["home", "ceramics", "tableware"],
    images: [UNSPLASH("1610701596007-11502861dcfa"), UNSPLASH("1578749556568-bc2c40e68b61")],
  },
  {
    storeSlug: "northward-goods",
    categorySlug: "home-living",
    name: "Cedar wick candle",
    description:
      "A slow-burn soy candle with notes of cedar, vetiver, and smoked fig in a reusable matte-black vessel.",
    short_description: "Slow-burn soy candle with cedar and vetiver.",
    price: 58.0,
    stock_quantity: 140,
    is_featured: false,
    tags: ["candle", "home", "fragrance"],
    images: [UNSPLASH("1603006905003-be475563bc59"), UNSPLASH("1572726729207-a78d6feb18d7")],
  },
  {
    storeSlug: "northward-goods",
    categorySlug: "home-living",
    name: "Hand-thrown stoneware vase",
    description:
      "A tall hand-thrown vase with a crawl glaze finish. Each piece is slightly unique by the nature of the process.",
    short_description: "Tall hand-thrown vase with crawl glaze finish.",
    price: 128.0,
    stock_quantity: 26,
    is_featured: false,
    tags: ["ceramics", "home", "decor"],
    images: [UNSPLASH("1578500351865-d6c3706f46bc"), UNSPLASH("1582643381395-0cedd8d5ae6e")],
  },

  // ============ FASHION / NORTHWARD ============
  {
    storeSlug: "northward-goods",
    categorySlug: "fashion",
    name: "Merino wool overshirt",
    description:
      "A mid-weight merino overshirt cut for layering. Natural fibres, natural stretch, and a quiet charcoal colourway.",
    short_description: "Mid-weight merino overshirt for layering.",
    price: 265.0,
    compare_at_price: 320.0,
    stock_quantity: 48,
    is_featured: true,
    tags: ["fashion", "merino", "outerwear"],
    images: [UNSPLASH("1591047139829-d91aecb6caea"), UNSPLASH("1593030761757-71fae45fa0e7")],
  },
  {
    storeSlug: "northward-goods",
    categorySlug: "men",
    name: "Japanese selvedge jeans",
    description:
      "14oz Japanese selvedge denim cut in a slim-straight silhouette, sanforized for a stable first wash.",
    short_description: "14oz Japanese selvedge denim, slim-straight cut.",
    price: 225.0,
    stock_quantity: 38,
    is_featured: false,
    tags: ["fashion", "denim", "japanese"],
    images: [UNSPLASH("1542272604-787c3835535d"), UNSPLASH("1582552938357-32b906df40cb")],
  },
  {
    storeSlug: "northward-goods",
    categorySlug: "men",
    name: "Heavyweight box tee",
    description:
      "A garment-dyed 10oz cotton tee with a boxy silhouette. Built to keep its shape wash after wash.",
    short_description: "Garment-dyed 10oz cotton box tee.",
    price: 68.0,
    stock_quantity: 180,
    is_featured: false,
    tags: ["fashion", "basics", "cotton"],
    images: [UNSPLASH("1521572163474-6864f9cf17ab"), UNSPLASH("1583743814966-8936f5b7be1a")],
  },
  {
    storeSlug: "northward-goods",
    categorySlug: "women",
    name: "Relaxed silk shirt",
    description:
      "A relaxed-cut silk shirt in a soft ivory tone, with mother-of-pearl buttons and French seams throughout.",
    short_description: "Relaxed silk shirt with mother-of-pearl buttons.",
    price: 198.0,
    compare_at_price: 245.0,
    stock_quantity: 42,
    is_featured: true,
    tags: ["fashion", "silk", "women"],
    images: [UNSPLASH("1551232864-3f0890e580d9"), UNSPLASH("1515886657613-9f3515b0c78f")],
  },
  {
    storeSlug: "northward-goods",
    categorySlug: "women",
    name: "Wool midi skirt",
    description:
      "A wool-blend midi skirt in a warm camel colourway, fully lined, with a concealed side zip.",
    short_description: "Wool-blend camel midi skirt, fully lined.",
    price: 165.0,
    stock_quantity: 36,
    is_featured: false,
    tags: ["fashion", "wool", "women"],
    images: [UNSPLASH("1583496661160-fb5886a0aaaa"), UNSPLASH("1475180098004-ca77a66827be")],
  },
  {
    storeSlug: "northward-goods",
    categorySlug: "accessories",
    name: "Leather weekend bag",
    description:
      "A full-grain leather weekend bag with solid brass hardware and a removable canvas shoe compartment.",
    short_description: "Full-grain leather weekend bag with brass hardware.",
    price: 485.0,
    stock_quantity: 18,
    is_featured: true,
    tags: ["leather", "travel", "bag"],
    images: [UNSPLASH("1553062407-98eeb64c6a62"), UNSPLASH("1590874103328-eac38a683ce7")],
  },
  {
    storeSlug: "northward-goods",
    categorySlug: "accessories",
    name: "Horween leather wallet",
    description:
      "A bifold wallet in Horween Chromexcel leather that develops a deep patina over years of daily carry.",
    short_description: "Horween Chromexcel bifold wallet.",
    price: 118.0,
    compare_at_price: 148.0,
    stock_quantity: 85,
    is_featured: false,
    tags: ["leather", "wallet", "everyday"],
    images: [UNSPLASH("1627123424574-724758594e93"), UNSPLASH("1553062407-98eeb64c6a62")],
  },

  // ============ BOOKS & MEDIA / FIELDWORK ============
  {
    storeSlug: "fieldwork-press",
    categorySlug: "books-media",
    name: "Fieldwork journal — Volume III",
    description:
      "An annual hardback journal on design, landscape, and quiet craft, printed on uncoated FSC-certified stock.",
    short_description: "Annual hardback design & landscape journal.",
    price: 42.0,
    stock_quantity: 220,
    is_featured: true,
    tags: ["books", "journal", "design"],
    images: [UNSPLASH("1544947950-fa07a98d237f"), UNSPLASH("1476275466078-4007374efbbe")],
  },
  {
    storeSlug: "fieldwork-press",
    categorySlug: "books-media",
    name: "Slow living paperback set",
    description:
      "A three-volume paperback set on rituals, rest, and attention. Slipcased, printed in a soft matte finish.",
    short_description: "Three-volume slipcased paperback set.",
    price: 58.0,
    compare_at_price: 72.0,
    stock_quantity: 95,
    is_featured: false,
    tags: ["books", "lifestyle"],
    images: [UNSPLASH("1495446815901-a7297e633e8d"), UNSPLASH("1512820790803-83ca734da794")],
  },
  {
    storeSlug: "fieldwork-press",
    categorySlug: "books-media",
    name: "Vinyl LP — Evening Sessions",
    description:
      "A 180-gram vinyl pressing of an acoustic studio session, limited to 500 copies with a foil-stamped sleeve.",
    short_description: "180g vinyl, limited pressing of 500.",
    price: 36.0,
    stock_quantity: 132,
    is_featured: false,
    tags: ["music", "vinyl", "limited"],
    images: [UNSPLASH("1539375665275-f9de415ef9ac"), UNSPLASH("1603048588665-791ca8aea617")],
  },

  // ============ BEAUTY & HEALTH / FIELDWORK ============
  {
    storeSlug: "fieldwork-press",
    categorySlug: "beauty-health",
    name: "Ritual face serum",
    description:
      "A lightweight hydrating face serum with marine extracts and niacinamide. Packaged in an amber apothecary bottle.",
    short_description: "Lightweight hydrating serum with niacinamide.",
    price: 68.0,
    compare_at_price: 84.0,
    stock_quantity: 160,
    is_featured: true,
    tags: ["beauty", "skincare", "serum"],
    images: [UNSPLASH("1608248543803-ba4f8c70ae0b"), UNSPLASH("1556228578-0d85b1a4d571")],
  },
  {
    storeSlug: "fieldwork-press",
    categorySlug: "beauty-health",
    name: "Clay cleansing bar",
    description:
      "A handmade French green clay soap bar for face and body, scented lightly with bergamot and rosemary.",
    short_description: "French green clay cleansing bar.",
    price: 24.0,
    stock_quantity: 280,
    is_featured: false,
    tags: ["beauty", "soap", "handmade"],
    images: [UNSPLASH("1599305445671-ac291c95aaa9"), UNSPLASH("1556228720-195a672e8a03")],
  },
  {
    storeSlug: "fieldwork-press",
    categorySlug: "beauty-health",
    name: "Bath soak ritual set",
    description:
      "A gift set of three mineral bath soaks built around a slow evening wind-down. Re-sealable paper tubes.",
    short_description: "Three-piece mineral bath soak set.",
    price: 58.0,
    stock_quantity: 115,
    is_featured: false,
    tags: ["beauty", "bath", "gift"],
    images: [UNSPLASH("1570172619644-dfd03ed5d881"), UNSPLASH("1507652313519-d4e9174996dd")],
  },

  // ============ SPORTS & OUTDOORS / FIELDWORK ============
  {
    storeSlug: "fieldwork-press",
    categorySlug: "sports-outdoors",
    name: "Long-run trainers",
    description:
      "Stability-focused long-run trainers with a recycled mesh upper and a high-rebound nitrogen-infused midsole.",
    short_description: "Stability long-run trainers, recycled mesh upper.",
    price: 175.0,
    compare_at_price: 210.0,
    stock_quantity: 85,
    is_featured: true,
    tags: ["sports", "running", "shoes"],
    images: [UNSPLASH("1542291026-7eec264c27ff"), UNSPLASH("1595950653106-6c9ebd614d3a")],
  },
  {
    storeSlug: "fieldwork-press",
    categorySlug: "sports-outdoors",
    name: "Studio yoga mat",
    description:
      "A natural rubber yoga mat with a polyurethane top layer for grip, backed by a quietly aligned studio in Lisbon.",
    short_description: "Natural rubber studio yoga mat with PU top.",
    price: 118.0,
    stock_quantity: 70,
    is_featured: false,
    tags: ["yoga", "studio", "sports"],
    images: [UNSPLASH("1544367567-0f2fcb009e0b"), UNSPLASH("1518611012118-696072aa579a")],
  },
  {
    storeSlug: "fieldwork-press",
    categorySlug: "sports-outdoors",
    name: "Insulated trail flask",
    description:
      "A double-wall stainless steel trail flask with a matte powder coat finish. Keeps hot drinks hot for twelve hours.",
    short_description: "Double-wall insulated trail flask.",
    price: 48.0,
    stock_quantity: 240,
    is_featured: false,
    tags: ["outdoors", "hydration", "trail"],
    images: [UNSPLASH("1602143407151-7111542de6e8"), UNSPLASH("1625772299848-391b6a87d7b3")],
  },

  // ============ MORE ACCESSORIES ============
  {
    storeSlug: "northward-goods",
    categorySlug: "accessories",
    name: "Field watch — 38mm",
    description:
      "A 38mm mechanical field watch with a matte stainless case, vegetable-tanned leather strap, and a hand-wound Swiss movement.",
    short_description: "38mm mechanical field watch, Swiss-wound.",
    price: 845.0,
    compare_at_price: 995.0,
    stock_quantity: 26,
    is_featured: true,
    tags: ["watch", "mechanical", "accessory"],
    images: [UNSPLASH("1523275335684-37898b6baf30"), UNSPLASH("1524592094714-0f0654e20314")],
  },
  {
    storeSlug: "northward-goods",
    categorySlug: "accessories",
    name: "Acetate sunglasses",
    description:
      "Italian acetate sunglasses in an everyday silhouette, with CR-39 polarised lenses and nine-barrel hinges.",
    short_description: "Italian acetate polarised sunglasses.",
    price: 215.0,
    stock_quantity: 110,
    is_featured: false,
    tags: ["eyewear", "sunglasses", "accessory"],
    images: [UNSPLASH("1572635196237-14b3f281503f"), UNSPLASH("1511499767150-a48a237f0083")],
  },

  // ============ FASHION BOOST (unisex curation) ============
  {
    storeSlug: "northward-goods",
    categorySlug: "fashion",
    name: "Cashmere crew knit",
    description:
      "A mid-gauge cashmere crew knit spun from Mongolian fibre, with reinforced ribbing at the hem and cuffs.",
    short_description: "Mid-gauge Mongolian cashmere crew knit.",
    price: 325.0,
    compare_at_price: 395.0,
    stock_quantity: 44,
    is_featured: true,
    tags: ["fashion", "cashmere", "knitwear"],
    images: [UNSPLASH("1578587018452-892bacefd3f2"), UNSPLASH("1576566588028-4147f3842f27")],
  },
  {
    storeSlug: "northward-goods",
    categorySlug: "fashion",
    name: "Waxed canvas field jacket",
    description:
      "A waxed cotton field jacket with a corduroy collar, bellows pockets, and a tartan flannel lining.",
    short_description: "Waxed cotton field jacket, flannel-lined.",
    price: 345.0,
    stock_quantity: 32,
    is_featured: false,
    tags: ["fashion", "outerwear", "waxed"],
    images: [UNSPLASH("1591047139829-d91aecb6caea"), UNSPLASH("1543163521-1bf539c55dd2")],
  },
  {
    storeSlug: "northward-goods",
    categorySlug: "fashion",
    name: "Pleated trousers",
    description:
      "Double-pleated trousers in a mid-weight Italian wool blend, tailored for a relaxed seated silhouette.",
    short_description: "Double-pleated Italian wool trousers.",
    price: 245.0,
    stock_quantity: 56,
    is_featured: false,
    tags: ["fashion", "trousers", "wool"],
    images: [UNSPLASH("1473966968600-fa801b869a1a"), UNSPLASH("1594633312681-425c7b97ccd1")],
  },

  // ============ ADDITIONAL HOME & LIVING ============
  {
    storeSlug: "northward-goods",
    categorySlug: "home-living",
    name: "Cast iron pour-over kettle",
    description:
      "A cast iron pour-over kettle with an enamel interior and a gooseneck spout calibrated for slow, steady pours.",
    short_description: "Cast iron gooseneck pour-over kettle.",
    price: 148.0,
    stock_quantity: 60,
    is_featured: false,
    tags: ["home", "kitchen", "coffee"],
    images: [UNSPLASH("1495474472287-4d71bcdd2085"), UNSPLASH("1509042239860-f550ce710b93")],
  },
  {
    storeSlug: "northward-goods",
    categorySlug: "home-living",
    name: "Wool area rug",
    description:
      "A hand-loomed flat-weave wool rug in a soft oat tone, edged with hand-tied tassels.",
    short_description: "Hand-loomed flat-weave wool rug.",
    price: 448.0,
    compare_at_price: 550.0,
    stock_quantity: 18,
    is_featured: true,
    tags: ["home", "rug", "wool"],
    images: [UNSPLASH("1506439773649-6e0eb8cfb237"), UNSPLASH("1540638349517-3abd5afc9847")],
  },

  // ============ ADDITIONAL ELECTRONICS ============
  {
    storeSlug: "circuit-bureau",
    categorySlug: "electronics",
    name: "Portable film scanner",
    description:
      "A compact 35mm film scanner with a colour-accurate LED array and a machined aluminium film carrier.",
    short_description: "Compact 35mm film scanner with LED array.",
    price: 489.0,
    stock_quantity: 28,
    is_featured: false,
    tags: ["electronics", "film", "scanner"],
    images: [UNSPLASH("1461360228754-6e81c478b882"), UNSPLASH("1452587925148-ce544e77e70d")],
  },
  {
    storeSlug: "circuit-bureau",
    categorySlug: "electronics",
    name: "Modular desk lamp",
    description:
      "A CNC-machined desk lamp with a full spectrum of warm-to-cool light, controlled via a capacitive brass dial.",
    short_description: "Machined desk lamp with capacitive brass dial.",
    price: 289.0,
    stock_quantity: 44,
    is_featured: true,
    tags: ["desk", "lamp", "lighting"],
    images: [UNSPLASH("1513506003901-1e6a229e2d15"), UNSPLASH("1507473885765-e6ed057f782c")],
  },

  // ============ ADDITIONAL BOOKS ============
  {
    storeSlug: "fieldwork-press",
    categorySlug: "books-media",
    name: "Architecture quarterly",
    description:
      "A quarterly publication on residential architecture and quietly experimental material choices.",
    short_description: "Quarterly on residential architecture.",
    price: 32.0,
    stock_quantity: 180,
    is_featured: false,
    tags: ["books", "architecture", "quarterly"],
    images: [UNSPLASH("1524578271613-d550eacf6090"), UNSPLASH("1519682337058-a94d519337bc")],
  },

  // ============ ADDITIONAL BEAUTY ============
  {
    storeSlug: "fieldwork-press",
    categorySlug: "beauty-health",
    name: "Botanical hand wash",
    description:
      "A refillable glass-pump hand wash with a botanical base of thyme, lemon balm, and vetiver.",
    short_description: "Refillable botanical hand wash.",
    price: 38.0,
    stock_quantity: 200,
    is_featured: false,
    tags: ["beauty", "handwash", "botanical"],
    images: [UNSPLASH("1556228720-195a672e8a03"), UNSPLASH("1556228453-efd6c1ff04f6")],
  },

  // ============ ADDITIONAL SPORTS ============
  {
    storeSlug: "fieldwork-press",
    categorySlug: "sports-outdoors",
    name: "Technical windshell",
    description:
      "A packable three-layer windshell with laser-cut ventilation and a water-resistant DWR coating.",
    short_description: "Packable three-layer technical windshell.",
    price: 215.0,
    compare_at_price: 260.0,
    stock_quantity: 60,
    is_featured: false,
    tags: ["outdoors", "jacket", "technical"],
    images: [UNSPLASH("1515886657613-9f3515b0c78f"), UNSPLASH("1520975916090-3105956dac38")],
  },

  // ============ ADDITIONAL AUDIO ============
  {
    storeSlug: "circuit-bureau",
    categorySlug: "audio",
    name: "Portable DAC amplifier",
    description:
      "A pocket-sized DAC amplifier with a balanced output, aluminium chassis, and USB-C power delivery.",
    short_description: "Pocket DAC amp with balanced output.",
    price: 329.0,
    stock_quantity: 48,
    is_featured: false,
    tags: ["audio", "dac", "amp"],
    images: [UNSPLASH("1545454675-3531b543be5d"), UNSPLASH("1588667301073-a2df50a3c8d9")],
  },

  // ============ ADDITIONAL WOMENSWEAR ============
  {
    storeSlug: "northward-goods",
    categorySlug: "women",
    name: "Cropped wool coat",
    description:
      "A cropped double-breasted wool coat with horn buttons and a fully silk-lined interior.",
    short_description: "Cropped double-breasted wool coat.",
    price: 485.0,
    compare_at_price: 595.0,
    stock_quantity: 28,
    is_featured: true,
    tags: ["fashion", "coat", "women"],
    images: [UNSPLASH("1591369822096-ffd140ec948f"), UNSPLASH("1548036328-c9fa89d128fa")],
  },
  {
    storeSlug: "northward-goods",
    categorySlug: "women",
    name: "Silk camisole",
    description:
      "A bias-cut silk camisole with adjustable straps and a soft champagne finish.",
    short_description: "Bias-cut silk camisole with adjustable straps.",
    price: 138.0,
    stock_quantity: 90,
    is_featured: false,
    tags: ["fashion", "silk", "women"],
    images: [UNSPLASH("1595777457583-95e059d581b8"), UNSPLASH("1551232864-3f0890e580d9")],
  },

  // ============ ADDITIONAL MENSWEAR ============
  {
    storeSlug: "northward-goods",
    categorySlug: "men",
    name: "Oxford cloth shirt",
    description:
      "A classic oxford shirt in unwashed cotton, with a soft button-down collar and single-needle stitching.",
    short_description: "Unwashed oxford cloth button-down shirt.",
    price: 125.0,
    stock_quantity: 140,
    is_featured: false,
    tags: ["fashion", "shirt", "men"],
    images: [UNSPLASH("1596755094514-f87e34085b2c"), UNSPLASH("1603252109303-2751441dd157")],
  },
  {
    storeSlug: "northward-goods",
    categorySlug: "men",
    name: "Wool crewneck sweater",
    description:
      "A mid-weight lambswool crewneck knit in Scotland, with reinforced saddle shoulders.",
    short_description: "Scottish lambswool crewneck sweater.",
    price: 195.0,
    compare_at_price: 230.0,
    stock_quantity: 62,
    is_featured: true,
    tags: ["fashion", "knitwear", "men"],
    images: [UNSPLASH("1620799140408-edc6dcb6d633"), UNSPLASH("1574180045827-681f8a1a9622")],
  },
];

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureVendor(vendor) {
  const { data: existing } = await sb
    .from("profiles")
    .select("id, email, role")
    .eq("email", vendor.email)
    .maybeSingle();

  if (existing) {
    if (existing.role !== "vendor") {
      await sb.from("profiles").update({ role: "vendor" }).eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: created, error } = await sb.auth.admin.createUser({
    email: vendor.email,
    password: crypto.randomUUID() + "Aa1!",
    email_confirm: true,
    user_metadata: {
      full_name: vendor.full_name,
      role: "vendor",
    },
  });

  if (error) {
    throw new Error(`Failed to create auth user for ${vendor.email}: ${error.message}`);
  }

  await sb.from("profiles").update({ role: "vendor", full_name: vendor.full_name }).eq("id", created.user.id);

  return created.user.id;
}

async function ensureStore(ownerId, storeInput) {
  const { data: existing } = await sb
    .from("stores")
    .select("id, slug")
    .eq("slug", storeInput.slug)
    .maybeSingle();

  if (existing) {
    await sb
      .from("stores")
      .update({
        name: storeInput.name,
        description: storeInput.description,
        logo_url: storeInput.logo,
        banner_url: storeInput.banner,
        status: "approved",
        owner_id: ownerId,
      })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data: created, error } = await sb
    .from("stores")
    .insert({
      owner_id: ownerId,
      name: storeInput.name,
      slug: storeInput.slug,
      description: storeInput.description,
      logo_url: storeInput.logo,
      banner_url: storeInput.banner,
      status: "approved",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create store ${storeInput.slug}: ${error.message}`);
  }

  return created.id;
}

async function upsertProduct({ storeId, categoryId, product }) {
  const slug = slugify(product.name);
  const { data: existing } = await sb
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .eq("slug", slug)
    .maybeSingle();

  const payload = {
    store_id: storeId,
    category_id: categoryId,
    name: product.name,
    slug,
    description: product.description,
    short_description: product.short_description,
    price: product.price,
    compare_at_price: product.compare_at_price ?? null,
    stock_quantity: product.stock_quantity,
    track_inventory: true,
    status: "active",
    images: product.images,
    tags: product.tags,
    is_featured: product.is_featured,
  };

  if (existing) {
    const { error } = await sb.from("products").update(payload).eq("id", existing.id);
    if (error) throw new Error(`Update failed for ${slug}: ${error.message}`);
    return { id: existing.id, action: "updated" };
  }

  const { data: created, error } = await sb.from("products").insert(payload).select("id").single();
  if (error) throw new Error(`Insert failed for ${slug}: ${error.message}`);
  return { id: created.id, action: "inserted" };
}

async function clearSeed() {
  console.log("Clearing seeded demo catalog...");
  const vendorEmails = VENDORS.map((v) => v.email);

  const { data: profiles } = await sb.from("profiles").select("id").in("email", vendorEmails);
  const ownerIds = (profiles ?? []).map((p) => p.id);

  if (ownerIds.length > 0) {
    const { data: stores } = await sb.from("stores").select("id").in("owner_id", ownerIds);
    const storeIds = (stores ?? []).map((s) => s.id);

    if (storeIds.length > 0) {
      const { error: productError } = await sb.from("products").delete().in("store_id", storeIds);
      if (productError) console.warn("Product cleanup warning:", productError.message);
      const { error: storeError } = await sb.from("stores").delete().in("id", storeIds);
      if (storeError) console.warn("Store cleanup warning:", storeError.message);
    }

    for (const id of ownerIds) {
      const { error } = await sb.auth.admin.deleteUser(id);
      if (error) console.warn(`Auth user cleanup warning for ${id}:`, error.message);
    }
  }
  console.log("Clear complete.");
}

async function seed() {
  if (CLEAR_MODE) {
    await clearSeed();
    return;
  }

  const { data: categoryRows, error: categoryError } = await sb.from("categories").select("id, slug");
  if (categoryError) throw categoryError;
  const categoriesBySlug = new Map((categoryRows ?? []).map((c) => [c.slug, c.id]));

  let categoryImageUpdates = 0;
  for (const [slug, imageUrl] of Object.entries(CATEGORY_IMAGES)) {
    if (!categoriesBySlug.has(slug)) continue;
    const { error } = await sb.from("categories").update({ image_url: imageUrl }).eq("slug", slug);
    if (error) {
      console.warn(`  ⚠ category image update failed for ${slug}: ${error.message}`);
      continue;
    }
    categoryImageUpdates += 1;
  }
  console.log(`✓ updated ${categoryImageUpdates} category images`);

  const storesBySlug = new Map();
  for (const vendor of VENDORS) {
    const ownerId = await ensureVendor(vendor);
    const storeId = await ensureStore(ownerId, vendor.store);
    storesBySlug.set(vendor.store.slug, storeId);
    console.log(`✓ vendor ${vendor.email} → store ${vendor.store.slug}`);
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const product of PRODUCTS) {
    const storeId = storesBySlug.get(product.storeSlug);
    const categoryId = categoriesBySlug.get(product.categorySlug);

    if (!storeId || !categoryId) {
      console.warn(`  ⚠ skipping ${product.name} — missing store or category`);
      skipped += 1;
      continue;
    }

    const result = await upsertProduct({ storeId, categoryId, product });
    if (result.action === "inserted") inserted += 1;
    else updated += 1;
  }

  console.log(`\nCatalog seed complete: ${inserted} inserted, ${updated} updated, ${skipped} skipped.`);
}

seed().catch((error) => {
  console.error("\nSeed failed:", error);
  process.exit(1);
});
