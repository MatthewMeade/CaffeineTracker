import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding...');

    // Clean up existing drinks to prevent duplicates on re-seed
    await prisma.drink.deleteMany({});
    console.log('Deleted existing drinks.');

    const defaultDrinks = [
        { name: 'Espresso', caffeineMg: 63, sizeMl: 30 },
        { name: 'Coffee', caffeineMg: 95, sizeMl: 240 },
        { name: 'Green Tea', caffeineMg: 28, sizeMl: 240 },
        { name: 'Black Tea', caffeineMg: 47, sizeMl: 240 },
        { name: 'Energy Drink', caffeineMg: 80, sizeMl: 250 },
        { name: 'Cola', caffeineMg: 34, sizeMl: 355 },
    ];

    await prisma.drink.createMany({
        data: defaultDrinks,
    });

    console.log(`Seeded ${defaultDrinks.length} default drinks.`);
    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => {
        return prisma.$disconnect();
    }); 