import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  {
    name: "Pioneer DJ Mixer",
    price: 699,
  },
  {
    name: "Roland Wave Sampler",
    price: 485,
  },
  {
    name: "Reloop Headphone",
    price: 159,
  },
  {
    name: "Rokit Monitor",
    price: 189.9,
  },
  {
    name: "Fisherprice Baby Mixer",
    price: 120,
  },
];

async function seed() {
  console.log(`Start seeding...`);

  await prisma.product.createMany({ data: products });

  console.log(`Seeding finished.`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
