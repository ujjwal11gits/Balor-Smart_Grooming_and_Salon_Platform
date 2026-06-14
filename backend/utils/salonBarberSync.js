function toEmbeddedBarber(barber) {
  if (!barber) return null;

  return {
    _id: barber._id,
    name: barber.name,
    userId: barber.userId,
    salonId: barber.salonId,
    specializations: barber.specializations || [],
    rating: barber.rating ?? 0,
    totalReviews: barber.totalReviews ?? 0,
    imageUrl: barber.imageUrl,
    bio: barber.bio,
    workingSlots: barber.workingSlots || [],
    unavailableDates: barber.unavailableDates || [],
    createdAt: barber.createdAt,
    updatedAt: barber.updatedAt,
  };
}

async function upsertSalonBarber(Salon, barber) {
  if (!barber?.salonId) return;
  const salon = await Salon.findById(barber.salonId);
  if (!salon) return;

  const embedded = toEmbeddedBarber(barber);
  const index = salon.barbers.findIndex((item) => String(item._id) === String(barber._id));
  if (index >= 0) salon.barbers[index] = embedded;
  else salon.barbers.push(embedded);
  await salon.save();
}

async function removeSalonBarber(Salon, salonId, barberId) {
  const salon = await Salon.findById(salonId);
  if (!salon) return;

  salon.barbers = salon.barbers.filter((item) => String(item._id) !== String(barberId));
  await salon.save();
}

module.exports = {
  toEmbeddedBarber,
  upsertSalonBarber,
  removeSalonBarber,
};