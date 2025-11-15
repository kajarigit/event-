require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./src/models/Event');

async function checkEvent() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const eventId = '69177f34b942a219b95991fc';
    
    const event = await Event.findById(eventId);
    
    if (event) {
      console.log('📅 Event Found:');
      console.log(`Name: ${event.name}`);
      console.log(`ID: ${event._id}`);
      console.log(`Active: ${event.isActive}`);
      console.log(`Start: ${event.startTime}`);
      console.log(`End: ${event.endTime}`);
      
      if (!event.isActive) {
        console.log('\n⚠️  Event is NOT ACTIVE - This is why QR code returns 403!');
        console.log('\nActivating event...');
        event.isActive = true;
        await event.save();
        console.log('✅ Event activated!');
      } else {
        console.log('\n✅ Event is already active');
      }
    } else {
      console.log('❌ Event not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkEvent();
