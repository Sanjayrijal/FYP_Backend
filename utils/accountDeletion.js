const Booking = require("../models/booking");
const Coupon = require("../models/Coupon");
const Futsal = require("../models/Futsal");
const FutsalOwner = require("../models/Futsalowner");
const LoyaltySpin = require("../models/LoyaltySpin");
const Notification = require("../models/Notification");
const Offer = require("../models/Offer");
const User = require("../models/User");

const getDeletedCount = (result) => result?.deletedCount || 0;

const deleteUserAccountData = async (userId) => {
  const bookingDocs = await Booking.find({ user: userId }).select("_id");
  const bookingIds = bookingDocs.map((booking) => booking._id);

  const [notificationsResult, couponsResult, spinsResult, bookingsResult] =
    await Promise.all([
      Notification.deleteMany({ user: userId }),
      Coupon.deleteMany({ user: userId }),
      LoyaltySpin.deleteMany({ user: userId }),
      Booking.deleteMany({ user: userId }),
    ]);

  const userResult = await User.deleteOne({ _id: userId });

  return {
    bookingIds,
    deletedUser: getDeletedCount(userResult),
    deletedBookings: getDeletedCount(bookingsResult),
    deletedNotifications: getDeletedCount(notificationsResult),
    deletedCoupons: getDeletedCount(couponsResult),
    deletedSpins: getDeletedCount(spinsResult),
  };
};

const deleteOwnerAccountData = async (ownerId) => {
  const futsalDocs = await Futsal.find({ owner: ownerId }).select("_id");
  const futsalIds = futsalDocs.map((futsal) => futsal._id);

  const bookingDocs = futsalIds.length
    ? await Booking.find({ futsal: { $in: futsalIds } }).select("_id user")
    : [];
  const bookingIds = bookingDocs.map((booking) => booking._id);

  const ownerUpdateResult = futsalIds.length
    ? await User.updateMany(
        {},
        {
          $pull: {
            favorites: { $in: futsalIds },
            loyalty: { futsal: { $in: futsalIds } },
          },
        },
      )
    : null;

  const [offersResult, couponsResult, spinsResult, notificationsResult, bookingsResult, futsalResult] =
    await Promise.all([
      Offer.deleteMany({ owner: ownerId }),
      Coupon.deleteMany({ futsal: { $in: futsalIds } }),
      LoyaltySpin.deleteMany({ futsal: { $in: futsalIds } }),
      Notification.deleteMany({ bookingId: { $in: bookingIds } }),
      Booking.deleteMany({ futsal: { $in: futsalIds } }),
      Futsal.deleteMany({ owner: ownerId }),
    ]);

  const ownerResult = await FutsalOwner.deleteOne({ _id: ownerId });

  return {
    futsalIds,
    bookingIds,
    deletedOwner: getDeletedCount(ownerResult),
    deletedFutsals: getDeletedCount(futsalResult),
    deletedBookings: getDeletedCount(bookingsResult),
    deletedOffers: getDeletedCount(offersResult),
    deletedNotifications: getDeletedCount(notificationsResult),
    deletedCoupons: getDeletedCount(couponsResult),
    deletedSpins: getDeletedCount(spinsResult),
    updatedUserDocuments: ownerUpdateResult?.modifiedCount || 0,
  };
};

module.exports = {
  deleteOwnerAccountData,
  deleteUserAccountData,
};