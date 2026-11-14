// seed.js - Inserts 16 simple, realistic sample registration documents into MongoDB
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Registration = require('./models/Registration');

const sampleRegistrations = [
  {
    registrationId: 'EM101',
    participantName: 'Raghavendra Ghadi',
    eventName: 'Techfluence Hackathon',
    eventCategory: 'Technical',
    registrationDate: new Date('2026-06-29'),
    email: 'ghadiraghavendra14@gmail.com',
    phone: '9209812645',
    fee: 1500,
    paymentStatus: 'Paid',
  },
  {
    registrationId: 'EM102',
    participantName: 'Aarav Sharma',
    eventName: 'Web Dev Bootcamp',
    eventCategory: 'Workshop',
    registrationDate: new Date('2026-01-20'),
    email: 'aarav.sharma@example.com',
    phone: '9876543210',
    fee: 500,
    paymentStatus: 'Paid',
  },
  {
    registrationId: 'EM103',
    participantName: 'Priya Nair',
    eventName: 'Solo Dance Battle',
    eventCategory: 'Cultural',
    registrationDate: new Date('2026-02-05'),
    email: 'priya.nair@example.com',
    phone: '9765432109',
    fee: 200,
    paymentStatus: 'Paid',
  },
  {
    registrationId: 'EM104',
    participantName: 'Rohan Mehta',
    eventName: 'Cricket League 2026',
    eventCategory: 'Sports',
    registrationDate: new Date('2026-02-12'),
    email: 'rohan.mehta@example.com',
    phone: '9654321098',
    fee: 300,
    paymentStatus: 'Pending',
  },
  {
    registrationId: 'EM105',
    participantName: 'Sneha Verma',
    eventName: 'AI Research Paper',
    eventCategory: 'Academic',
    registrationDate: new Date('2026-02-22'),
    email: 'sneha.verma@example.com',
    phone: '9543210987',
    fee: 150,
    paymentStatus: 'Paid',
  },
  {
    registrationId: 'EM106',
    participantName: 'Kiran Patel',
    eventName: 'Python for Beginners',
    eventCategory: 'Workshop',
    registrationDate: new Date('2026-03-01'),
    email: 'kiran.patel@example.com',
    phone: '9432109876',
    fee: 750,
    paymentStatus: 'Failed',
  },
  {
    registrationId: 'EM107',
    participantName: 'Anjali Singh',
    eventName: 'Cybersecurity Talk',
    eventCategory: 'Seminar',
    registrationDate: new Date('2026-03-10'),
    email: 'anjali.singh@example.com',
    phone: '9321098765',
    fee: 100,
    paymentStatus: 'Paid',
  },
  {
    registrationId: 'EM108',
    participantName: 'Vikram Reddy',
    eventName: 'RoboWars Challenge',
    eventCategory: 'Technical',
    registrationDate: new Date('2026-03-18'),
    email: 'vikram.reddy@example.com',
    phone: '9210987654',
    fee: 800,
    paymentStatus: 'Pending',
  },
  {
    registrationId: 'EM109',
    participantName: 'Meera Joshi',
    eventName: 'Photography Contest',
    eventCategory: 'Cultural',
    registrationDate: new Date('2026-03-25'),
    email: 'meera.joshi@example.com',
    phone: '9109876543',
    fee: 250,
    paymentStatus: 'Paid',
  },
  {
    registrationId: 'EM110',
    participantName: 'Arjun Kapoor',
    eventName: 'Inter-College Chess',
    eventCategory: 'Sports',
    registrationDate: new Date('2026-04-05'),
    email: 'arjun.kapoor@example.com',
    phone: '9098765432',
    fee: 100,
    paymentStatus: 'Pending',
  },
  {
    registrationId: 'EM111',
    participantName: 'Deepika Rao',
    eventName: 'Data Science Bootcamp',
    eventCategory: 'Workshop',
    registrationDate: new Date('2026-04-14'),
    email: 'deepika.rao@example.com',
    phone: '8987654321',
    fee: 1200,
    paymentStatus: 'Paid',
  },
  {
    registrationId: 'EM112',
    participantName: 'Pooja Iyer',
    eventName: 'National Debate 2026',
    eventCategory: 'Academic',
    registrationDate: new Date('2026-04-20'),
    email: 'pooja.iyer@example.com',
    phone: '8765432109',
    fee: 50,
    paymentStatus: 'Paid',
  },
  {
    registrationId: 'EM113',
    participantName: 'Rahul Gupta',
    eventName: 'Open Source Summit',
    eventCategory: 'Seminar',
    registrationDate: new Date('2026-05-02'),
    email: 'rahul.gupta@example.com',
    phone: '8654321098',
    fee: 0,
    paymentStatus: 'Paid',
  },
  {
    registrationId: 'EM114',
    participantName: 'Nisha Choudhary',
    eventName: 'Badminton Championship',
    eventCategory: 'Sports',
    registrationDate: new Date('2026-05-15'),
    email: 'nisha.choudhary@example.com',
    phone: '8543210987',
    fee: 200,
    paymentStatus: 'Pending',
  },
  {
    registrationId: 'EM115',
    participantName: 'Amit Tiwari',
    eventName: 'Cloud Computing 101',
    eventCategory: 'Workshop',
    registrationDate: new Date('2026-05-25'),
    email: 'amit.tiwari@example.com',
    phone: '8432109876',
    fee: 950,
    paymentStatus: 'Paid',
  },
  {
    registrationId: 'EM116',
    participantName: 'Riya Shah',
    eventName: 'Startup Pitch Fest',
    eventCategory: 'Seminar',
    registrationDate: new Date('2026-06-05'),
    email: 'riya.shah@example.com',
    phone: '7987654321',
    fee: 75,
    paymentStatus: 'Paid',
  },
];

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing records before seeding
    await Registration.deleteMany({});
    console.log('Existing registrations cleared.');

    // Insert all sample documents
    const inserted = await Registration.insertMany(sampleRegistrations);
    console.log(`Successfully inserted ${inserted.length} sample registrations.`);

    // Verify count
    const count = await Registration.countDocuments();
    console.log(`Total registrations in database: ${count}`);

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
};

seedDatabase();
