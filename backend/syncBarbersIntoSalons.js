const dns = require('dns');
dns.setServers(['8.8.8.8']);
const mongoose = require('mongoose');
const Salon = require('./models/Salon');
const Barber = require('./models/Barber');
const { toEmbeddedBarber } = require('./utils/salonBarberSync');

async function sync() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const barbers = await Barber.find();
  let updated = 0;

  for (const barber of barbers) {
    const salon = await Salon.findById(barber.salonId);
    if (!salon) continue;

    const embedded = toEmbeddedBarber(barber);
    const index = salon.barbers.findIndex((item) => String(item._id) === String(barber._id));
    if (index >= 0) salon.barbers[index] = embedded;
    else salon.barbers.push(embedded);
    await salon.save();
    updated += 1;
  }

  console.log(`Synced ${updated} barber records into salons.`);
  await mongoose.disconnect();
}

sync().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});