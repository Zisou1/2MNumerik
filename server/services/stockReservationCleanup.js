const { Transaction, LotLocation, sequelize } = require('../models');
const { Op } = require('sequelize');

const DEFAULT_TIMEOUT_HOURS = 24;

const cleanupExpiredReservations = async () => {
  const timeoutHours = parseInt(process.env.DRAFT_RESERVATION_TIMEOUT_HOURS, 10) || DEFAULT_TIMEOUT_HOURS;
  const expirationThreshold = new Date(Date.now() - timeoutHours * 60 * 60 * 1000);

  // We start a sequelize transaction
  const t = await sequelize.transaction();

  try {
    // Find all draft OUT/TRANSFER transactions created before the expirationThreshold
    const expiredTransactions = await Transaction.findAll({
      where: {
        status: 'draft',
        type: { [Op.in]: ['OUT', 'TRANSFER'] },
        created_at: { [Op.lt]: expirationThreshold }
      },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (expiredTransactions.length === 0) {
      await t.commit();
      return;
    }

    console.log(`[ReservationCleanup] Found ${expiredTransactions.length} expired draft transactions to cancel.`);

    for (const tx of expiredTransactions) {
      // Release reservation on lot_locations
      const lotLocation = await LotLocation.findOne({
        where: {
          lot_id: tx.lot_id,
          location_id: tx.from_location
        },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (lotLocation) {
        await lotLocation.update({
          reserved_quantity: Math.max(0, lotLocation.reserved_quantity - tx.quantity)
        }, { transaction: t });
      }

      // Mark transaction as cancelled
      await tx.update({
        status: 'cancelled'
      }, { transaction: t });

      console.log(`[ReservationCleanup] Cancelled transaction ID: ${tx.id} and released reservation of ${tx.quantity} units.`);
    }

    await t.commit();
    console.log('[ReservationCleanup] Cleanup run completed successfully.');
  } catch (error) {
    await t.rollback();
    console.error('[ReservationCleanup] Error cleaning up expired reservations:', error);
  }
};

const startReservationCleanupJob = () => {
  // Run on startup
  cleanupExpiredReservations();

  // Then run every hour (3600000 ms)
  setInterval(() => {
    cleanupExpiredReservations();
  }, 60 * 60 * 1000);
};

module.exports = {
  cleanupExpiredReservations,
  startReservationCleanupJob
};
