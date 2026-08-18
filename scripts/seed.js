require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const products = [
  {
    name: 'Moringa Powder',
    slug: 'moringa-powder',
    price: 29.99,
    image: 'images/moringa-powder.jpg',
    description: 'Premium organic moringa leaf powder, rich in vitamins and minerals.',
    category: 'powder',
    weight: '200g'
  },
  {
    name: 'Onion Powder',
    slug: 'onion-powder',
    price: 24.99,
    image: 'images/onion-powder.jpg',
    description: 'Pure dehydrated onion powder for cooking and health benefits.',
    category: 'powder',
    weight: '200g'
  },
  {
    name: 'Banana Powder',
    slug: 'banana-powder',
    price: 19.99,
    image: 'images/banana-powder.jpg',
    description: 'Natural banana powder, perfect for smoothies and baking.',
    category: 'powder',
    weight: '200g'
  },
  {
    name: 'Papaya Leaf Powder',
    slug: 'papaya-leaf-powder',
    price: 34.99,
    image: 'images/papaya-leaf-powder.jpg',
    description: 'Organic papaya leaf powder, known for immune system support.',
    category: 'powder',
    weight: '150g'
  }
];

const seedDB = async () => {
  try {
    console.log('⏳ Connecting to MongoDB...');
    try {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
      console.log('✅ Connected to MongoDB (External/Local)');
    } catch (e) {
      console.log('⚠️ Local MongoDB not found. Spinning up in-memory MongoDB for seeding...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log('✅ In-Memory MongoDB connected at', uri);
    }

    await Product.deleteMany({});
    console.log('Cleared existing products');

    const created = await Product.insertMany(products);
    console.log(`Seeded ${created.length} products:`);
    created.forEach(p => console.log(`  - ${p.name} ($${p.price}) [${p.slug}]`));

    await mongoose.connection.close();
    console.log('\nDatabase seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDB();
